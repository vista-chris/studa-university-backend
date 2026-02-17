const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'student',
        required: true
    },
    checkoutRequestId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Success', 'Failed'],
        default: 'Pending'
    },
    mpesaReceiptNumber: {
        type: String
    },
    resultDesc: {
        type: String
    },
    description: {
        type: String
    }
}, { timestamps: true });

const Payment = mongoose.model('payment', paymentSchema);

module.exports = Payment;
