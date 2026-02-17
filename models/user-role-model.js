const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const userRoleSchema = new Schema({
    user: {
        type: ObjectId,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    permissions: {
        type: Array,
        required: true
    }
}, { timestamps: true });

const UserRole = mongoose.model("userRole", userRoleSchema);

module.exports = UserRole;
