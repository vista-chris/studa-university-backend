const Course = require('../models/course-model')
const Student = require('../models/student-model')
const { Unit, OfferedUnit, UnitReg } = require('../models/unit-model')

//add course
const addCourse = async (req, res) => {
    const { code, name, description, type, faculty, status } = req.body;

    try {
        const newCourse = await Course.create({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            description,
            type,
            faculty,
            status: status || true
        });

        res.status(201).json({
            success: `Course "${newCourse.name}" has been added successfully.`
        });

    } catch (error) {
        console.error("Add Course Error:", error);

        if (error.code === 11000) {
            return res.status(409).json({ err: 'The course code already exists.' });
        }

        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message)[0];
            return res.status(400).json({ err: message });
        }

        res.status(500).json({ err: 'Failed to add course due to a server error!' });
    }
}

//fetch courses
const fetchCourses = async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('faculty')
            .sort({ _id: -1 });
        const formattedCourses = courses.map(course => ({
            courses: {
                _id: course._id,
                code: course.code,
                name: course.name,
                description: course.description,
                type: course.type,
                faculty: course.faculty?._id,
                status: course.status,
                createdAt: course.createdAt
            },
            faculties: course.faculty ? {
                _id: course.faculty._id,
                code: course.faculty.code,
                name: course.faculty.name,
                description: course.faculty.description
            } : null
        }));

        res.status(200).json(formattedCourses);
    } catch (error) {
        console.error("Fetch Courses Error:", error);
        res.status(500).json({ err: "Failed to fetch courses" });
    }
}

//remove course
const deleteCourse = async (req, res) => {
    const courseIds = req.body;

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return res.status(400).json({ err: 'No courses selected.' });
    }

    try {
        const enrollmentCount = await Student.countDocuments({ course: { $in: courseIds } });
        if (enrollmentCount > 0) {
            return res.status(400).json({
                err: `Cannot delete: ${enrollmentCount} students are currently tied to these courses.`
            });
        }
        const unitIds = await Unit.find({ course: { $in: courseIds } }).distinct('_id');
        await Promise.all([
            UnitReg.deleteMany({ unit: { $in: unitIds } }),
            OfferedUnit.deleteMany({ unit: { $in: unitIds } }),
            Unit.deleteMany({ course: { $in: courseIds } }),
            Course.deleteMany({ _id: { $in: courseIds } })
        ]);

        res.status(200).json({ success: 'Courses and all associated units deleted successfully.' });
    } catch (err) {
        console.error("Delete Courses Error:", err);
        res.status(500).json({ err: 'Server error: Failed to complete the deletion process.' });
    }
}

//update course
const updateCourse = async (req, res) => {
    const { id } = req.params;
    const { code, name, description, type, faculty, status } = req.body;

    try {
        const updatedCourse = await Course.findByIdAndUpdate(
            id,
            {
                code: code.trim().toUpperCase(),
                name: name.trim(),
                description,
                type,
                faculty,
                status
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedCourse) {
            return res.status(404).json({ err: 'Course not found!' });
        }

        res.status(200).json({ success: 'The course details have been updated successfully.' });

    } catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ err: `The course code "${code}" is already in use.` });
        } else if (err.name === 'ValidationError') {
            res.status(400).json({ err: err.message });
        } else {
            console.error("Update Course Error:", err);
            res.status(500).json({ err: 'Failed to update course due to a server error.' });
        }
    }
};

module.exports = { addCourse, fetchCourses, deleteCourse, updateCourse }
