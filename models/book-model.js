const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const bookSchema = new Schema({
    isbn: {
        type: String,
        unique: true,
        trim: true,
        sparse: true // Allow books without ISBN
    },
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    author: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    publisher: {
        type: String,
        trim: true
    },
    publicationYear: {
        type: Number
    },
    edition: {
        type: String,
        trim: true
    },
    category: {
        type: ObjectId,
        ref: 'category',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    coverImage: {
        type: String,
        default: ''
    },
    totalCopies: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    availableCopies: {
        type: Number,
        required: true,
        default: 1,
        min: 0
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    language: {
        type: String,
        default: 'English',
        trim: true
    },
    pages: {
        type: Number,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'damaged'],
        default: 'active'
    }
}, { timestamps: true });

// Indexes for search optimization
bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

const Book = mongoose.model('book', bookSchema);

module.exports = Book;
