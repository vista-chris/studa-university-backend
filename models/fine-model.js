const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const fineSchema = new Schema({
    student: {
        type: ObjectId,
        ref: 'student',
        required: true,
        index: true
    },
    borrowRecord: {
        type: ObjectId,
        ref: 'borrowRecord',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    reason: {
        type: String,
        enum: ['overdue', 'damaged', 'lost'],
        required: true
    },
    daysOverdue: {
        type: Number,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'waived'],
        default: 'pending',
        index: true
    },
    paidDate: {
        type: Date,
        default: null
    },
    paidAmount: {
        type: Number,
        min: 0,
        default: 0
    },
    waivedBy: {
        type: ObjectId,
        ref: 'user',
        default: null
    },
    waivedReason: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Compound index for student fines queries
fineSchema.index({ student: 1, status: 1 });

const Fine = mongoose.model('fine', fineSchema);

module.exports = Fine;
