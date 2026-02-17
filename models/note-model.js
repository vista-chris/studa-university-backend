const mongoose = require('mongoose');
const Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

const noteSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    remarks: {
        type: String
    },
    unit: {
        type: ObjectId,
        required: true
    },
    fileId: {
        type: ObjectId,
        ref: 'File'
    }
}, { timestamps: true });

const Note = mongoose.model('note', noteSchema);

module.exports = Note;
