const mongoose = require('mongoose');
const Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

//attendanceRecord Schema
const attendanceRecordSchema = new Schema({
    unit: {
        type: ObjectId,
        required: true
    },
    code: {
        type: String,
        required: true
    }
}, { timestamps: true });

const AttendanceRecord = mongoose.model('attendanceRecord', attendanceRecordSchema);

//attendanceDetail collection
const attendanceDetailSchema = new Schema({
    attendance: {
        type: ObjectId,
        required: true
    },
    student: {
        type: ObjectId,
        required: true
    },
    status: {
        type: Boolean,
        default: false,
        required: true
    }
}, { timestamps: true });

const AttendanceDetail = mongoose.model('attendanceDetail', attendanceDetailSchema);

module.exports = { AttendanceRecord, AttendanceDetail };
