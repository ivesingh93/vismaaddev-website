const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShabadSchema = new Schema({
    shabad_english_title: {type: String},
    sathaayi_id: {type: Number},
    starting_id: {type: Number},
    ending_id: {type: Number},
    shabad_checked: {type: Boolean, default: false},
    shabad_theme: [{type: String, default: "none"}],
    kirtan_id: {type: Number},
    date_added: {type: Date, default: Date.now}
});


module.exports = mongoose.model('Shabad', ShabadSchema);