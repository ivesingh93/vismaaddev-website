const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Pool, Client } = require('pg');
const config = require('../config/database');

function initialize_client(){
    return new Client(config.database);
}

function initialize_pool(){
    return new Pool(config.database);
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
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            if (err) throw err;
            let query = {
                text: "insert into member (account_id, username, password_hash, first_name, last_name, date_of_birth, gender, source_of_account) " +
                "values ($1, $2, $3, $4, $5, $6, $7, $8)",
                values: [req.body.account_id, req.body.username, hash, req.body.first_name, req.body.last_name, req.body.dob, req.body.gender, req.body.source_of_login]
            };
            client.query(query, (err, sqlResponse) => {
                if (err){
                    console.log(err.constraint);
                    if (err.constraint === "member_username_key"){
                        res.json({
                            "ResponseCode": 400,
                            "Message": "Username already exists"
                        });
                    }else if(err.constraint === "member_pkey"){
                        res.json({
                            "ResponseCode": 400,
                            "Message": "Email already exists"
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
});

router.post('/authenticate', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select password_hash from member where account_id=$1 or username=$2",
        values: [req.body.account_id, req.body.username]
    };

    client.query(query, (err, sqlResponse) => {
       if(err){
           console.log(err);
           res.send("Failure");
       } else{
           if(sqlResponse.rowCount > 0){
               bcrypt.compare(req.body.password, sqlResponse.rows[0].password_hash, (err, isMatch) => {
                   if (err){
                       res.json({
                           "ResponseCode": 400,
                           "Message": err
                       });
                   }
                   if(isMatch){
                       res.json({
                           "ResponseCode": 200,
                           "Message": "Login successful"
                       });
                   } else{
                       res.json({
                           "ResponseCode": 400,
                           "Message": "Invalid Login"
                       });
                   }
               });
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
    client.query("insert into playlist (name, username) values ($1, $2)", [req.body.playlist_name, req.body.username], (err, sqlResponse) => {
        if(err){
            console.log(err);
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
    client.query("delete from playlist where name=$1 and username=$2", [req.body.playlist_name, req.body.username], (err, sqlResponse) => {
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
                await client.query("insert into playlist_shabad (playlist_id, raagi_recording_shabad_id) values ((select id from playlist where username=$1 and name=$2), $3)",
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
                await client.query("delete from playlist_shabad where raagi_recording_shabad_id=$1 and playlist_id=(select id from playlist where username=$2 and name=$3)",
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
    let client = initialize_client();
    client.connect();
    let query = {
        text: "select name from playlist where username=$1",
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
        text: "select rrs.id, rrs.raagi_name, rrs.recording_title, rrs.shabad_sathaayi_title as shabad_english_title, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id " +
        "from playlist as p " +
        "join playlist_shabad as ps on p.id = ps.playlist_id " +
        "join  raagi_recording_shabad as rrs on ps.raagi_recording_shabad_id = rrs.id " +
        "join shabad on rrs.shabad_sathaayi_title=shabad.sathaayi_title " +
        "join shabad_info on shabad.sathaayi_id=shabad_info.sathaayi_id " +
        "where username=$1 and name=$2 order by rrs.shabad_sathaayi_title",
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