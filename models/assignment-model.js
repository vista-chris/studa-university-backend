const mongoose = require('mongoose')

const assignmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    instructions: { type: String, required: true },
    file: { type: String },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    deadline: { type: String, required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'offeredUnit', required: true }
}, { timestamps: true })

module.exports = mongoose.model('Assignment', assignmentSchema)
