const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const hostelSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    location: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Mixed'],
        required: true
    },
    type: {
        type: String,
        enum: ['On-Campus', 'Off-Campus'],
        required: true
    },
    capacity: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Hostel = mongoose.model('hostel', hostelSchema);

module.exports = Hostel;
