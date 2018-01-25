const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/database');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    account_id: {type: String},
    date_added: {type: Date, default: Date.now},
    username: {type: String},
    password: {type: String},
    first_name: {type: String},
    last_name: {type: String},
    dob: {type: Date},
    gender: {type: String},
    source_of_login: {type: String}

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