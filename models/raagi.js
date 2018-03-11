const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RaagiSchema = new Schema({
    raagi_name: {type: String},
    raagi_image_url: {type: String, default: "https://s3.amazonaws.com/vismaadbani/vismaaddev/Raagis+Photos/No+Raagi.jpg"},
    date_added: {type: Date, default: Date.now},
    recordings: [{
        date_added: {type: Date, default: Date.now},
        recording_title: {type: String},
        recording_date: {type: String},
        recording_url: {type: String},
        shabads: [{
            sathaayi_id: {type: Number},
            date_added: {type: Date, default: Date.now},
            shabad_starting_time: {type: String},
            shabad_ending_time: {type: String},
            length: {type: String},
            shabad_url: {type: String},
            up_vote_count: {type: Number},
            downloaded_count: {type: Number}
        }]
    }]

});


module.exports = mongoose.model('Raagi', RaagiSchema);