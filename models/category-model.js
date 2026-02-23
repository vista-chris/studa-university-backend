const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
        required: true
    }
}, { timestamps: true });

const Category = mongoose.model('category', categorySchema);

module.exports = Category;
