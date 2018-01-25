const express = require('express');
const router = express.Router();
const Raagi = require('../models/raagi');
const Shabad = require("../models/shabad");
const _ = require('underscore');
const async = require('async');
const AWS = require('aws-sdk');
const request = require('request');
const fs = require('fs');
const child_process = require('child_process');

router.get('/raagiNames', (req, res) =>{
   Raagi.find({}, function(err, raagis){
       if(err)throw err;

       let raagi_names = [];
       for(let raagi of raagis){
           raagi_names.push(raagi.raagi_name);
       }

       res.json(raagi_names);
   }) ;
});

router.get('/raagis', (req, res) =>{
    Raagi.find({}, function(err, raagis) {
        if(err){
            res.send(err);
        }else{
            if(!raagis){
                res.send("No raagis");
            }else{
                let raagisArr = [];
                async.each(raagis, function(raagi, raagiCallback){
                    let raagiObj = {
                        "raagi_name": raagi.raagi_name,
                        "recordings": []
                    };
                    async.each(raagi.recordings, function(recording, recordingCallback){
                        let recordingObj = {
                            "recording_title": recording.recording_title,
                            "recording_date": recording.recording_date,
                            "recording_url": recording.recording_url,
                            "shabads": []
                        };

                        async.each(recording.shabads, function(shabad, shabadCallback){
                            Shabad.findOne({"sathaayi_id": shabad.sathaayi_id}, function(err, foundShabad){
                                if(err){
                                }else{
                                    if(foundShabad !== null){
                                        recordingObj.shabads.push({
                                            "shabad_english_title": foundShabad.shabad_english_title,
                                            "sathaayi_id": shabad.sathaayi_id,
                                            "starting_id": foundShabad.starting_id,
                                            "ending_id": foundShabad.ending_id,
                                            "shabad_starting_time": shabad.shabad_starting_time,
                                            "shabad_ending_time": shabad.shabad_ending_time
                                        });
                                    }else{
                                        console.log("Raagi Name: " + raagi.raagi_name + " Shabad Sathaayi ID: " + shabad.sathaayi_id);
                                    }

                                }
                                shabadCallback();
                            });
                        }, function(){
                            recordingCallback();
                        });
                        raagiObj.recordings.push(recordingObj);
                    }, function(){
                        raagiCallback();
                    });
                    raagisArr.push(raagiObj);
                }, function(){
                    res.json(raagisArr);
                });
            }
        }
    });
});

router.get('/raagi_info', (req, res) => {
    Raagi.find({}, function(err, raagis){
        if(err){
            res.send(err);
        }else{
            let raagisInfoArr = [];
            let raagi_id = 0;
            for(let raagi of raagis){
                let raagis_info = {
                    raagi_id: 0,
                    raagi_name: "",
                    shabads_count: 0,
                    raagi_image_url: "null",
                    minutes_of_shabads: 0
                };
                raagis_info.raagi_name = raagi.raagi_name;
                let recordingsArr = raagi.recordings;
                let totalShabadMinutes = 0;
                for(let i = 0; i < recordingsArr.length; i++){
                    let shabadsArr = recordingsArr[i].shabads;
                    let shabadTimeArr = [];

                    for(let j = 0; j < shabadsArr.length; j++){
                        if(shabadsArr[j].shabad_starting_time !== "00:00" && shabadsArr[j].shabad_ending_time !== "00:00" ){
                            raagis_info.shabads_count++;
                            shabadTimeArr.push(diff(shabadsArr[j].shabad_starting_time, shabadsArr[j].shabad_ending_time));
                        }
                    }
                    totalShabadMinutes += addInMinutes(shabadTimeArr);
                }
                raagi_id++;
                raagis_info.raagi_id = raagi_id;
                raagis_info.minutes_of_shabads = totalShabadMinutes;
                raagisInfoArr.push(raagis_info);
            }


            res.json(raagisInfoArr.sort(compare));
        }
    });
});

