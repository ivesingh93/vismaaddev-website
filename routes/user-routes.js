const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Pool, Client } = require('pg');
const config = require('../config/database');

function initialize_client(){
    return new Client(config.vismaadnaad);
}

function initialize_pool(){
    return new Pool(config.vismaadnaad);
}

/*

{
  "account_id": "mraval.singh@gmail.com",
  "username": "ivesingh",
  "password": "9april1993",
  "dob": "04/09/1993",
  "gender": "Male",
  "first_name": "Ivkaran",
  "last_name": "Singh",
  "source_of_login": "Email"
}
 */

// Register users who are using Email
router.post('/signup', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {};

    if(req.body.hasOwnProperty("password")){
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
                if (err) throw err;
                let query = {
                    text: "insert into member (account_id, username, password_hash, first_name, last_name, source_of_account) " +
                    "values ($1, $2, $3, $4, $5, $6)",
                    values: [req.body.account_id, req.body.username, hash, req.body.first_name, req.body.last_name, req.body.source_of_login.toUpperCase()]
                };
                client.query(query, (err, sqlResponse) => {
                    if (err){
                        if (err.constraint === "member_username_key"){
                            res.json({
                                "ResponseCode": 400,
                                "Message": "Username already exists"
                            });
                        }else if(err.constraint === "member_account_id_key"){
                            res.json({
                                "ResponseCode": 400,
                                "Message": "Account already exists"
                            });
                        }else{
                            res.json({
                                "ResponseCode": 400,
                                "Error": err
                            });
                        }
                    }else{
                        res.json({
                            "ResponseCode": 200,
                            "Message": "User Added Successfully"
                        });
                    }
                    client.end();
                });
            });
        });
    }else{
        let query = {
            text: "insert into member (account_id, username, first_name, last_name, source_of_account) " +
            "values ($1, $2, $3, $4, $5)",
            values: [req.body.account_id, req.body.username, req.body.first_name, req.body.last_name, req.body.source_of_login.toUpperCase()]
        };

        client.query(query, (err, sqlResponse) => {
            if (err){
                if (err.constraint === "member_username_key"){
                    res.json({
                        "ResponseCode": 400,
                        "Message": "Username already exists"
                    });
                }else if(err.constraint === "member_account_id_key"){
                    res.json({
                        "ResponseCode": 400,
                        "Message": "Account already exists"
                    });
                }else{
                    res.json({
                        "ResponseCode": 400,
                        "Error": err
                    });
                }
            }else{
                res.json({
                    "ResponseCode": 200,
                    "Message": "User Added Successfully"
                });
            }
            client.end();
        });
    }


});

router.post('/authenticate', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let source_of_account = req.body.source_of_account;
    let account_id = req.body.account_id;

    let client = initialize_client();
    client.connect();
    let query = {};
    if(source_of_account === "EMAIL"){
        query = {
            text: "select account_id, password_hash, first_name, last_name, username from member where LOWER(account_id) LIKE LOWER($1) or LOWER(username) LIKE LOWER($2)",
            values: [account_id, username]
        };
    }else if(source_of_account === "FACEBOOK" || source_of_account === "GMAIL"){
        query = {
            text: "select account_id, first_name, last_name, username from member where LOWER(account_id) LIKE LOWER($1)",
            values: [account_id, username]
        };
    }

    client.query(query, (err, sqlResponse) => {
       if(err){
           console.log(err);
           res.send("Failure");
       } else{
           if(sqlResponse.rowCount > 0){

               if(source_of_account === "EMAIL"){
                   bcrypt.compare(password, sqlResponse.rows[0].password_hash, (err, isMatch) => {
                       if (err){
                           res.json({
                               "ResponseCode": 400,
                               "Message": err
                           });
                       }
                       if(isMatch){
                           res.json({
                               "ResponseCode": 200,
                               "Message": "Login successful",
                               "account_id": sqlResponse.rows[0].account_id,
                               "first_name": sqlResponse.rows[0].first_name,
                               "last_name": sqlResponse.rows[0].last_name,
                               "username": sqlResponse.rows[0].username
                           });
                       } else{
                           res.json({
                               "ResponseCode": 400,
                               "Message": "Invalid Login"
                           });
                       }
                   });
               }else if(source_of_account === "FACEBOOK" || source_of_account === "GMAIL"){
                   res.json({
                       "ResponseCode": 200,
                       "Message": "Login successful",
                       "account_id": sqlResponse.rows[0].account_id,
                       "first_name": sqlResponse.rows[0].first_name,
                       "last_name": sqlResponse.rows[0].last_name,
                       "username": sqlResponse.rows[0].username
                   });
               }
           }else{
               res.json({
                   "ResponseCode": 400,
                   "Message": "Invalid Login"
               });
           }
       }
        client.end();
    });
});

