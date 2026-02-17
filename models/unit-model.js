const mongoose = require('mongoose');
const Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

//unit collection
const unitSchema = new Schema({
    code: {
        type: String,
        unique: true,
        uppercase: true,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    course: {
        type: ObjectId,
        ref: 'course',
        required: true
    },
    session: {
        type: String,
        required: true
    },
    lecturer: {
        type: ObjectId,
        ref: 'user',
        required: true
    },
    status: {
        type: Boolean,
        required: true
    },
    creditHours: {
        type: Number,
        default: 3,
        required: true
    }
}, { timestamps: true })

const Unit = mongoose.model('unit', unitSchema);

//offeredUnit collection
const offeredUnitSchema = new Schema({
    unit: {
        type: ObjectId,
        ref: 'unit',
        required: true
    },
    students: {
        type: Number,
        default: 0,
        required: true
    },
    period: {
        type: ObjectId,
        ref: 'period',
        required: true
    },
    lecturer: {
        type: ObjectId,
        ref: 'user',
        required: true
    }
}, { timestamps: true });

const OfferedUnit = mongoose.model('offeredUnit', offeredUnitSchema);

//unitReg collection
const unitRegSchema = new Schema({
    unit: {
        type: ObjectId,
        ref: 'offeredUnit',
        required: true
    },
    semester: {
        type: ObjectId,
        ref: 'semester',
        required: true
    }
}, { timestamps: true });

const UnitReg = mongoose.model('unitReg', unitRegSchema);

module.exports = { Unit, OfferedUnit, UnitReg };