router.get('/raagis/:raagi_name/recordings/:recording_title/uploadShabads', (req, res) => {
   let raagi_name = req.params.raagi_name;
   let recording_title = req.params.recording_title;

   Raagi.find({"raagi_name": raagi_name}, function(err, foundRaagi){
        if(err){
            res.json(err);
        }else{
            let recordings = foundRaagi[0].recordings;
            let recordingObj = {};
            for(let recording of recordings){
                if(recording.recording_title === recording_title){
                    recordingObj = recording;
                }
            }

            let cut_shabads_command_arr = [];
            upload_recording(raagi_name, recordingObj.recording_url, recording_title, function(){
                async.each(recordingObj.shabads, function(shabad, shabadCallback){
                    Shabad.findOne({"sathaayi_id": shabad.sathaayi_id}, function(err, foundShabad){

                        if(err){
                            console.log(err);
                        }else{
                            if(foundShabad !== null){
                                let command = "ffmpeg -y -i " + recording_title.replace(/ /g, "\\ ") + ".mp3 -ss "
                                    + shabad.shabad_starting_time + " -to " + shabad.shabad_ending_time
                                    + " -acoder copy " + foundShabad.shabad_english_title.replace(/ /g, "\\ ") + ".mp3";

                                cut_shabads_command_arr.push({
                                    shabad_english_title: foundShabad.shabad_english_title,
                                    shabad_starting_time: shabad.shabad_starting_time,
                                    shabad_ending_time: shabad.shabad_ending_time,
                                    raagi_name: raagi_name,
                                    recording_title: recording_title,
                                    recording_url: recordingObj.recording_url,
                                    command: command
                                });
                            }
                            shabadCallback();
                        }
                    });
                }, function(){
                    cut_shabads(cut_shabads_command_arr);
                    fs.unlink(recording_title + ".mp3");
                    console.log("Removed " + recording_title + ".mp3 file...");
                    res.json({"done": true})
                })
            });
        }
   });
});

router.get('/shabads', (req, res) => {
    Shabad.find({}, function(err, shabads){
        if(err){
            res.json(err);
        }else{
            res.json(shabads);
        }
    });
});

router.get('/raagis/:raagi_name/recordings', (req, res) =>{
    Raagi.findOne({'raagi_name': req.params.raagi_name}, function(err, recordingsObj) {
        if(err){
            res.send(err);
        }else{
            let recordings = [];
            for(let recording of recordingsObj.recordings){
                recordings.push(recording.recording_title);
            }
            if(!recordings){
                res.send("No recordings");
            }else{
                res.send(JSON.stringify(recordings));
            }
        }
    });
});

router.get('/raagis/:raagi_name/recordingsInfo', (req, res) =>{
    Raagi.findOne({'raagi_name': req.params.raagi_name}, function(err, recordingsObj) {
        if(err){
            res.send(err);
        }else{
            let recordings = [];
            for(let recording of recordingsObj.recordings){
                recordings.push({
                    recording_title: recording.recording_title,
                    recording_url: recording.recording_url
                });
            }
            if(!recordings){
                res.send("No recordings");
            }else{
                res.send(JSON.stringify(recordings));
            }
        }
    });
});

router.get('/raagis/:raagi_name/shabads', (req, res) =>{
    Raagi.findOne({'raagi_name': req.params.raagi_name}, function(err, raagiObj) {
        if(err){
            res.send(err);
        }else{
            let shabadsArr = [];
            async.each(raagiObj.recordings, function(recording, recordingCallback){
                async.each(recording.shabads, function(shabad,shabadCallback){
                    Shabad.findOne({"sathaayi_id": shabad.sathaayi_id}, function(err, foundShabad){
                        if(err){
                            res.json(err);
                        }else {
                            if(foundShabad !== null){
                                shabadsArr.push({
                                    "shabad_english_title": foundShabad.shabad_english_title,
                                    "sathaayi_id": shabad.sathaayi_id,
                                    "starting_id": foundShabad.starting_id,
                                    "ending_id": foundShabad.ending_id,
                                    "raagi_name": req.params.raagi_name,
                                    "shabad_length": diff(shabad.shabad_starting_time, shabad.shabad_ending_time),
                                    "shabad_url": "http://www.gurmatsagar.com/files/Bhai%20Maninderpal%20Singh%20Jee%20Keertan%20Duty%2031-03-17.mp3"
                                });
                            }

                        }
                        shabadCallback();
                    });
                }, function(err){
                    recordingCallback();
                });
            }, function(err){
                res.json(shabadsArr.sort(compareByShabadName));
            });
        }
    });
});

