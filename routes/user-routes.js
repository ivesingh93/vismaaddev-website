const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/database');
const _ = require('underscore');



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
   let newUser = new User({
       account_id: req.body.account_id,
       username: req.body.username,
       password: req.body.password,
       first_name: req.body.first_name,
       last_name: req.body.last_name,
       source_of_login: req.body.source_of_login
   });

   User.getUserById(newUser.account_id, (err, user) => {
        if(err) throw err;
        if(!user){
            User.getUserByUsername(newUser.username, (err, user) => {
                if(err) throw err;
                if(!user){
                    User.addUser(newUser, function(err) {
                        if (err) {
                            res.json({"message": "Error adding User. \n" + err});
                        } else {
                            res.json({"message": "User Added Successfully!"});
                        }
                    });
                }else{
                    res.json({"message": "The username entered has already been used!"});
                }
            });
        }else{
            res.json({"message": "The email entered has already been used!"});
        }
   });

});

/*
router.get('/accounts/:account_id', (req, res) => {
    User.getUserById(req.params.account_id, function(err, user) {
        if(err){
            res.send(err);
        }else{
            if(!user){
                res.send({"message": "Account not found."})
            }else{
                res.send({"message": "The account already exists."})
            }
        }
    })
});

router.get('/usernames/:username', (req, res) => {
    User.getUserByUsername(req.params.username, function(err, user) {
        if(err){
            res.send(err);
        }else{
            if(!user){
                res.send({"message": "User not found."})
            }else{
                res.send({"message": "The username has already been used."})
            }
        }
    })
});
*/

// Authenticate users who registered via Email.
router.post('/authenticate', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.getUserByUsername(username, (err, user) => {
        if (err) throw err;
        if(!user){
            return res.json({message: "User not found"});
        }

        User.comparePassword(password, user.password, (err, isMatch) => {
            if(err) throw err;
            if(isMatch){
                const token = jwt.sign({data: user}, config.secret, {
                    expiresIn: 604800
                });

                res.json({
                    token: 'Bearer ' + token,
                    message: "Login successful.",
                    user: {
                        id: user._id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        username: user.username,
                        email: user.email
                    }
                });
            } else{
                return res.json({message: 'Wrong Password'});
            }
        });
    });
});

router.get('/profile', passport.authenticate('jwt', {session: false}), (req, res) => {
    res.json({user: req.user});
});

// =================================================== REST FOR PLAYLIST ===============================================

// Create a Playlist Name only
router.post('/createPlaylist', (req, res) => {
    let account_id = req.body.account_id;
    let playlist_name = req.body.playlist_name;

    // Add a unique playlist_name here with no shabads.
    User.update({"account_id": account_id}, {$push: {"playlists": {"playlist_name": playlist_name}}}, (req, response) => {
        res.send("Playlist created successfully!");
    });

});

// Add shabads to the Existing Playlist
router.post('/addShabad', (req, res) => {
    let account_id = req.body.account_id;
    let playlist_name = req.body.playlist_name;
    let raagi_name = req.body.raagi_name;
    let sathaayi_id = req.body.sathaayi_id;
    let shabad_english_title = req.body.shabad_english_title;
    let starting_id = req.body.starting_id;
    let ending_id = req.body.ending_id;
    let shabad_url = req.body.shabad_url;

    let shabadObj = {
        'raagi_name': raagi_name,
        'sathaayi_id': sathaayi_id,
        'shabad_english_title': shabad_english_title,
        'starting_id': starting_id,
        'ending_id': ending_id,
        'shabad_url': shabad_url
    };

    // Add a shabad to the existing Playlist.
    User.update({"account_id": account_id, "playlists.playlist_name": playlist_name},
        {$push: {"playlists.$.shabads": shabadObj}}, (req, response) => {
        res.send("Shabad added successfully!");
    });

});

// Remove shabad from an Existing Playlist
router.post('/removeShabad', (req, res) => {
    let account_id = req.body.account_id;
    let playlist_name = req.body.playlist_name;
    let raagi_name = req.body.raagi_name;
    let sathaayi_id = req.body.sathaayi_id;
    let shabad_english_title = req.body.shabad_english_title;
    let starting_id = req.body.starting_id;
    let ending_id = req.body.ending_id;
    let shabad_url = req.body.shabad_url;

    let shabadObj = {
        'raagi_name': raagi_name,
        'sathaayi_id': sathaayi_id,
        'shabad_english_title': shabad_english_title,
        'starting_id': starting_id,
        'ending_id': ending_id,
        'shabad_url': shabad_url
    };

    // Find if shabad is in there and remove the shabad from the playlist.
    User.update({"account_id": account_id, "playlists.playlist_name": playlist_name},
        {$pull: {"playlists.$.shabads": shabadObj}}, (req, response) => {
        res.send("Shabad removed successfully!");
    });
});

router.post('/deletePlaylist', (req, res) => {
    let account_id = req.body.account_id;
    let playlist_name = req.body.playlist_name;

    // Find if the playlist exists and then delete the entire playlist.
    User.update({"account_id": account_id}, {$pull: {"playlists": {"playlist_name": playlist_name}}}, (req, response) => {
        res.send("Playlist deleted successfully!");
    });

});

router.get('/users/:account_id/playlists', (req, res) => {
   let account_id = req.params.account_id;

   User.findOne({"account_id": account_id}, (err, user) => {
       console.log(user.playlists);
       res.send(user.playlists);
   })
});

module.exports = router;