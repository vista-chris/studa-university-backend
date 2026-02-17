const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sponsorshipSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Sponsorship = mongoose.model('sponsorship', sponsorshipSchema);

module.exports = Sponsorship;