router.get('/raagis/:raagi_name/recordings/:recording_title/shabads', (req, res) => {
    let raagi_name = req.params.raagi_name;
    let recording_title = req.params.recording_title;
    let recordingObj = {};

    Raagi.findOne({"raagi_name": raagi_name}, function(err, foundRaagi){
       for(let recording of foundRaagi.recordings){
           if(recording.recording_title === recording_title){
               recordingObj = recording;
           }
       }
       let shabadsArr = [];
       async.each(recordingObj.shabads, function(shabad, shabadCallback){
           Shabad.findOne({"sathaayi_id": shabad.sathaayi_id}, function(err, foundShabad){
               if(err){
                   res.json(err);
               }else {
                   if(foundShabad !== null){
                       shabadsArr.push({
                           "shabad_english_title": foundShabad.shabad_english_title,
                           "sathaayi_id": shabad.sathaayi_id,
                           "starting_id": foundShabad.starting_id,
                           "ending_id": foundShabad.ending_id,
                           "shabad_starting_time": shabad.shabad_starting_time,
                           "shabad_ending_time": shabad.shabad_ending_time,
                           "shabad_length": diff(shabad.shabad_starting_time, shabad.shabad_ending_time),
                       });
                   }
               }
               shabadCallback();
           });
       }, function(){
          res.json(shabadsArr.sort(compareByShabadName));
       });
    });

});

