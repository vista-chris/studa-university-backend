const mongoose = require('mongoose');
const Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

const hallSchema = new Schema({
    code: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    capacity: {
        type: String,
        required: true
    },
    faculty: {
        type: ObjectId,
        ref: 'faculty',
        required: true
    }
}, { timestamps: true });

const Hall = mongoose.model('hall', hallSchema);

module.exports = Hall;
