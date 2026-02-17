const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const meetingSchema = new Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    unit: {
        type: Schema.Types.ObjectId,
        ref: 'offeredUnit',
        required: true
    },
    instructor: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active'
    },
    participants: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        student: {
            type: Schema.Types.ObjectId,
            ref: 'student'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

const Meeting = mongoose.model('meeting', meetingSchema);

module.exports = Meeting;