// =================================================== REST FOR PLAYLIST ===============================================

router.post('/createPlaylist', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query("insert into playlist (name, member_id) values ($1, (select id from member where LOWER(username) LIKE LOWER($2)))", [req.body.playlist_name, req.body.username], (err, sqlResponse) => {
        if(err){
            res.json({
                "ResponseCode": 400,
                "Message": "Error creating playlist"
            });
        }else{
            res.json({
                "ResponseCode": 200,
                "Message": "Playlist created successfully"
            });
        }
        client.end();
    });
});

router.post('/deletePlaylist', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query("delete from playlist where name=$1 and member_id=(select id from member where LOWER(username) LIKE LOWER($2))", [req.body.playlist_name, req.body.username], (err, sqlResponse) => {
        if(err){
            console.log(err);
            res.json({
                "ResponseCode": 400,
                "Message": "Error deleting playlist"
            });
        }else{
            res.json({
                "ResponseCode": 200,
                "Message": "Playlist deleted successfully"
            });
        }
        client.end();
    });
});

router.post('/addShabads', (req, res) => {
    (async () => {
        const client = await initialize_pool().connect();
        try{
            await client.query('BEGIN');
            for(let shabad of req.body){
                await client.query("insert into playlist_shabad (playlist_id, raagi_recording_shabad_id) values ((select id from playlist where member_id=(select id from member where LOWER(username) LIKE LOWER($1)) and name=$2), $3)",
                    [shabad.username, shabad.playlist_name, shabad.id]);
            }
            await client.query('COMMIT');
            res.json({
                "ResponseCode": 200,
                "Message": "Shabad(s) added successfully"
            });
        }catch(e){
            await client.query('ROLLBACK');
            throw e
        }finally{
            client.release();
        }
    })().catch(e => console.error(e.stack));

});

router.post('/removeShabads', (req, res) => {
    (async () => {
        const client = await initialize_pool().connect();
        try{
            await client.query('BEGIN');
            for(let shabad of req.body){
                await client.query("delete from playlist_shabad where raagi_recording_shabad_id=$1 and playlist_id=(select id from playlist where member_id=(select id from member where LOWER(username) LIKE LOWER($2)) and name=$3)",
                    [shabad.id, shabad.username, shabad.playlist_name]);
            }
            await client.query('COMMIT');
            res.json({
                "ResponseCode": 200,
                "Message": "Shabad(s) removed successfully"
            });
        }catch(e){
            await client.query('ROLLBACK');
            throw e
        }finally{
            client.release();
        }
    })().catch(e => console.error(e.stack));
});

router.get('/users/:username/playlists', (req, res) => {
    console.log(req.params.username);
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select name from playlist where member_id=(select id from member where LOWER(username) LIKE LOWER($1))",
        values: [ req.params.username]
    };
    client.query(query, (err, sqlResponse) => {
        if(err){
            console.log(err);
            res.json('Failure');
        }else{
            let playlists = [];
            for(let row of sqlResponse.rows){
                playlists.push(row.name);
            }
            res.send(playlists);
            console.log(sqlResponse);
        }
        client.end();
    });
});

router.get('/users/:username/playlists/:playlist_name', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select rrs.id, raagi.name as raagi_name, recording.title as recording_title, shabad.sathaayi_title as shabad_english_title, " +
        "concat('https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/',rrs.raagi_id, '/', rrs.shabad_id, '.mp3') as shabad_url, " +
        "to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id " +
        "from playlist as p " +
        "join playlist_shabad as ps on p.id = ps.playlist_id " +
        "join raagi_recording_shabad as rrs on ps.raagi_recording_shabad_id = rrs.id " +
        "join raagi on raagi.id = rrs.raagi_id " +
        "join recording on recording.id = rrs.recording_id " +
        "join shabad on rrs.shabad_id=shabad.id " +
        "join shabad_info on shabad.shabad_info_id=shabad_info.id " +
        "where p.member_id=(select id from member where LOWER(username) LIKE LOWER($1)) and p.name=$2 order by rrs.shabad_id",
        values: [ req.params.username, req.params.playlist_name]
    };
    client.query(query, (err, sqlResponse) => {
        if(err){
            console.log(err);
            res.json('Failure');
        }else{
            res.send(sqlResponse.rows);
            console.log(sqlResponse);
        }
        client.end();
    });
});

module.exports = router;