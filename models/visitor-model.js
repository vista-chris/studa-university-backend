const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const visitorSchema = new Schema({
    student: {
        type: ObjectId,
        ref: 'student',
        required: true
    },
    hostel: {
        type: ObjectId,
        ref: 'hostel',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    idNumber: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String
    },
    checkIn: {
        type: Date,
        default: Date.now
    },
    checkOut: {
        type: Date
    },
    purpose: {
        type: String
    }
}, { timestamps: true });

const Visitor = mongoose.model('visitor', visitorSchema);

module.exports = Visitor;
