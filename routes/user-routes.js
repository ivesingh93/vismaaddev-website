const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/database');
const _ = require('underscore');

router.post('/signup', (req, res) => {
   let newUser = new User({
       account_id: req.body.account_id,
       username: req.body.username,
       password: req.body.password,
       first_name: req.body.first_name,
       last_name: req.body.last_name,
       source_of_login: req.body.source_of_login
   });

   // User.getUserById(newUser.account_id, (err, user) => {
   //      if(err) throw err;
   //      if(!user){
   //          User.getUserByUsername(newUser.username, (err, user) => {
   //              if(err) throw err;
   //              if(!user){
                    User.addUser(newUser, function(err) {
                        if (err) {
                            res.json({"message": "Error adding User. \n" + err});
                        } else {
                            res.json({"message": "User Added Successfully!"});
                        }
                    });
   //              }else{
   //                  res.json({"message": "The username entered has already been used!"});
   //              }
   //          });
   //      }else{
   //          res.json({"message": "The email entered has already been used!"});
   //      }
   // });




});

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

module.exports = router;