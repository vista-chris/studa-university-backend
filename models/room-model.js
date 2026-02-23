const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const roomSchema = new Schema({
    hostel: {
        type: ObjectId,
        ref: 'hostel',
        required: true
    },
    roomNumber: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    occupancy: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Available', 'Full', 'Maintenance'],
        default: 'Available'
    },
    price: {
        type: Number,
        required: true
    }
}, { timestamps: true });

// Ensure room numbers are unique within a hostel
roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model('room', roomSchema);

module.exports = Room;
