const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const request = require('request');
const fs = require('fs');
const child_process = require('child_process');
const { Pool, Client } = require('pg');
const config = require('../config/database');

router.get('/raagiNames', (req, res) =>{
    let client = initialize_client();
    client.connect();
    let raagi_names = [];
    client.query("select name from raagi order by name", (err, sqlResponse) => {
        for(let raagi of sqlResponse.rows){
            raagi_names.push(raagi.name);
        }
        res.send(raagi_names);
        client.end();
    });
});

router.get('/recordingURLs', (req, res) =>{
    let client = initialize_client();
    client.connect();
    let recording_urls = [];
    client.query("select url from recording order by url", (err, sqlResponse) => {
        for(let rec_url of sqlResponse.rows){
            recording_urls.push(rec_url.url);
        }
        res.send(recording_urls);
        client.end();
    });
});

router.get('/recentRecordings', (req, res) => {
    let client = initialize_client();
    client.connect();
    let recent_recordings = [];
    client.query("select title from recording order by date_added desc limit 20", (err, sqlResponse) => {
        for(let row of sqlResponse.rows){
            recent_recordings.push(row.title);
        }
        res.send(recent_recordings);
        client.end();
    });
});

router.get('/raagi_info', (req, res) => {
    let client = initialize_client();
    client.connect();
    const query = "select row_number() over(order by raagi.name) as raagi_id, raagi.name as raagi_name, raagi.image_url as raagi_image_url, " +
        "count(rrs.shabad_sathaayi_title) as shabads_count, to_char(sum(rrs.length), 'HH24:MI:SS') as total_length " +
        "from raagi join raagi_recording_shabad as rrs ON raagi.name=rrs.raagi_name group by raagi.name";

    client.query(query, (err, sqlResponse) => {
        let raagis_info = [];
        for(let raagi of sqlResponse.rows){
            let hhmmss = raagi.total_length.split(':');
            let minutes = (parseInt(hhmmss[0]*60)) + (parseInt(hhmmss[1]));

            raagi.raagi_id = parseInt(raagi.raagi_id);
            raagi.shabads_count = parseInt(raagi.shabads_count);
            raagi.minutes_of_shabads = minutes;
            delete raagi.total_length;
            raagis_info.push(raagi);
        }
        res.send(raagis_info);
        client.end();
    });
});

