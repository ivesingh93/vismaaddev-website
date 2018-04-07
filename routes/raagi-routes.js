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
                    raagi_name: raagi.raagi_name,
                    shabads_count: 0,
                    raagi_image_url: raagi.raagi_image_url,
                    minutes_of_shabads: 0
                };
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

router.get('/shabads', (req, res) => {
    Shabad.find({}, function(err, shabads){
        if(err){
            res.json(err);
        }else{
            res.json(shabads);
        }
    });
});

router.get('/shabadsWithNoThemes', (req, res) => {
   Shabad.find({"shabad_theme": "none"}, function(err, shabads){
       if(err){
           res.json(err);
       }else{
           res.json(shabads.sort(compareByShabadName));
       }
   });
});

router.get('/shabads/:sathaayi_id', (req, res) => {
   let sathaayi_id = parseInt(req.params.sathaayi_id);

   Shabad.findOne({"sathaayi_id": sathaayi_id}, function(err, foundShabad){
      if(err) throw err;

      if(foundShabad !== null){
          res.json(foundShabad);
      }else{
          res.json("Shabad not found");
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
                                    "shabad_url": "https://s3.amazonaws.com/vismaadbani/vismaaddev/Raagis/" +
                                    req.params.raagi_name + "/" + foundShabad.shabad_english_title + ".mp3"

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
                           "shabad_checked": foundShabad.shabad_checked,
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

router.get('/shabads/:sathaayi_id/raagis', (req, res) => {
    let sathaayi_id = req.params.sathaayi_id;
    let raagis_arr = [];


    Raagi.find({"recordings.shabads": {"$elemMatch": {"sathaayi_id": sathaayi_id}}}, {raagi_name: 1, _id: 0}, function(err, raagis){
        let raagis_arr = [];
        for(let raagi of raagis){
            raagis_arr.push(raagi.raagi_name);
        }
        res.json(raagis_arr);
      // for(let raagi of raagis){
      //     for(let recording of raagi.recordings){
      //         for(let shabad of recording.shabads){
      //             console.log(shabad.sathaayi_id + " " + sathaayi_id);
      //             if(shabad.sathaayi_id == sathaayi_id){
      //
      //                 let obj = {
      //                     raagi_name: raagi.raagi_name,
      //                     recording_title: recording.recording_title
      //                 };
      //                 raagis_arr.push(obj);
      //                 break;
      //             }
      //         }
      //     }
      // }

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
                raagi.raagi_image_url = "https://s3.amazonaws.com/vismaadbani/vismaaddev/Raagis Photos/" + raagi.raagi_name + ".jpg";
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



    Shabad.update({"starting_id": starting_id, "ending_id": ending_id}, {$set: {"shabad_checked": true}}, {multi: true}, function(err, numAffected){
        console.log(numAffected);
        upload_shabad(shabad_english_title, raagi_name, res)
    });


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

router.put('/changeShabadTitle', (req, res) => {
    let sathaayi_id = req.body.sathaayi_id;
    let shabad_english_title = req.body.shabad_english_title;

    Shabad.update({"sathaayi_id": sathaayi_id}, {$set: {"shabad_english_title": shabad_english_title}}, function(err, numAffected){
        if(err) throw err;

        res.json("Shabad Title Changed");
    });
});

router.put('/changeStartingID', (req, res) => {
    let original_starting_id = req.body.original_starting_id;
    let new_starting_id = req.body.new_starting_id;

    Shabad.update({"starting_id": original_starting_id}, {$set: {"starting_id": new_starting_id}}, {multi: true}, function(err, numAffected){
        if(err) throw err;
        console.log(numAffected);
        res.json("Starting ID Changed");
    });
});

router.put('/changeEndingID', (req, res) => {
    let original_ending_id = req.body.original_ending_id;
    let new_ending_id = req.body.new_ending_id;

    Shabad.update({"ending_id": original_ending_id}, {$set: {"ending_id": new_ending_id}}, {multi: true}, function(err, numAffected){
        if(err) throw err;
        console.log(numAffected);
        res.json("Ending ID Changed");
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

function upload_shabad(shabad_english_title, raagi_name, res){
    let s3 = new AWS.S3();
    fs.readFile(shabad_english_title + ".mp3", function(err, data){
       if(err){
           console.log(err);
       } else{
           let params = {
               Bucket: "vismaadbani/vismaaddev/Raagis/" + raagi_name,
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