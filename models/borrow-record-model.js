const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const borrowRecordSchema = new Schema({
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
    borrowDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    dueDate: {
        type: Date,
        required: true,
        index: true
    },
    returnDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['borrowed', 'returned', 'overdue', 'lost'],
        default: 'borrowed',
        index: true
    },
    renewalCount: {
        type: Number,
        default: 0,
        min: 0
    },
    processedBy: {
        type: ObjectId,
        ref: 'user'
    },
    notes: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Compound indexes for common queries
borrowRecordSchema.index({ student: 1, status: 1 });
borrowRecordSchema.index({ book: 1, status: 1 });

const BorrowRecord = mongoose.model('borrowRecord', borrowRecordSchema);

module.exports = BorrowRecord;
