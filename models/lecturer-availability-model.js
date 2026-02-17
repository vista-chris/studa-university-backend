const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const lecturerAvailabilitySchema = new Schema({
    lecturer: {
        type: ObjectId,
        ref: 'user',
        required: true
    },
    day: {
        type: String,
        required: true
    },
    start: {
        type: String,
        required: true
    },
    end: {
        type: String,
        required: true
    },
    period: {
        type: ObjectId,
        ref: 'period',
        required: true
    },
    available: {
        type: Boolean,
        required: true
    },
}, { timestamps: true });

const LecturerAvailability = mongoose.model('lecturerAvailability', lecturerAvailabilitySchema);

module.exports = LecturerAvailability;
