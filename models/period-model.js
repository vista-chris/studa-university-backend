const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const periodSchema = new Schema({
    name: {
        type: String,
        unique: true,
        uppercase: true,
        required: true
    }
}, { timestamps: true });

const Period = mongoose.model('period', periodSchema);

module.exports = Period;
