const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const librarySettingsSchema = new Schema({
    maxBooksPerStudent: {
        type: Number,
        default: 5,
        min: 1
    },
    borrowingPeriodDays: {
        type: Number,
        default: 14,
        min: 1
    },
    maxRenewals: {
        type: Number,
        default: 2,
        min: 0
    },
    finePerDay: {
        type: Number,
        default: 10,
        min: 0
    },
    maxOutstandingFine: {
        type: Number,
        default: 500,
        min: 0
    },
    reservationExpiryDays: {
        type: Number,
        default: 7,
        min: 1
    }
}, { timestamps: true });

const LibrarySettings = mongoose.model('librarySettings', librarySettingsSchema);

module.exports = LibrarySettings;
