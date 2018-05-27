const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/database');
const Schema = mongoose.Schema;


/*

    Account ID: Unique Account ID.
                    If user registers with an email, this will be an email.
                    If user registers with Facebook, this will be either an email or some sort of unique id
                    If user registers with Gmail, this will be an email

    Date Added: Date the account was created
    Username: User's unique username
    Password: This is only if the user signs up using an email.
    First Name: The first name of the user may be taken from registration form, Facebook/Google Authentication.
    Last Name: The first name of the user may be taken from registration form, Facebook/Google Authentication.
    Date of Birth: DoB of the user
    Gender: Gender of the user
    Source of Login: This will be either, Email or Google or Facebook

 */
const UserSchema = new Schema({
    account_id: {type: String, unique: true},
    date_added: {type: Date, default: Date.now},
    username: {type: String},
    password: {type: String},
    first_name: {type: String},
    last_name: {type: String},
    dob: {type: Date},
    gender: {type: String},
    source_of_login: {type: String},
    playlists: [{
        playlist_name: {type: String},
        shabads: [{
            raagi_name: {type: String},
            shabad_english_title: {type: String},
            sathaayi_id: {type: Number},
            starting_id: {type: Number},
            ending_id: {type: Number},
            shabad_url: {type: String},
        }]
    }]

});

//Creating variable so it can be used outside.
const User = module.exports = mongoose.model('User', UserSchema);

//Get the user by an account id
module.exports.getUserById = function(account_id, callback){
    let query = {
        account_id: account_id
    };
    User.findOne(query, callback);
};

//Get the user by username
module.exports.getUserByUsername = function(username, callback){
    let query = {
        username: username
    };
    User.findOne(query, callback);
};

module.exports.addUser = function(newUser, callback) {

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser.save(callback);
        });
    });
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
 bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
     if (err) throw err;
     callback(null, isMatch);
 });
}