const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const request = require('request');
const fs = require('fs');
const child_process = require('child_process');
const { Pool, Client } = require('pg');
const config = require('../config/database');
const queries = require('../config/queries');
const constants = require('../config/constants');
const shuffle = require('shuffle-array');
/*
    APIs for MOBILE APP
 */

// *********************************************************************************************************************

router.get('/homePage', (req, res) => {
    (async () => {
        const client = await initialize_pool().connect();
        try{
            await client.query ('BEGIN');

            let popularShabads = shuffle.pick((await client.query(queries.POPULAR_SHABADS, [25])).rows, {picks: 5});
            //let recentlyAddedShabads = (await client.query(queries.RECENTLY_ADDED_SHABADS)).rows;
            let raagisInfo = shuffle.pick(processRaagiInfo( ((await client.query(queries.HOME_PAGE_RAAGI_INFO)).rows)), {picks: 6});

            res.send({
                popularShabads,
                //recentlyAddedShabads,
                raagisInfo
            });
            await client.query('COMMIT');
        }catch(e){
            await client.query('ROLLBACK');
            throw e
        }finally{
            client.release();
        }
    })().catch(e => console.error(e.stack));

});

router.get('/popularShabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.POPULAR_SHABADS, [50], (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

router.get('/recentlyAddedShabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.RECENTLY_ADDED_SHABADS , (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

router.get('/raagi_info', (req, res) => {
    let client = initialize_client();
    client.connect();
    const query = queries.RAAGI_INFO;
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

// NOTE: If the length is greater than 59 minutes, then to_char() needs to have HH12:MI:SS
router.get('/raagis/:raagi_name/shabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: queries.RAAGIS_SHABADS,
        values: [req.params.raagi_name]
    };
    client.query(query, (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

// *********************************************************************************************************************

router.get('/totalShabadListeners', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.TOTAL_SHABAD_LISTENERS, (err, sqlRes) => {
        res.json(sqlRes.rows);
        client.end();
    });
});

router.get('/raagiNames', (req, res) =>{
    let client = initialize_client();
    client.connect();
    let raagi_names = [];
    client.query(queries.RAAGI_NAMES, (err, sqlResponse) => {
        for(let raagi of sqlResponse.rows){
            raagi_names.push(raagi.name);
        }
        res.send(raagi_names);
        client.end();
    });
});

router.get('/kathavaachaks', (req, res) => {
    let client = initialize_client();
    client.connect();
    let kathavaachaks = [];
    client.query(queries.KATHAVAACHAKS, (err, sqlResponse) => {
       for(let kathavaachak of sqlResponse.rows){
           kathavaachaks.push(kathavaachak.name);
       }
       res.send(kathavaachaks);
       client.end();
    });
});

router.get('/recordingURLs', (req, res) =>{
    let client = initialize_client();
    client.connect();
    let recording_urls = [];
    client.query(queries.RECORDING_URLS, (err, sqlResponse) => {
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
    client.query(queries.RECENT_RECORDINGS, (err, sqlResponse) => {
        for(let row of sqlResponse.rows){
            recent_recordings.push(row.title);
        }
        res.send(recent_recordings);
        client.end();
    });
});

router.get('/shabads', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = queries.SHABADS;
    client.query(query, (err, sqlResponse) => {
        res.send(sqlResponse.rows);
        client.end();
    });
});

router.get('/shabads/:sathaayi_id', (req, res) => {
    let client = initialize_client();
    let sathaayi_id = parseInt(req.params.sathaayi_id);
    client.connect();
    const query = {
        text: queries.SHABADS_BY_SATHAAYI_ID,
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
    let sathaayi_title = req.params.sathaayi_title;
    client.connect();
    const query = {
        text: queries.SHABADS_BY_SATHAAYI_TITLE,
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
        text: queries.RAAGIS_RECORDINGS,
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
        text: queries.RAAGIS_RECORDINGS_INFO,
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
        text: queries.RAAGIS_RECORDINGS_SHABADS,
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
        text: queries.RECORDINGS_SHABADS,
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
        text: queries.SHABADS_RAAGIS,
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

router.get('/recentRaagis', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: queries.RECENT_RAAGIS,
        values: []
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

router.get('/shabadTutorials/limit/:limit', (req, res) => {
    let client = initialize_client();
    client.connect();
    let limit = req.params.limit;
    let query;

    if(limit === "all"){
        query = {
            text: queries.SHABAD_TUTORIALS_ALL,
            values: []
        }
    }else{
        query = {
            text: queries.SHABAD_TUTORIALS_LIMIT,
            values: [limit]
        }
    }
    client.query(query, (err, sqlResponse) => {
        if(err){
            console.log(err.stack);
            res.json(constants.FAILED_RESPONSE);
        }else{
            res.json(sqlResponse.rows);
        }
        client.end();
    });
});

router.get('/shabadListeners/:id', (req, res) => {
    let client = initialize_client();
    client.connect();

    client.query(queries.SHABAD_LISTENERS_BY_ID, [req.params.id], (err, sqlResponse) => {
        if(err){
            console.log(err.stack);
            res.json(constants.FAILED_RESPONSE);
        }else{
            res.json(sqlResponse.rows[0]);
        }
        client.end();
    });
});

router.put('/shabadListeners', (req, res) => {
    let client = initialize_client();
    client.connect();

    client.query(queries.SHABAD_LISTENERS, [req.body.id], (err, sqlRes) => {
        if(err){
            console.log(err.stack);
            res.json(constants.FAILED_RESPONSE);
        }else{
            res.json(constants.SUCCESS_RESPONSE)
        }
        client.end();
    });
});

// NOTE - addRaagi and addRecording is now one POST url.
router.post('/addRaagiRecording', (req, res) =>{
    (async () => {
        const client = await initialize_pool().connect();
        // raagi_id = 72, recording_id = 160, shabad_info_id = 418, shabad_id = 417,
        try{
            let raagi_id, recording_id, shabad_info_id, shabad_id;

            await client.query('BEGIN');

            let raagi_rows = await client.query(queries.ADD_RAAGI_RECORDING_INSERT_RAAGI, [req.body.raagi_name, constants.IMAGE_URL]);
            if(raagi_rows.rows.length === 0){
                raagi_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_RAAGI, [req.body.raagi_name]);
            }
            raagi_id = raagi_rows.rows[0].id;

            let recording_rows;

            if(req.body.recordings[0].recording_url === "no_recording"){
                recording_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_NO_RECORDING);
            }else{
                recording_rows = await client.query(queries.ADD_RAAGI_RECORDING_INSERT_RECORDING, [req.body.recordings[0].recording_title, req.body.recordings[0].recording_url]);
                if(recording_rows.rows.length === 0){
                    recording_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_RECORDING, [req.body.recordings[0].recording_title]);
                }
            }

            recording_id = recording_rows.rows[0].id;


            for(let shabad of req.body.recordings[0].shabads){
                let starting_time, ending_time, status;

                if(shabad.hasOwnProperty('status')){
                    status = "PROD";
                }else{
                    status = "DEV";
                }
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

                let shabad_info_rows = await client.query(queries.ADD_RAAGI_RECORDING_INSERT_SHABAD_INFO,
                    [shabad.sathaayi_id, shabad.starting_id, shabad.ending_id, false]);
                if(shabad_info_rows.rows.length === 0){
                    shabad_info_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_SHABAD_INFO, [shabad.sathaayi_id]);
                }
                shabad_info_id = shabad_info_rows.rows[0].id;


                let shabad_rows = await client.query(queries.ADD_RAAGI_RECORDING_INSERT_SHABAD,
                    [shabad.shabad_english_title.trim(), shabad_info_id]);
                if(shabad_rows.rows.length === 0){
                    shabad_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_SHABAD, [shabad.shabad_english_title.trim()]);
                }
                shabad_id = shabad_rows.rows[0].id;

                await client.query(queries.ADD_RAAGI_RECORDING_INSERT_RAAGI_RECORDING_SHABAD,
                    [raagi_id, recording_id, shabad_id, starting_time, ending_time, shabad_length, status]);
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
        console.log(err.stack);
    }).pipe(fs.createWriteStream(recording_title + ".mp3"));

    stream.on('finish', () => res.json("Recording uploaded!"));

});

// Check if new shabad's checked field is set to true when new shabad is uploaded
router.post('/uploadShabad', (req, res) => {
    let shabad_english_title = req.body.shabad.shabad_english_title.trim();
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
        text: queries.UPDATE_SHABAD_INFO,
        values: [starting_id, ending_id]
    };
    client.query(query, (err, sqlResponse) => {
        upload_shabad(shabad_english_title, raagi_name, res, client);
    });
});

router.put('/setStatusToPROD', (req, res) => {
    let raagi_name = req.body.raagi_name;
    let recording_title = req.body.recording_title;

    let client = initialize_client();
    client.connect();
    client.query(queries.SET_STATUS_TO_PROD, ["PROD", recording_title, raagi_name], (req, sqlRes) => {
        res.json(constants.SUCCESS_RESPONSE);
        client.end();
    });
});

router.put('/changeShabadTitle', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.CHANGE_SHABAD_TITLE, [req.body.new_shabad_english_title.trim(),
        req.body.old_shabad_english_title], (err, sqlResponse) => {
        res.json(constants.SUCCESS_RESPONSE);
        client.end();
    });
});

router.put('/changeStartingID', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.CHANGE_STARTING_ID, [req.body.new_starting_id,
        req.body.original_starting_id], (err, sqlResponse) => {
        res.json(constants.SUCCESS_RESPONSE);
        client.end();
    });
});

router.put('/changeEndingID', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.CHANGE_ENDING_ID, [req.body.new_ending_id,
        req.body.original_ending_id], (err, sqlResponse) => {
        res.json(constants.SUCCESS_RESPONSE);
        client.end();
    });
});

