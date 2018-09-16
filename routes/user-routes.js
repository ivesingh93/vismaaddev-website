const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Pool, Client } = require('pg');
const config = require('../config/database');
const queries = require('../config/queries');

function initialize_client(){
    return new Client(config.vismaadnaad);
}

function initialize_pool(){
    return new Pool(config.vismaadnaad);
}

// Register users who are using Email
router.post('/signup', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {};

    if(req.body.source_of_account.toUpperCase() === "EMAIL"){
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
                if (err) throw err;
                let query = {
                    text: queries.SIGNUP_EMAIL,
                    values: [req.body.account_id, req.body.username, hash, req.body.first_name, req.body.last_name, req.body.source_of_account.toUpperCase()]
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
            text: queries.SIGNUP_NO_EMAIL,
            values: [req.body.account_id, req.body.username, req.body.first_name, req.body.last_name, req.body.source_of_account.toUpperCase()]
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
    console.log("hello1");
    if(source_of_account.toLowerCase() === "email"){
        console.log("hello2");
        query = {
            text: queries.AUTHENTICATE_EMAIL,
            values: [account_id, username]
        };
    }else if(source_of_account.toLowerCase() === "facebook" || source_of_account === "gmail"){
        console.log("hello3");
        query = {
            text: queries.AUTHENTICATE_NO_EMAIL,
            values: [account_id]
        };
    }

    client.query(query, (err, sqlResponse) => {
       if(err){
           console.log(err);
           res.send("Failure");
       } else{
           if(sqlResponse.rowCount > 0){

               if(source_of_account.toLowerCase() === "email"){
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
               }else if(source_of_account.toLowerCase() === "facebook" || source_of_account.toLowerCase() === "gmail"){
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
    client.query(queries.CREATE_PLAYLIST, [req.body.playlist_name, req.body.username], (err, sqlResponse) => {
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
    client.query(queries.DELETE_PLAYLIST, [req.body.playlist_name, req.body.username], (err, sqlResponse) => {
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
                await client.query(queries.ADD_SHABADS, [shabad.username, shabad.playlist_name, shabad.id]);
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
                await client.query(queries.REMOVE_SHABADS, [shabad.id, shabad.username, shabad.playlist_name]);
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

router.post('/likeShabad', (req, res) => {
    (async () => {
        const client = await initialize_pool().connect();
        try{
            await client.query('BEGIN');
            let username = req.body.username;
            let rrs_id = req.body.id;

            console.log(req.body);

            await client.query(queries.LIKE_SHABAD, [rrs_id, username]);

            await client.query(queries.LIKE_SHABAD_UPDATE_RAAGI_RECORDING_SHABAD, [rrs_id]);

            await client.query('COMMIT');
            res.json({
                "ResponseCode": 200,
                "Message": "Shabad liked successfully"
            })
        }catch(e){
            await client.query('ROLLBACK');
            throw e;
        }finally{
            client.release();
        }
    })().catch(e => console.error(e.stack));
});

router.post('/unlikeShabad', (req, res) => {
    (async () => {
        const client = await initialize_pool().connect();
        try{
            await client.query('BEGIN');
            let username = req.body.username;
            let rrs_id = req.body.id;

            console.log(req.body);

            await client.query(queries.UNLIKE_SHABAD, [rrs_id, username]);

            await client.query(queries.UNLIKE_SHABAD_UPDATE_RAAGI_RECORDING_SHABAD, [rrs_id]);

            await client.query('COMMIT');
            res.json({
                "ResponseCode": 200,
                "Message": "Shabad unliked successfully"
            })
        }catch(e){
            await client.query('ROLLBACK');
            throw e;
        }finally{
            client.release();
        }
    })().catch(e => console.error(e.stack));
});

router.get('/shabadLikes/:id', (req, res) => {
    let client = initialize_client();
    client.connect();
    client.query(queries.SHABAD_LIKES, [req.params.id], (err, sqlResponse) => {
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

router.get('/members/:username/shabadLikes/:id', (req, res) => {
   let client = initialize_client();
   client.connect();
   client.query(queries.MEMBERS_SHABAD_LIKES, [req.params.id, req.params.username], (err, sqlRes) => {
      if(err){
          console.log(err);
          res.json({
              "ResponseCode": 400,
              "Result": "Failure"
          });
      } else{
          if(sqlRes.rowCount === 1){
              res.json({
                  "ResponseCode": 200,
                  "Result": true
              });
          }else{
              res.json({
                  "ResponseCode": 200,
                  "Result": false
              });
          }
      }
   });
});


router.get('/users/:username/playlists', (req, res) => {
    console.log(req.params.username);
    let client = initialize_client();
    client.connect();
    let query = {
        text: queries.USERS_PLAYLISTS,
        values: [ req.params.username]
    };
    client.query(query, (err, sqlResponse) => {
        if(err){
            console.log(err);
            res.json('Failure');
        }else{
            res.send(sqlResponse.rows);
        }
        client.end();
    });
});

router.get('/users/:username/playlists/:playlist_name', (req, res) => {
    let client = initialize_client();
    client.connect();
    let query = {
        text: queries.USERS_PLAYLIST,
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