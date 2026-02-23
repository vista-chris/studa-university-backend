const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const accommodationAllocationSchema = new Schema({
    student: {
        type: ObjectId,
        ref: 'student',
        required: true
    },
    room: {
        type: ObjectId,
        ref: 'room',
        required: true
    },
    semester: {
        type: ObjectId,
        ref: 'semester',
        required: true
    },
    checkInDate: {
        type: Date,
        default: Date.now
    },
    checkOutDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Cancelled'],
        default: 'Active'
    }
}, { timestamps: true });

const Allocation = mongoose.model('accommodationAllocation', accommodationAllocationSchema);

module.exports = Allocation;
