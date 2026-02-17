const jwt = require("jsonwebtoken");
const User = require("../models/user-model");
const Student = require("../models/student-model");

// Helper to extract token from Header or Cookie
const getToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.userjwt) {
        return req.cookies.userjwt;
    }
    return null;
}

const getStudentToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.studentjwt) {
        return req.cookies.studentjwt;
    }
    return null;
}

// check user middleware (Populates res.locals.user)
const checkUser = (req, res, next) => {
    const token = getToken(req);

    if (token) {
        jwt.verify(
            token,
            process.env.USER_SECRET_KEY,
            async (err, decodedToken) => {
                if (err) {
                    res.locals.user = null;
                    next();
                } else {
                    let user = await User.findById(decodedToken.id);
                    res.locals.user = user;
                    next();
                }
            }
        );
    } else {
        res.locals.user = null;
        next();
    }
};

// check student middleware
const checkStudent = (req, res, next) => {
    const token = getStudentToken(req);

    if (token) {
        jwt.verify(
            token,
            process.env.STUDENT_SECRET_KEY,
            async (err, decodedToken) => {
                if (err) {
                    res.locals.user = null;
                    next();
                } else {
                    let user = await Student.findById(decodedToken.id);
                    res.locals.user = user;
                    next();
                }
            }
        );
    } else {
        res.locals.user = null;
        next();
    }
};

// user auth middleware (Enforces login)
const requireAuth = (req, res, next) => {
    const token = getToken(req);

    if (token) {
        jwt.verify(token, process.env.USER_SECRET_KEY, (err, decodedToken) => {
            if (err) {
                // If API request, return 401 instead of redirect
                res.status(401).json({ err: 'Unauthorized: Invalid token' });
            } else {
                next();
            }
        });
    } else {
        res.status(401).json({ err: 'Unauthorized: No token provided' });
    }
};

// student auth middleware
const studentRequireAuth = (req, res, next) => {
    const token = getStudentToken(req);

    if (token) {
        jwt.verify(token, process.env.STUDENT_SECRET_KEY, (err, decodedToken) => {
            if (err) {
                res.status(401).json({ err: 'Unauthorized: Invalid token' });
            } else {
                next();
            }
        });
    } else {
        res.status(401).json({ err: 'Unauthorized: No token provided' });
    }
};

// any auth middleware
const requireAnyAuth = (req, res, next) => {
    const userToken = getToken(req);
    const studentToken = getStudentToken(req);

    if (userToken) {
        jwt.verify(userToken, process.env.USER_SECRET_KEY, (err) => {
            if (!err) return next();
            checkStudentAuth();
        });
    } else {
        checkStudentAuth();
    }

    function checkStudentAuth() {
        if (studentToken) {
            jwt.verify(studentToken, process.env.STUDENT_SECRET_KEY, (err) => {
                if (!err) return next();
                res.status(401).json({ err: 'Unauthorized: Invalid token' });
            });
        } else {
            res.status(401).json({ err: 'Unauthorized: No token provided' });
        }
    }
};

const checkAnyUser = async (req, res, next) => {
    const userToken = getToken(req);
    const studentToken = getStudentToken(req);

    if (userToken) {
        try {
            const decoded = jwt.verify(userToken, process.env.USER_SECRET_KEY);
            const user = await User.findById(decoded.id);
            if (user) {
                res.locals.user = user;
                return next();
            }
        } catch (e) { }
    }

    if (studentToken) {
        try {
            const decoded = jwt.verify(studentToken, process.env.STUDENT_SECRET_KEY);
            const student = await Student.findById(decoded.id);
            if (student) {
                res.locals.user = student;
                return next();
            }
        } catch (e) { }
    }

    res.locals.user = null;
    next();
};

module.exports = {
    checkUser,
    checkStudent,
    requireAuth,
    studentRequireAuth,
    requireAnyAuth,
    checkAnyUser
};
