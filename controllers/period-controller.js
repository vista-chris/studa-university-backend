const Period = require('../models/period-model')

//fetch periods
const fetchPeriods = async (req, res) => {
    try {
        const periods = await Period.find().sort({ createdAt: -1 })
        res.send(periods)
    } catch (error) {
        console.log(error)
        res.status(500).json({ err: 'Internal Server Error' })
    }
}

//add period
const addPeriod = async (req, res) => {
    const { name } = req.body
    try {
        await Period.create({ name })
        res.status(201).json({
            success: `The period has been configured`
        })
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ err: 'The period already exist...' })
        } else {
            console.log(error)
            res.status(500).json({
                err: error.message
            })
        }
    }
}

module.exports = { fetchPeriods, addPeriod }
