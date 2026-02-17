const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    fname: {
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
        type: String,
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
    password: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        required: true
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
})

//static login method
userSchema.statics.login = async function (email, password) {
    const user = await this.findOne({ email });
    if (user) {
        if (user.status) {
            const auth = await bcrypt.compare(password, user.password);
            if (auth) {
                return user;
            } throw Error('incorrect_password')
        } throw Error('account_suspended')
    } throw Error('incorrect_email')
}

//static find email
userSchema.statics.findEmail = async function (email) {
    const user = await this.findOne({ email });
    if (user) {
        return user;
    } throw Error('incorrect_email')
}

const User = mongoose.model('user', userSchema);

module.exports = User;
