const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const facultySchema = new Schema({
    code: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Faculty = mongoose.model('faculty', facultySchema);

module.exports = Faculty;
