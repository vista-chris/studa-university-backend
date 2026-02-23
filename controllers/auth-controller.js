const Student = require('../models/student-model');
const User = require('../models/user-model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendAccountCreationEmail } = require('../utils/email-service');

const maxAge = 3 * 24 * 60 * 60; // 3 days

const createStudentToken = (id) => {
    return jwt.sign({ id }, process.env.STUDENT_SECRET_KEY, {
        expiresIn: maxAge
    });
}

const createUserToken = (id) => {
    return jwt.sign({ id }, process.env.USER_SECRET_KEY, {
        expiresIn: maxAge
    })
}

const generateCode = () => {
    let calc = Math.floor(Math.random() * 1000000);
    return calc;
}

const errorHandler = (err) => {
    let error = { email: '', password: '' };

    if (err.message === 'incorrect_email') {
        error.email = 'The email/admission number is not registered';
    }

    if (err.message === 'incorrect_password') {
        error.password = 'Incorrect password';
    }

    if (err.code === 11000) {
        error.email = 'The email already exists';
        return error;
    }

    // Check for validation errors
    if (err.message.includes('user validation failed')) {
        Object.values(err.errors).forEach(({ properties }) => {
            error[properties.path] = properties.message;
        });
    }

    return error;
}

// Student Login
const login = async (req, res) => {
    const { studentAdmission, studentPassword } = req.body;

    try {
        let student = await Student.findOne({ email: studentAdmission }).populate('course');
        if (!student) {
            student = await Student.findOne({ adm: studentAdmission.toUpperCase() }).populate('course');
        }

        if (student) {
            const auth = await bcrypt.compare(studentPassword, student.password);
            if (auth) {
                const token = createStudentToken(student._id);
                // Return token in body for Angular to handle (e.g. store in localStorage/sessionStorage)
                res.status(200).json({
                    student: {
                        _id: student._id,
                        adm: student.adm,
                        name: `${student.fname} ${student.lname}`,
                        email: student.email,
                        course: student.course
                    },
                    token
                });
                return;
            }
            throw Error('incorrect_password');
        }
        throw Error('incorrect_email');

    } catch (err) {
        const errors = errorHandler(err);
        res.status(400).json({ errors });
    }
}

// User (Staff) Login
const signin = async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        const user = await User.login(email, password);
        const token = createUserToken(user._id);

        // Return token and user data
        res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: `${user.fname} ${user.lname}`,
                title: user.title,
                category: user.category
            },
            token
        });
    } catch (error) {
        console.log(error);
        // Use a simple error object or reuse errorHandler
        let errors = { email: '', password: '' };
        if (error.message === 'incorrect_email') errors.email = 'Email not registered';
        if (error.message === 'incorrect_password') errors.password = 'Incorrect password';
        if (error.message === 'account_suspended') errors.email = 'Account suspended';
        res.status(400).json({ errors });
    }
}

const signup = async (req, res) => {
    const { title, fname, lname, email, gender, birthday, phone, address, category } = req.body;

    const rawPassword = String(generateCode());

    try {
        const user = await User.create({
            title, fname, lname, email, gender,
            birthday, phone, address, category,
            password: rawPassword, // Model will hash this
            status: true
        });

        // Generate Onboarding/Reset Link
        const secret = process.env.USER_SECRET_KEY + user.password;
        const payload = { email: user.email, id: user._id };
        const token = jwt.sign(payload, secret, { expiresIn: '15m' });

        const resetLink = `${process.env.FRONTEND_URL}/reset/user/${user._id}/${token}`;

        await sendAccountCreationEmail(fname, email, resetLink, 'staff');

        res.status(201).json({
            success: `Staff member ${fname} added successfully. Onboarding email sent.`
        });

    } catch (error) {
        console.error("Signup Error:", error);
        const errors = errorHandler(error);
        res.status(400).json({ errors });
    }
}

// Add Student (Admin)
const addStudent = async (req, res) => {
    const { fname, mname, lname, email, gender, birthday, phone, address, category, course, trimester, index } = req.body;

    const rawPassword = String(generateCode());
    const adm = String(generateCode()); // Simple generation for now

    try {
        const student = await Student.create({
            adm, fname, mname, lname, email, gender,
            birthday, phone, address, category, course,
            password: rawPassword, // Model will hash this
            trimester, index
        });

        // Generate Onboarding/Reset Link
        const secret = process.env.STUDENT_SECRET_KEY + student.password;
        const payload = { email: student.email, id: student._id };
        const token = jwt.sign(payload, secret, { expiresIn: '15m' });

        const resetLink = `${process.env.FRONTEND_URL}/reset/student/${student._id}/${token}`;

        await sendAccountCreationEmail(fname, email, resetLink, 'student');

        res.status(201).json({
            success: `Student ${fname} added successfully. Onboarding email sent to ${email}`
        });

    } catch (error) {
        console.error("Add Student Error:", error);
        const err = errorHandler(error);
        res.status(400).json({ err });
    }
};

const logout = (req, res) => {
    // Clear cookies just in case
    res.cookie('studentjwt', '', { maxAge: 1 });
    res.cookie('userjwt', '', { maxAge: 1 });
    res.status(200).json({ success: 'Logged out' });
}

const resetUser = async (req, res) => {
    const { id, token } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const secret = process.env.USER_SECRET_KEY + user.password;
        jwt.verify(token, secret);

        res.status(200).json({ email: user.email });
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
}

const resetStudent = async (req, res) => {
    const { id, token } = req.params;

    try {
        const student = await Student.findById(id);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const secret = process.env.STUDENT_SECRET_KEY + student.password;
        jwt.verify(token, secret);

        res.status(200).json({ email: student.email });
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
}

const resetUserPassword = async (req, res) => {
    const { id, token } = req.params;
    const { newPassword } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const secret = process.env.USER_SECRET_KEY + user.password;
        jwt.verify(token, secret);

        // Update password (model hook will hash it)
        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
}

const resetStudentPassword = async (req, res) => {
    const { id, token } = req.params;
    const { newPassword } = req.body;

    try {
        const student = await Student.findById(id);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const secret = process.env.STUDENT_SECRET_KEY + student.password;
        jwt.verify(token, secret);

        // Update password (model hook will hash it)
        student.password = newPassword;
        await student.save();

        res.status(200).json({ success: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { login, signin, signup, addStudent, logout, resetUser, resetStudent, resetUserPassword, resetStudentPassword };
