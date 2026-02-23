const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const hostelEventSchema = new Schema({
    hostel: {
        type: ObjectId,
        ref: 'hostel',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['Announcement', 'Event'],
        default: 'Announcement'
    },
    postedBy: {
        type: ObjectId,
        ref: 'user',
        required: true
    }
}, { timestamps: true });

const HostelEvent = mongoose.model('hostelEvent', hostelEventSchema);

module.exports = HostelEvent;