router.put('/changeStartingTime', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.CHANGE_STARTING_TIME, [req.body.new_starting_time,
        req.body.rrs_id, req.body.old_starting_time], (err, sqlResponse) => {
        res.json(constants.SUCCESS_RESPONSE);
        client.end();
    });
});

router.put('/changeEndingTime', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.CHANGE_ENDING_TIME, [req.body.new_ending_time,
        req.body.rrs_id, req.body.old_ending_time], (err, sqlResponse) => {
        res.json(constants.SUCCESS_RESPONSE);
        client.end();
    });
});

//TODO - Test to see if this method adds shabads to an existing recording. The code is somewhat similar to addRaagiRecording
router.put('/raagis/:raagi_name/recordings/:recording_title/addShabads', (req, res) => {
    (async () => {
        const client = await initialize_pool().connect();
        try{
            let raagi_id, recording_id, shabad_info_id, shabad_id;
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

                let shabad_length = diff(starting_time, ending_time);

                let raagi_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_RAAGI, [req.params.raagi_name]);
                raagi_id = raagi_rows.rows[0].id;

                let recording_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_RECORDING, [req.params.recording_title]);
                recording_id = recording_rows.rows[0].id;

                let shabad_info_rows = await client.query(queries.ADD_RAAGI_RECORDING_INSERT_SHABAD_INFO,
                    [shabad.sathaayi_id, shabad.starting_id, shabad.ending_id, false]);
                if(shabad_info_rows.rows.length === 0){
                    shabad_info_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_SHABAD_INFO, [shabad.sathaayi_id]);
                }
                shabad_info_id = shabad_info_rows.rows[0].id;

                let shabad_rows = await client.query(queries.ADD_RAAGI_RECORDING_INSERT_SHABAD,
                    [shabad.shabad_english_title.trim(), shabad_info_id]);
                if(shabad_rows.rows.length === 0){
                    shabad_rows = await client.query(queries.ADD_RAAGI_RECORDING_SELECT_SHABAD, [shabad.shabad_english_title.trim()]);
                }
                shabad_id = shabad_rows.rows[0].id;

                await client.query(queries.ADD_RAAGI_RECORDING_INSERT_RAAGI_RECORDING_SHABAD,
                    [raagi_id, recording_id, shabad_id, starting_time, ending_time, shabad_length, "DEV"]);
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

function processRaagiInfo(rows){
    let raagis_info = [];
    for(let raagi of rows){
        let hhmmss = raagi.total_length.split(':');
        let minutes = (parseInt(hhmmss[0]*60)) + (parseInt(hhmmss[1]));

        raagi.raagi_id = parseInt(raagi.raagi_id);
        raagi.shabads_count = parseInt(raagi.shabads_count);
        raagi.minutes_of_shabads = minutes;
        delete raagi.total_length;
        raagis_info.push(raagi);
    }
    return raagis_info
}

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

function upload_shabad(shabad_english_title, raagi_name, res, client){
    let s3 = new AWS.S3();
    fs.readFile(shabad_english_title + ".mp3", (err, data) =>{
        if (err) throw err;
        let params = {
            Bucket: "vismaadnaad/Raagis/" + raagi_name,
            Key: shabad_english_title + ".mp3",
            Body: data,
            ACL:'public-read',
            ContentType: "audio/mpeg"
        };
        s3.putObject(params, function(err, data){
            if(err) throw err;
            fs.unlink(shabad_english_title + ".mp3", err => {
                if (err) throw err;
            });
            fs.unlink(shabad_english_title + " temp.mp3", err => {
                if (err) throw err;
            });
            res.json(shabad_english_title + "  ==> shabad uploaded!");
            client.end();
        });
    });
}

module.exports = router;