const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShabadSchema = new Schema({
    _id: {type: Number},
    shabad_english_title: {type: String},
    starting_id: {type: Number},
    ending_id: {type: Number},
    shabad_checked: {type: Boolean, default: false},
    kirtan_id: {type: Number},
    moment: {type: String},
    date_added: {type: Date, default: Date.now}
});


module.exports = mongoose.model('Shabad', ShabadSchema);