const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

const studentSchema = new Schema({
    adm: {
        type: String,
        unique: true,
        uppercase: true,
        required: true
    },
    fname: {
        type: String,
        uppercase: true,
        required: true
    },
    mname: {
        type: String,
        uppercase: true,
        required: true
    },
    lname: {
        type: String,
        uppercase: true,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    gender: {
        type: String,
        required: true
    },
    birthday: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    course: {
        type: ObjectId,
        ref: 'course',
        required: true
    },
    trimester: {
        type: Boolean,
        required: true
    },
    index: {
        type: String,
        unique: true,
        uppercase: true,
        default: "",
        required: true
    },
    password: {
        type: String,
        required: true
    },
}, { timestamps: true });

studentSchema.pre('save', async function (next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);

    next();
})

//static login method
studentSchema.statics.login = async function (email, password) {
    const student = await this.findOne({ email });
    if (student) {
        const auth = await bcrypt.compare(password, student.password);
        if (auth) {
            return student;
        } throw Error('incorrect_password')
    } throw Error('incorrect_email')
}

//static find email
studentSchema.statics.findEmail = async function (email) {
    const student = await this.findOne({ email });
    if (student) {
        return student;
    } throw Error('incorrect_email')
}

const Student = mongoose.model('student', studentSchema);

module.exports = Student;
