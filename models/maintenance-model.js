const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const maintenanceRequestSchema = new Schema({
    room: {
        type: ObjectId,
        ref: 'room',
        required: true
    },
    student: {
        type: ObjectId,
        ref: 'student',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Pending', 'In-Progress', 'Resolved', 'Cancelled'],
        default: 'Pending'
    },
    remarks: {
        type: String
    }
}, { timestamps: true });

const MaintenanceRequest = mongoose.model('maintenanceRequest', maintenanceRequestSchema);

module.exports = MaintenanceRequest;
