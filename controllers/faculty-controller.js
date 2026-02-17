const Faculty = require('../models/faculty-model')
// Ideally we would import Hall controller/model logic here if merging, but sticking to separate for now to match structure.
// Wait, the plan suggested merging. I'll stick to 'faculty-controller.js' handling faculty only for now as Hall logic needs Hall model.
// I will create hall-controller.js separately to avoid massive files.

//add faculty
const addFaculty = async (req, res) => {
    const { code, name, description } = req.body

    try {
        const faculty = await Faculty.find({ code, name })
        if (faculty.length > 0) {
            res.status(201).json({
                err: `Faculty already exist`
            })
        } else {
            await Faculty.create({ code, name, description })
            res.status(201).json({
                success: `Faculty registration completed succesfully.`
            })
        }
    } catch (error) {
        console.log(error)
        res.status(201).json({
            err: 'Failed to register faculty!'
        })
    }
}

//fetch faculty
const fetchFaculty = async (req, res) => {
    try {
        const faculty = await Faculty.find().sort({ createdAt: -1 })
        res.status(200).send(faculty)
    } catch (error) {
        console.log(error)
        res.status(500).send({ err: 'Failed to fetch faculty' })
    }
}


module.exports = { addFaculty, fetchFaculty }
