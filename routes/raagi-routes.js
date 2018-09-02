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
        "count(rrs.shabad_id) as shabads_count, to_char(sum(rrs.length), 'HH24:MI:SS') as total_length " +
        "from raagi join raagi_recording_shabad as rrs ON raagi.id=rrs.raagi_id where rrs.status = 'PROD' group by raagi.id";
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
    let query = "select shabad.sathaayi_title as shabad_english_title, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id, shabad_info.checked as shabad_checked " +
        "from shabad join shabad_info on shabad.shabad_info_id = shabad_info.id order by shabad.sathaayi_title";
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
        text: "select shabad.id, shabad.sathaayi_title as shabad_english_title, shabad.shabad_info_id, shabad_info.sathaayi_id, " +
            "shabad_info.starting_id, shabad_info.ending_id, shabad_info.checked from shabad join shabad_info on shabad.shabad_info_id = shabad_info.id " +
            "where shabad_info.sathaayi_id=$1 order by shabad.sathaayi_title",
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

router.get('/shabads/sathaayi_title/:sathaayi_title', (req, res) => {
    let client = initialize_client();
    let sathaayi_title = parseInt(req.params.sathaayi_title);
    client.connect();
    const query = {
        text: "select * from shabad where sathaayi_title=$1",
        values: [sathaayi_title]
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
        text: "select distinct recording.title as recording_title from raagi_recording_shabad as rrs join recording on rrs.recording_id=recording.id " +
            "where raagi_id=(SELECT ID from raagi where name=$1) order by recording.title",
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
        text: "select distinct recording.title as recording_title, recording.url as recording_url, recording.date_added from raagi_recording_shabad as rrs join recording on rrs.recording_id=recording.id " +
            "where raagi_id=(SELECT ID from raagi where name=$1) order by recording.title",
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
        text: "select rrs.id, raagi.name as raagi_name, shabad.sathaayi_title as shabad_english_title, recording.title as recording_title, shabad_info.sathaayi_id, " +
            "concat('https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/',raagi.name, '/', shabad.sathaayi_title, '.mp3') as shabad_url, " +
            "shabad_info.starting_id, shabad_info.ending_id, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.checked as shabad_checked " +
            "from raagi_recording_shabad as rrs join shabad on rrs.shabad_id = shabad.id join shabad_info on shabad.shabad_info_id = shabad_info.id " +
            "join raagi on rrs.raagi_id = raagi.id join recording on rrs.recording_id = recording.id " +
            "where rrs.raagi_id=(select id from raagi where name=$1) and rrs.status='PROD' order by shabad.sathaayi_title",
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
        text: "select shabad.sathaayi_title as shabad_english_title, recording.title as recording_title, shabad_info.sathaayi_id, " +
            "shabad_info.starting_id, rrs.starting_time as shabad_starting_time, rrs.ending_time as shabad_ending_time, " +
            "shabad_info.ending_id, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.checked as shabad_checked " +
            "from raagi_recording_shabad as rrs " +
            "join shabad on rrs.shabad_id = shabad.id " +
            "join shabad_info on shabad.shabad_info_id = shabad_info.id " +
            "join recording on rrs.recording_id = recording.id " +
            "where rrs.raagi_id=(select id from raagi where name = $1) and recording.title=$2 order by shabad.sathaayi_title",
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
        text: "select shabad.sathaayi_title as shabad_sathaayi_title from shabad join raagi_recording_shabad as rrs on shabad.id = rrs.shabad_id where rrs.recording_id=(select id from recording where title = $1) order by shabad.sathaayi_title",
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
        text: "select raagi.name as raagi_name from shabad join raagi_recording_shabad as rrs on shabad.id = rrs.shabad_id " +
            "join raagi on raagi.id = rrs.raagi_id where shabad.shabad_info_id = (select id from shabad_info where sathaayi_id = $1)",
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

router.post('/shabadListeners', (req, res) => {
    console.log(req);
    let client = initialize_client();
    client.connect();

    client.query("update raagi_recording_shabad set listeners = listeners + 1 where id = $1 returning listeners", [req.body.id], (err, sqlRes) => {
        if(err){
            console.log(err);
            res.json({
                "ResponseCode": 400,
                "Result": "Failure"
            });
        }else{
            res.json(sqlRes.rows[0])
        }
    });
});

router.get('/shabadListeners/:id', (req, res) => {
    let client = initialize_client();
    client.connect();

    client.query("select listeners from raagi_recording_shabad as rrs where rrs.id = $1", [req.params.id], (err, sqlResponse) => {
        if(err){
            console.log(err);
            res.json({
                "ResponseCode": 400,
                "Result": "Failure"
            });
        }else{
            res.json(sqlResponse.rows[0]);
        }
    });
});

// NOTE - addRaagi and addRecording is now one POST url.
router.post('/addRaagiRecording', (req, res) =>{

    (async () => {
        const client = await initialize_pool().connect();
        // raagi_id = 72, recording_id = 160, shabad_info_id = 418, shabad_id = 417,
        try{
            let image_url = "https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis%20Photos/No%20Raagi.jpg";
            let raagi_id, recording_id, shabad_info_id, shabad_id;

            await client.query('BEGIN');

            let raagi_rows = await client.query("INSERT INTO RAAGI (NAME, IMAGE_URL) VALUES ($1, $2) ON CONFLICT (NAME) DO NOTHING RETURNING ID", [req.body.raagi_name, image_url]);
            if(raagi_rows.rows.length === 0){
                raagi_rows = await client.query("SELECT ID FROM RAAGI WHERE NAME=$1", [req.body.raagi_name]);
            }
            raagi_id = raagi_rows.rows[0].id;

            let recording_rows;

            if(req.body.recordings[0].recording_url === "no_recording"){
                recording_rows = await client.query("SELECT ID FROM RECORDING WHERE URL = 'no_recording'");
            }else{
                recording_rows = await client.query("INSERT INTO RECORDING (TITLE, URL) VALUES ($1, $2) RETURNING ID", [req.body.recordings[0].recording_title, req.body.recordings[0].recording_url]);
                if(recording_rows.rows.length === 0){
                    recording_rows = await client.query("SELECT ID FROM RECORDING WHERE TITLE=$1", [req.body.recordings[0].recording_title]);
                }
            }

            recording_id = recording_rows.rows[0].id;


            for(let shabad of req.body.recordings[0].shabads){
                let starting_time, ending_time;

                if(shabad.shabad_starting_time.length === 4){
                    starting_time = shabad.shabad_starting_time.slice(0, 2) + ":" + shabad.shabad_starting_time.slice(2,4);
                }else{
                    starting_time = shabad.shabad_starting_time;
                }

                if(shabad.shabad_ending_time.length === 4){
                    ending_time = shabad.shabad_ending_time.slice(0, 2) + ":" + shabad.shabad_ending_time.slice(2,4);
                }else{
                    ending_time = shabad.shabad_ending_time;
                }

                let shabad_length = diff(starting_time, ending_time);

                let shabad_info_rows = await client.query("INSERT INTO SHABAD_INFO (SATHAAYI_ID, STARTING_ID, ENDING_ID, CHECKED) VALUES ($1, $2, $3, $4) ON CONFLICT (SATHAAYI_ID) DO NOTHING RETURNING ID",
                    [shabad.sathaayi_id, shabad.starting_id, shabad.ending_id, false]);
                if(shabad_info_rows.rows.length === 0){
                    shabad_info_rows = await client.query("SELECT ID FROM SHABAD_INFO WHERE SATHAAYI_ID=$1", [shabad.sathaayi_id]);
                }
                shabad_info_id = shabad_info_rows.rows[0].id;


                let shabad_rows = await client.query("INSERT INTO SHABAD (SATHAAYI_TITLE, SHABAD_INFO_ID) VALUES ($1, $2) ON CONFLICT (SATHAAYI_TITLE) DO NOTHING RETURNING ID",
                    [shabad.shabad_english_title, shabad_info_id]);
                if(shabad_rows.rows.length === 0){
                    shabad_rows = await client.query("SELECT ID FROM SHABAD WHERE SATHAAYI_TITLE=$1", [shabad.shabad_english_title]);
                }
                shabad_id = shabad_rows.rows[0].id;

                await client.query("INSERT INTO RAAGI_RECORDING_SHABAD (RAAGI_ID, RECORDING_ID, SHABAD_ID, STARTING_TIME, ENDING_TIME, LENGTH, STATUS) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [raagi_id, recording_id, shabad_id, starting_time, ending_time, shabad_length, "DEV"]);
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

    let stream = request.get(recording_url).on('error', function(err){
        console.log(err);
    }).pipe(fs.createWriteStream(recording_title + ".mp3"));

    stream.on('finish', () => res.json("Recording uploaded!"));

});

router.post('/uploadShabadFromLocal', (req, res) => {

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

router.put('/setStatusToPROD', (req, res) => {
    let raagi_name = req.body.raagi_name;
    let recording_title = req.body.recording_title;

    let client = initialize_client();
    client.connect();
    client.query("update raagi_recording_shabad set status=$1 where recording_id=(select id from recording where title=$2) " +
        "and raagi_id=(select id from raagi where name=$3)", ["PROD", recording_title, raagi_name], (req, sqlRes) => {
        res.json("SUCCESS");
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
            let shabad_info_id, shabad_id;
            await client.query('BEGIN');
            for(let shabad of req.body.shabads){

                let starting_time, ending_time;

                if(shabad.shabad_starting_time.length === 4){
                    starting_time = shabad.shabad_starting_time.slice(0, 2) + ":" + shabad.shabad_starting_time.slice(2,4);
                }else{
                    starting_time = shabad.shabad_starting_time;
                }

                if(shabad.shabad_ending_time.length === 4){
                    ending_time = shabad.shabad_ending_time.slice(0, 2) + ":" + shabad.shabad_ending_time.slice(2,4);
                }else{
                    ending_time = shabad.shabad_ending_time;
                }

                console.log(starting_time + "   " + ending_time);

                let shabad_length = diff(starting_time, ending_time);

                let shabad_info_rows = await client.query("INSERT INTO SHABAD_INFO (SATHAAYI_ID, STARTING_ID, ENDING_ID, CHECKED) VALUES ($1, $2, $3, $4) ON CONFLICT (SATHAAYI_ID) DO NOTHING RETURNING ID",
                    [shabad.sathaayi_id, shabad.starting_id, shabad.ending_id, false]);
                if(shabad_info_rows.rows.length === 0){
                    shabad_info_rows = await client.query("SELECT ID FROM SHABAD_INFO WHERE SATHAAYI_ID=$1", [shabad.sathaayi_id]);
                }
                shabad_info_id = shabad_info_rows.rows[0].id;

                let shabad_rows = await client.query("INSERT INTO SHABAD (SATHAAYI_TITLE, SHABAD_INFO_ID) VALUES ($1, $2) ON CONFLICT (SATHAAYI_TITLE) DO NOTHING RETURNING ID",
                    [shabad.shabad_english_title, shabad_info_id]);
                if(shabad_rows.rows.length === 0){
                    shabad_rows = await client.query("SELECT ID FROM SHABAD WHERE SATHAAYI_TITLE=$1", [shabad.shabad_english_title]);
                }
                shabad_id = shabad_rows.rows[0].id;

                await client.query("INSERT INTO RAAGI_RECORDING_SHABAD (RAAGI_ID, RECORDING_ID, SHABAD_ID, STARTING_TIME, ENDING_TIME, LENGTH, STATUS) " +
                    "VALUES ((SELECT ID FROM RAAGI WHERE NAME = $1), (SELECT ID FROM RECORDING WHERE TITLE = $2), $3, $4, $5, $6, $7)",
                    [req.params.raagi_name, req.params.recording_title, shabad_id, starting_time, ending_time, shabad_length, "DEV"]);
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
    return new Client(config.vismaadnaad);
}

function initialize_pool(){
    return new Pool(config.vismaadnaad);
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

    if(hours > 59){
        hours = hours - 60;
        return "01:" + (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;
    }else{
        return "0:" + (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;
    }
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

/*
router.get("/transferData", (req, res) => {

    //let vismaadnaadtest_client = new Client(config.database2);
    let raagi, recording, shabad_info, shabad, raagi_recording_shabad, theme, shabad_info_theme, member, playlist, playlist_shabad;
    (async () => {
        const vismaadnaaddev_client = await initialize_pool().connect();
        try{
            await vismaadnaaddev_client.query('BEGIN');
            await vismaadnaaddev_client.query("SELECT * FROM raagi", (err, res) => {
                raagi = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM recording", (err, res) => {
                recording = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM shabad_info", (err, res) => {
                shabad_info = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM shabad", (err, res) => {
                shabad = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM raagi_recording_shabad", (err, res) => {
                raagi_recording_shabad = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM theme", (err, res) => {
                theme = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM shabad_info_theme", (err, res) => {
                shabad_info_theme = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM member", (err, res) => {
                member = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM playlist", (err, res) => {
                playlist = res.rows;
            });
            await vismaadnaaddev_client.query("SELECT * FROM playlist_shabad", (err, res) => {
                playlist_shabad = res.rows;
            });
            await vismaadnaaddev_client.query('COMMIT');
        }catch(e){
            await vismaadnaaddev_client.query('ROLLBACK');
            throw e
        }finally{
            vismaadnaaddev_client.release();
            (async () => {
                const vismaadnaad_client = await (new Pool(config.database2)).connect();
                try{
                    await vismaadnaadtest_client.query('BEGIN');
                    for(let row of raagi){
                        await vismaadnaadtest_client.query("INSERT INTO RAAGI (NAME, IMAGE_URL, LIKES, DATE_ADDED) VALUES ($1, $2, 0, $3)", [row.name, row.image_url, row.date_added])
                    }
                    for(let row of recording){
                        await vismaadnaadtest_client.query("INSERT INTO RECORDING (TITLE, URL, DATE_ADDED) VALUES ($1, $2, $3)", [row.title, row.url, row.date_added])
                    }
                    for(let row of shabad_info){
                        await vismaadnaadtest_client.query("INSERT INTO SHABAD_INFO (SATHAAYI_ID, STARTING_ID, ENDING_ID, CHECKED) VALUES ($1, $2, $3, $4)", [row.sathaayi_id, row.starting_id, row.ending_id, row.checked])
                    }
                    for(let row of shabad){
                        await vismaadnaadtest_client.query("INSERT INTO SHABAD (SATHAAYI_TITLE, SHABAD_INFO_ID) VALUES ($1, (SELECT ID FROM SHABAD_INFO WHERE SATHAAYI_ID=$2))", [row.sathaayi_title, row.sathaayi_id])
                    }
                    for(let row of raagi_recording_shabad){
                        await vismaadnaadtest_client.query("INSERT INTO RAAGI_RECORDING_SHABAD (RAAGI_ID, RECORDING_ID, SHABAD_ID, STARTING_TIME, ENDING_TIME, LENGTH, STATUS, DATE_ADDED) " +
                            "VALUES ((SELECT ID FROM RAAGI WHERE NAME=$1), (SELECT ID FROM RECORDING WHERE TITLE=$2), (SELECT ID FROM SHABAD WHERE SATHAAYI_TITLE=$3), $4, $5, $6, $7, $8)",
                            [row.raagi_name, row.recording_title, row.shabad_sathaayi_title, row.starting_time, row.ending_time, row.length, "PROD", row.date_added])
                    }
                    for(let row of member){
                        console.log(row.account_id);
                        await vismaadnaadtest_client.query("INSERT INTO MEMBER (ACCOUNT_ID, USERNAME, PASSWORD_HASH, FIRST_NAME, LAST_NAME, DATE_OF_BIRTH, GENDER, SOURCE_OF_ACCOUNT, DATE_ADDED) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                            [row.account_id, row.username, row.password_hash, row.first_name, row.last_name, row.date_of_birth, row.gender, row.source_of_account, row.date_added])
                    }


                    await vismaadnaadtest_client.query('COMMIT');
                    res.json('SUCCESS');
                }catch(e){
                    await vismaadnaadtest_client.query('ROLLBACK');
                    throw e
                }finally{
                    vismaadnaadtest_client.release();
                }
            })().catch(e => console.error(e.stack));
        }
    })().catch(e => console.error(e.stack));

});
*/

module.exports = router;