router.post('/addRaagi', (req, res) =>{
    let raagi = new Raagi();

    Raagi.count({"raagi_name": req.body.raagi_name}, function(err, foundRaagi){
        if(err){
            res.json({"message": "Error finding Raagi. \n" + err});
        }else{
            if(foundRaagi === 0){
                raagi.raagi_name = req.body.raagi_name;
                let recordingObj = {
                    "recording_title": req.body.recordings[0].recording_title,
                    "recording_url": req.body.recordings[0].recording_url,
                    "shabads": []
                };

                addShabads(req.body.recordings[0].shabads);
                async.each(req.body.recordings[0].shabads, function(shabad, shabadCallback){

                    let shabadObj = {
                        "sathaayi_id": shabad.sathaayi_id,
                        "shabad_starting_time": shabad.shabad_starting_time,
                        "shabad_ending_time": shabad.shabad_ending_time
                    };
                    recordingObj.shabads.push(shabadObj);
                    add_shabad(shabad, shabadCallback);

                }, function(){
                    raagi.recordings = [recordingObj];
                    raagi.save(function(err) {
                        if(err){
                            res.json({"message": "Error adding Raagi. \n" + err});
                        }else{
                            res.json({"message": "Raagi Added Successfully!"});
                        }
                    });
                });
            }else if(foundRaagi === 1){
                res.json({"message": "Raagi already exists."});
            }
        }
    });
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
                    Bucket: "vismaadbani/vismaaddev/GurmatSagar Recordings/" + raagi_name,
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

router.post('/uploadShabad', (req, res) => {
    let shabad_english_title = req.body.shabad.shabad_english_title;
    let shabad_starting_time = req.body.shabad.shabad_starting_time;
    let shabad_ending_time = req.body.shabad.shabad_ending_time;
    let raagi_name = req.body.raagi_name;
    let recording_title = req.body.recording_title;
    let delete_recording = req.body.delete_recording;

    let command = "ffmpeg -y -i " + recording_title.replace(/ /g, "\\ ") + ".mp3 -ss "
        + shabad_starting_time + " -to " + shabad_ending_time
        + " -acoder copy " + shabad_english_title.replace(/ /g, "\\ ") + ".mp3";

    let log = child_process.execSync(command, { stdio: ['pipe', 'pipe', 'ignore']});

    upload_shabad(shabad_english_title, raagi_name, recording_title, delete_recording, res)

});

router.put('/addRecording', (req, res) => {
    Raagi.count({"raagi_name": req.body.raagi_name}, function(err, foundRaagi){
        if(err){
            res.json({"message": "Error finding Raagi. \n" + err});
        }else{
            if(foundRaagi === 0){
                res.json({"message": "Raagi not found. \n"});
            }else if(foundRaagi === 1){
                let recordingObj = {
                    "recording_title": req.body.recordings[0].recording_title,
                    "recording_url": req.body.recordings[0].recording_url,
                    "shabads": []
                };

                async.each(req.body.recordings[0].shabads, function(shabad, shabadCallback){
                    let shabadObj = {
                        "sathaayi_id": shabad.sathaayi_id,
                        "shabad_starting_time": shabad.shabad_starting_time,
                        "shabad_ending_time": shabad.shabad_ending_time
                    };
                    recordingObj.shabads.push(shabadObj);
                    add_shabad(shabad, shabadCallback);
                }, function(){
                    Raagi.update({'raagi_name': req.body.raagi_name}, {"$push": {"recordings": recordingObj}}, function (err, numAffected) {
                        if (err) {
                            res.json({"message": "Error updating the Raagi. \n" +err})
                        } else {
                            res.json({"message": "Successfully Added. \n" + numAffected});
                        }
                    });
                });
            }
        }
    });
});

router.put('/raagis/:raagi_name/recordings/:recording_title/addShabads', (req, res) => {

    let shabadsArr = [];

    async.each(req.body.shabads, function(shabad, shabadCallback){
        let shabadObj = {
            "sathaayi_id": shabad.sathaayi_id,
            "shabad_starting_time": shabad.shabad_starting_time,
            "shabad_ending_time": shabad.shabad_ending_time
        };
        shabadsArr.push(shabadObj);
        add_shabad(shabad, shabadCallback);
    }, function(){
        Raagi.update({'raagi_name': req.params.raagi_name,
                "recordings.recording_title": req.params.recording_title},
            {"$push": {"recordings.$.shabads": { $each:shabadsArr}}}, function(err, numAffected) {
                if (err) {
                    res.json({"message": "Error updating the Raagi. \n" +err})
                } else {
                    res.json(numAffected);
                }
            });
    });
});

function add_shabad(shabad, shabadCallback){
    let newShabad = new Shabad();
    newShabad.shabad_english_title = shabad.shabad_english_title;
    newShabad.sathaayi_id = shabad.sathaayi_id;
    newShabad.starting_id = shabad.starting_id;
    newShabad.ending_id = shabad.ending_id;

    Shabad.count({"sathaayi_id": newShabad.sathaayi_id}, function(err, foundShabad){
        if(err){
            console.log(err);
        }else{
            if(foundShabad === 0){
                newShabad.save(function(err){
                    if(err){
                        res.json(err);
                    }else{

                    }
                });
            }else if(foundShabad === 1){
            }
        }
        shabadCallback();
    });
}

function upload_shabad(shabad_english_title, raagi_name, recording_title, delete_recording, res){
    let s3 = new AWS.S3();
    fs.readFile(shabad_english_title + ".mp3", function(err, data){
       if(err){
           console.log(err);
       } else{
           let params = {
               Bucket: "vismaadbani/vismaaddev/Raagis/" + raagi_name + "/" + recording_title,
               Key: shabad_english_title + ".mp3",
               Body: data,
               ACL:'public-read',
               ContentType: "audio/mpeg"
           };
           s3.putObject(params, function(err, data){
               if(delete_recording === true){
                   fs.unlink(shabad_english_title + ".mp3");
                   fs.unlink(recording_title + ".mp3");
                   res.json("Shabad uploaded and recording has been deleted!")
               }else{
                   fs.unlink(shabad_english_title + ".mp3");
                   res.json("Shabad uploaded!")
               }
           });
       }
    });
}

function compare(a, b){
    if (a.raagi_name < b.raagi_name)
        return -1;
    if (a.raagi_name > b.raagi_name)
        return 1;
    return 0;
}

function diff(start, end) {
    start = start.split(":");
    end = end.split(":");
    var startDate = new Date(0, 0, 0, start[0], start[1], 0);
    var endDate = new Date(0, 0, 0, end[0], end[1], 0);
    var diff = endDate.getTime() - startDate.getTime();
    var hours = Math.floor(diff / 1000 / 60 / 60);
    diff -= hours * 1000 * 60 * 60;
    var minutes = Math.floor(diff / 1000 / 60);

    return (hours < 9 ? "0" : "") + hours + ":" + (minutes < 9 ? "0" : "") + minutes;
}

function addInMinutes(shabadTimeArr){
    let totalMinutes = 0, totalSeconds = 0;
    for(let i = 0; i < shabadTimeArr.length; i++){
        let mmss = shabadTimeArr[i].split(":");
        totalMinutes += parseInt(mmss[0]);
        totalSeconds += parseInt(mmss[1]);
    }

    //console.log(totalMinutes + " " + totalSeconds);
    totalMinutes += Math.ceil(totalSeconds/60);
    return totalMinutes;

}

function compareByShabadName(a, b){
    if (a.shabad_english_title < b.shabad_english_title)
        return -1;
    if (a.shabad_english_title > b.shabad_english_title)
        return 1;
    return 0;
}

module.exports = router;