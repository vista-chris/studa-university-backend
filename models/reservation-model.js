const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const reservationSchema = new Schema({
    student: {
        type: ObjectId,
        ref: 'student',
        required: true,
        index: true
    },
    book: {
        type: ObjectId,
        ref: 'book',
        required: true,
        index: true
    },
    reservationDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true,
        default: function () {
            // Default to 7 days from now
            const date = new Date();
            date.setDate(date.getDate() + 7);
            return date;
        }
    },
    status: {
        type: String,
        enum: ['active', 'fulfilled', 'expired', 'cancelled'],
        default: 'active',
        index: true
    },
    notified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Compound indexes for queries
reservationSchema.index({ student: 1, status: 1 });
reservationSchema.index({ book: 1, status: 1 });

const Reservation = mongoose.model('reservation', reservationSchema);

module.exports = Reservation;
