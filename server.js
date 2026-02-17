const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth-route');
const studentRoutes = require('./routes/student-route');
const userRoutes = require('./routes/user-route');
const facultyRoutes = require('./routes/faculty-route');
const courseRoutes = require('./routes/course-route');
const unitRoutes = require('./routes/unit-route');
const hallRoutes = require('./routes/hall-route');
const periodRoutes = require('./routes/period-route');
const attendanceRoutes = require('./routes/attendance-route');
const feeRoutes = require('./routes/fee-route');
const fileManagerRoutes = require('./routes/file-manager-route');
const timetableRoutes = require('./routes/timetable-route');
const semesterRoutes = require('./routes/semester-route');
const gradingRoutes = require('./routes/grading-route');



// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:4200', credentials: true })); // Allow Angular App
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/files', fileManagerRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/grading', gradingRoutes);



const PORT = process.env.PORT || 5000; // Use 5000 to avoid conflict with existing app on 3000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
