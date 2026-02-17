const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const retakeSchema = new Schema({
    student: {
        type: ObjectId,
        ref: 'student',
        required: true
    },
    unit: {
        type: ObjectId,
        ref: 'unit',
        required: true
    },
    period: {
        type: ObjectId,
        ref: 'period', // Current period applying for
        required: true
    },
    originalReg: {
        type: ObjectId,
        ref: 'unitReg', // Reference to the previous attempt
        required: false
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    }
}, { timestamps: true });

const Retake = mongoose.model('retake', retakeSchema);

module.exports = Retake;
