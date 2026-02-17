const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const structureSchema = new Schema({
    course: {
        type: ObjectId,
        ref: 'course', // Added ref for easier population in the new backend
        required: true
    },
    session: {
        type: String,
        required: true
    },
    // Fee breakdown fields
    tuition: { type: Number, default: 0 },
    examination: { type: Number, default: 0 },
    libraryICT: { type: Number, default: 0 },
    lab: { type: Number, default: 0 },
    registration: { type: Number, default: 0 },
    studentID: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    caution: { type: Number, default: 0 },
    activitySports: { type: Number, default: 0 },
    graduation: { type: Number, default: 0 },
    attachment: { type: Number, default: 0 },
    professionalAttire: { type: Number, default: 0 },
    booksSupplies: { type: Number, default: 0 },
    // Total fields
    academics: {
        type: Number,
        required: true
    },
    accommodation: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Structure = mongoose.model('structure', structureSchema);

const academicSchema = new Schema({
    semester: {
        type: ObjectId,
        ref: 'semester',
        required: true
    },
    payable: {
        type: Number,
        required: true
    },
    paid: {
        type: Number,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    excess: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Academic = mongoose.model('academic', academicSchema);

const accomodationSchema = new Schema({
    semester: {
        type: ObjectId,
        ref: 'semester',
        required: true
    },
    payable: {
        type: Number,
        required: true
    },
    paid: {
        type: Number,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    excess: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Accomodation = mongoose.model('accomodation', accomodationSchema);

module.exports = { Structure, Academic, Accomodation };
