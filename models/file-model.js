const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['folder', 'image', 'pdf', 'text', 'excel', 'file']
    },
    size: {
        type: Number,
        default: 0
    },
    parentId: {
        type: String,
        default: 'root'
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Corrected to 'user' from 'User'
        required: true
    },
    path: {
        type: String,
        trim: true
    },
    isStarred: {
        type: Boolean,
        default: false
    },
    isInTrash: {
        type: Boolean,
        default: false
    },
    unitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'offeredUnit' // Corrected to 'offeredUnit' from 'OfferedUnit'
    },
    category: {
        type: String, // e.g., 'note', 'assignment'
        enum: ['note', 'assignment', 'other'],
        default: 'other'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('File', fileSchema);
