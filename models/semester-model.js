const mongoose = require('mongoose');
const Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

const semesterSchema = new Schema({
    session: {
        type: String,
        required: true
    },
    period: {
        type: ObjectId,
        ref: 'period',
        required: true
    },
    hostel: {
        type: Boolean,
        required: true
    },
    student: {
        type: ObjectId,
        ref: 'student',
        required: true
    },
    structure: {
        type: ObjectId,
        ref: 'structure',
        required: true
    }
}, { timestamps: true });

const Semester = mongoose.model('semester', semesterSchema);

module.exports = Semester;