router.get('/shabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = "select shabad.sathaayi_title as shabad_english_title, shabad.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id, shabad_info.checked as shabad_checked " +
        "from shabad join shabad_info on shabad.sathaayi_id = shabad_info.sathaayi_id order by shabad.sathaayi_title";
    client.query(query, (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

// TODO - Test if this can return multiple rows with same sathaayi_id. For example, what if the same sathaayi_id has more than one sathaayi_title?
router.get('/shabads/:sathaayi_id', (req, res) => {
    let client = initialize_client();
    let sathaayi_id = parseInt(req.params.sathaayi_id);
    client.connect();
    const query = {
        text: "select * from shabad join shabad_info on shabad.sathaayi_id = shabad_info.sathaayi_id " +
        "where shabad.sathaayi_id=$1 order by shabad.sathaayi_title",
        values: [sathaayi_id]
    };
    client.query(query, (err, sqlResponse) => {
        if(sqlResponse.rows.length > 0){
            res.send(sqlResponse.rows);
        }else{
            res.json("Shabad not found");
        }

        client.end();
    });
});

router.get('/raagis/:raagi_name/recordings', (req, res) =>{
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select distinct recording_title from raagi_recording_shabad where raagi_name=$1 order by recording_title",
        values: [req.params.raagi_name]
    };
    client.query(query, (err, sqlResponse) => {
        let raagi_recordings = [];
        for(let recording of sqlResponse.rows){
            raagi_recordings.push(recording.recording_title);
        }
        res.send(raagi_recordings);
        client.end();
    });
});

router.get('/raagis/:raagi_name/recordingsInfo', (req, res) =>{
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select distinct rrs.recording_title, recording.url as recording_url, recording.date_added from recording join raagi_recording_shabad as rrs " +
        "on rrs.recording_title=recording.title where raagi_name=$1 order by recording_title;",
        values: [req.params.raagi_name]
    };
    client.query(query, (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

// NOTE: If the length is greater than 59 minutes, then to_char() needs to have HH12:MI:SS
router.get('/raagis/:raagi_name/shabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select rrs.id, rrs.raagi_name, rrs.shabad_sathaayi_title as shabad_english_title, rrs.recording_title, shabad_info.sathaayi_id, " +
        "concat('https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/',rrs.raagi_name, '/', rrs.shabad_sathaayi_title, '.mp3') as shabad_url, " +
        "shabad_info.starting_id, shabad_info.ending_id, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.checked as shabad_checked "+
        "from raagi_recording_shabad as rrs join shabad on rrs.shabad_sathaayi_title = shabad.sathaayi_title join shabad_info on shabad.sathaayi_id = shabad_info.sathaayi_id "+
        "where rrs.raagi_name=$1 order by shabad_sathaayi_title",
        values: [req.params.raagi_name]
    };
    client.query(query, (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

router.get('/raagis/:raagi_name/recordings/:recording_title/shabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select rrs.shabad_sathaayi_title as shabad_english_title, rrs.recording_title, shabad_info.sathaayi_id, " +
        "shabad_info.starting_id, rrs.starting_time as shabad_starting_time, rrs.ending_time as shabad_ending_time, " +
        "shabad_info.ending_id, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.checked as shabad_checked "+
        "from raagi_recording_shabad as rrs join shabad on rrs.shabad_sathaayi_title = shabad.sathaayi_title join shabad_info on shabad.sathaayi_id = shabad_info.sathaayi_id "+
        "where rrs.raagi_name=$1 and rrs.recording_title=$2 order by shabad_sathaayi_title",
        values: [req.params.raagi_name, req.params.recording_title]
    };
    client.query(query, (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

router.get('/recordings/:recording_title/shabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select shabad_sathaayi_title from raagi_recording_shabad where recording_title=$1 order by shabad_sathaayi_title",
        values: [req.params.recording_title]
    };
    client.query(query, (err, sqlResponse) => {
        let shabads = [];
        for(let row of sqlResponse.rows){
            shabads.push(row.shabad_sathaayi_title);
        }
        res.send(shabads);
        client.end();
    });
});

router.get('/shabads/:sathaayi_id/raagis', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select rrs.raagi_name from shabad join raagi_recording_shabad as rrs on shabad.sathaayi_title=rrs.shabad_sathaayi_title " +
        "where sathaayi_id=$1",
        values: [req.params.sathaayi_id]
    };
    client.query(query, (err, sqlResponse) => {
        let raagi_names = [];
        for(let row of sqlResponse.rows){
            raagi_names.push(row.raagi_name);
        }
        res.send(raagi_names);
        client.end();
    });
});

// NOTE - addRaagi and addRecording is now one POST url.
router.post('/addRaagiRecording', (req, res) =>{
    (async () => {
        const client = await initialize_pool().connect();

        try{
            let image_url = "https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis%20Photos/No%20Raagi.jpg";

            await client.query('BEGIN');
            await client.query("INSERT INTO RAAGI (NAME, IMAGE_URL) VALUES ($1, $2) ON CONFLICT (NAME) DO NOTHING", [req.body.raagi_name, image_url]);
            await client.query("INSERT INTO RECORDING (TITLE, URL) VALUES ($1, $2)", [req.body.recordings[0].recording_title, req.body.recordings[0].recording_url]);

            for(let shabad of req.body.recordings[0].shabads){
                let shabad_length = diff(shabad.shabad_starting_time, shabad.shabad_ending_time);
                await client.query("INSERT INTO SHABAD_INFO (SATHAAYI_ID, STARTING_ID, ENDING_ID, CHECKED) VALUES ($1, $2, $3, $4) ON CONFLICT (SATHAAYI_ID) DO NOTHING",
                    [shabad.sathaayi_id, shabad.starting_id, shabad.ending_id, false]);

                await client.query("INSERT INTO SHABAD (SATHAAYI_TITLE, SATHAAYI_ID) VALUES ($1, $2) ON CONFLICT (SATHAAYI_TITLE) DO NOTHING",
                    [shabad.shabad_english_title, shabad.sathaayi_id]);

                await client.query("INSERT INTO RAAGI_RECORDING_SHABAD (RAAGI_NAME, RECORDING_TITLE, SHABAD_SATHAAYI_TITLE, STARTING_TIME, ENDING_TIME," +
                    " LENGTH) VALUES ($1, $2, $3, $4, $5, $6)",
                    [req.body.raagi_name, req.body.recordings[0].recording_title, shabad.shabad_english_title, shabad.shabad_starting_time, shabad.shabad_ending_time, shabad_length]);
            }
            await client.query('COMMIT');
            res.json("Success");
        }catch(e){
            await client.query('ROLLBACK');
            throw e
        }finally{
            client.release();
        }
    })().catch(e => console.error(e.stack));
});

router.post('/uploadRecording', (req, res) => {
    let raagi_name = req.body.raagi_name;
    let recording_title = req.body.recording_title;
    let recording_url = req.body.recording_url;
    let s3 = new AWS.S3();

    let stream = request.get(recording_url).on('error', function(err){
        console.log(err);
    }).pipe(fs.createWriteStream(recording_title + ".mp3"));

    stream.on('finish', function(){

        fs.readFile(recording_title + ".mp3", function(err, data){
            if(err){
                throw err;
            }else{
                let params = {
                    Bucket: "vismaadnaad/GurmatSagar Recordings/" + raagi_name,
                    Key: recording_title + ".mp3",
                    Body: data,
                    ContentType: "audio/mpeg"
                };
                s3.putObject(params, function(err, data){
                    res.json("Recording uploaded!");
                });
            }
        })
    });
});

// Check if new shabad's checked field is set to true when new shabad is uploaded
router.post('/uploadShabad', (req, res) => {
    let shabad_english_title = req.body.shabad.shabad_english_title;
    let shabad_starting_time = req.body.shabad.shabad_starting_time;
    let shabad_ending_time = req.body.shabad.shabad_ending_time;
    let shabad_sathaayi_id = req.body.shabad.sathaayi_id;
    let starting_id = req.body.shabad.starting_id;
    let ending_id = req.body.shabad.ending_id;
    let raagi_name = req.body.raagi_name;
    let recording_title = req.body.recording_title;
    let replaced_recording_title = req.body.recording_title.replace(/ /g, "\\ ").replace("(", "\\(").replace(")", "\\)");

    let shabad_starting_time_arr = shabad_starting_time.split(":");
    let shabad_ending_time_arr = shabad_ending_time.split(":");

    if((parseInt(shabad_starting_time_arr[0]) >= 60) && (parseInt(shabad_ending_time_arr[0]) >= 60)){
        shabad_starting_time = "01:" + ('0' + (parseInt(shabad_starting_time_arr[0] - 60))).slice(-2) + ":" + shabad_starting_time_arr[1];
    }
    if((parseInt(shabad_ending_time_arr[0]) >= 60)){
        shabad_ending_time = "01:" + ('0' + (parseInt(shabad_ending_time_arr[0] - 60))).slice(-2) + ":" + shabad_ending_time_arr[1];
    }

    // Cut Audio Command with given start/end time
    let cut_audio_cmd = "ffmpeg -y -i " + replaced_recording_title + ".mp3 -ss "
        + shabad_starting_time + " -to " + shabad_ending_time
        + " -acodec copy " + shabad_english_title.replace(/ /g, "\\ ") + "\\ temp.mp3";
    let execute_cut_audio_cmd = child_process.execSync(cut_audio_cmd, { stdio: ['pipe', 'pipe', 'ignore']});

    // Get Duration of the song and parse to Int
    let duration_cmd = "ffprobe -i " + shabad_english_title.replace(/ /g, "\\ ") + "\\ temp.mp3 -show_entries format=duration -v quiet -of csv=\"p=0\"";
    let execute_duration_cmd = child_process.execSync(duration_cmd, { stdio: ['pipe', 'pipe', 'ignore']});
    let end_seconds = parseInt(execute_duration_cmd.toString());

    // Add Fade in and Fade out by 4 seconds to the mp3.
    let fade_cmd = "ffmpeg -i " + shabad_english_title.replace(/ /g, "\\ ") + "\\ temp.mp3 "
        + "-af \"afade=t=in:ss=0:d=4,afade=t=out:st=" + (end_seconds - 4) + ":d=4\" " + shabad_english_title.replace(/ /g, "\\ ") + ".mp3";
    let execute_fade_cmd = child_process.execSync(fade_cmd, { stdio: ['pipe', 'pipe', 'ignore']});

    let client = initialize_client();
    client.connect();
    let query = {
        text: "update shabad_info set checked=true where starting_id=$1 and ending_id=$2",
        values: [starting_id, ending_id]
    };
    client.query(query, (err, sqlResponse) => {
        upload_shabad(shabad_english_title, raagi_name, res);
        client.end();
    });
});

router.put('/changeShabadTitle', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query('update shabad set sathaayi_title=$1 where sathaayi_title=$2', [req.body.new_shabad_english_title,
        req.body.old_shabad_english_title], (err, sqlResponse) => {
        res.json("Success");
        client.end();
    });
});

router.put('/changeStartingID', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query('update shabad_info set starting_id=$1 where starting_id=$2', [req.body.new_starting_id,
        req.body.original_starting_id], (err, sqlResponse) => {
        res.json("Success");
        client.end();
    });
});

router.put('/changeEndingID', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query('update shabad_info set ending_id=$1 where ending_id=$2', [req.body.new_ending_id,
        req.body.original_ending_id], (err, sqlResponse) => {
        res.json("Success");
        client.end();
    });
});

//TODO - Test to see if this method adds shabads to an existing recording. The code is somewhat similar to addRaagiRecording
router.put('/raagis/:raagi_name/recordings/:recording_title/addShabads', (req, res) => {
    (async () => {
        const client = await initialize_pool().connect();
        try{
            await client.query('BEGIN');
            for(let shabad of req.body.shabads){
                let shabad_length = diff(shabad.shabad_starting_time, shabad.shabad_ending_time);
                await client.query("INSERT INTO SHABAD_INFO (SATHAAYI_ID, STARTING_ID, ENDING_ID, CHECKED) VALUES ($1, $2, $3, $4) ON CONFLICT (SATHAAYI_ID) DO NOTHING",
                    [shabad.sathaayi_id, shabad.starting_id, shabad.ending_id, false]);

                await client.query("INSERT INTO SHABAD (SATHAAYI_TITLE, SATHAAYI_ID) VALUES ($1, $2) ON CONFLICT (SATHAAYI_TITLE) DO NOTHING",
                    [shabad.shabad_english_title, shabad.sathaayi_id]);

                await client.query("INSERT INTO RAAGI_RECORDING_SHABAD (RAAGI_NAME, RECORDING_TITLE, SHABAD_SATHAAYI_TITLE, STARTING_TIME, ENDING_TIME," +
                    " LENGTH) VALUES ($1, $2, $3, $4, $5, $6)",
                    [req.params.raagi_name, req.params.recording_title, shabad.shabad_english_title, shabad.shabad_starting_time, shabad.shabad_ending_time, shabad_length]);
            }
            await client.query('COMMIT');
            res.json("Success!");
        }catch(e){
            await client.query('ROLLBACK');
            throw e
        }finally{
            client.release();
        }
    })().catch(e => console.error(e.stack));
});

// TODO - Work on Adding shabad Themes
/*
router.get('/shabads/:sathaayi_id/themes', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select * from shabad_info_theme where sathaayi_id=$1",
        values: [req.params.sathaayi_id]
    };
    client.query(query, (err, sqlResponse) => {
        let shabad_themes = [];
        for(let row of sqlResponse.rows){
            shabad_themes.push(row.theme_name);
        }
        res.send(shabad_themes);
        client.end();
    });
});


router.put('/addShabadThemes/:shabad_english_title', (req, res) => {
    let shabad_english_title = req.params.shabad_english_title;
    let themes = req.body.themes;

    Shabad.update({"shabad_english_title": shabad_english_title}, {$set: {"shabad_theme": themes}}, function(error, numAffected){
       if(error){
           throw error;
       } else{
           res.json("Successfull");
       }
    });
});
*/

function initialize_client(){
    return new Client(config.database);
}

function initialize_pool(){
    return new Pool(config.database);
}

function diff(start, end) {
    start = start.split(":");
    end = end.split(":");
    let startDate = new Date(0, 0, 0, start[0], start[1], 0);
    let endDate = new Date(0, 0, 0, end[0], end[1], 0);
    let diff = endDate.getTime() - startDate.getTime();
    let hours = Math.floor(diff / 1000 / 60 / 60);
    diff -= hours * 1000 * 60 * 60;
    let minutes = Math.floor(diff / 1000 / 60);

    return "0:" + (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;
}

function upload_shabad(shabad_english_title, raagi_name, res){
    let s3 = new AWS.S3();
    fs.readFile(shabad_english_title + ".mp3", function(err, data){
        if(err){
            console.log(err);
        } else{
            let params = {
                Bucket: "vismaadnaad/Raagis/" + raagi_name,
                Key: shabad_english_title + ".mp3",
                Body: data,
                ACL:'public-read',
                ContentType: "audio/mpeg"
            };
            s3.putObject(params, function(err, data){
                if(err) throw err;
                fs.unlink(shabad_english_title + ".mp3");
                fs.unlink(shabad_english_title + " temp.mp3");
                res.json("Shabad uploaded!")
            });
        }
    });
}

module.exports = router;