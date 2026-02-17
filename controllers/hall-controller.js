const Hall = require('../models/hall-model');

//generate code
const generateCode = () => {
    let calc = Math.floor(Math.random() * 1000000);
    return calc;
}

//add Hall
const addHall = async (req, res) => {
    const { name, capacity, faculty } = req.body;
    const code = generateCode();

    try {
        const hall = await Hall.find({ name, faculty });
        if (hall.length > 0) {
            res.status(201).json({
                err: `Hall already exist`
            });
        } else {
            await Hall.create({ code, name, capacity, faculty });
            res.status(201).json({
                success: `Hall registration completed succesfully.`
            });
        }
    } catch (error) {
        console.log(error);
        res.status(201).json({
            err: 'Failed to register hall!'
        });
    }
}

//update Hall
const updateHall = async (req, res) => {
    const { id } = req.params;
    const { name, capacity, faculty } = req.body;

    try {
        const hall = await Hall.find({ name, capacity, faculty });
        if (hall.length > 0) {
            res.status(201).json({
                err: `Hall already exist/ No changes made.`
            });
        } else {
            await Hall.findByIdAndUpdate(id, { name, capacity, faculty });
            res.status(201).json({
                success: `Hall updated succesfully.`
            });
        }
    } catch (error) {
        console.log(error);
        res.status(201).json({
            err: 'Failed to update hall!'
        });
    }
}

//delete hall
const deleteHall = async (req, res) => {
    const hall = req.body;

    try {
        for (let i = 0; i < hall.length; i++) {
            const id = hall[i];
            await Hall.findByIdAndDelete(id).clone();
        }
        res.json({ success: 'Deleted hall(s) successfully' })
    } catch (error) {
        console.log(error);
        res.json({ err: 'Failed to delete hall(s)' });
    }
}

//fetch Hall
const fetchHall = async (req, res) => {
    try {
        const halls = await Hall.find().populate('faculty').sort({ createdAt: -1 });
        // Format to match legacy response structure if necessary, or just send halls
        // Legacy sent: 
        /*
        {
            halls: { ...hallFields },
            faculties: { ...facultyFields }
        }
        */
        // But the legacy code structure was flattened?
        /*
            "halls.code": "$halls.code",
            "faculties.name": "$faculties.name"
        */
        // I'll check legacy response format in next step if frontend breaks.
        // For now, sending populated halls is standard. 
        // If frontend expects { halls: ..., faculties: ... } object per item, I might need to map it.
        // Let's assume frontend can handle populated object or I'll update frontend.
        // Wait, looking at legacy aggregation, it returns an array of objects where each object has properties "halls.code", "faculties.name" etc?
        // No, the project stage says:
        /*
         "halls._id": "$halls._id",
         "faculties._id": "$faculties._id",
        */
        // So the output is like { "halls": { _id: ... }, "faculties": { _id: ... } } ?
        // Or flat?
        // Mongoose aggregation result is array of documents. The project fields define the keys.
        // "halls._id" key means nested object "halls" with key "_id".
        // So output is { halls: { ... }, faculties: { ... } }

        const formattedHalls = halls.map(hall => ({
            halls: {
                _id: hall._id,
                code: hall.code,
                name: hall.name,
                capacity: hall.capacity,
                createdAt: hall.createdAt,
                updatedAt: hall.updatedAt
            },
            faculties: hall.faculty ? {
                _id: hall.faculty._id,
                code: hall.faculty.code,
                name: hall.faculty.name
            } : null // Should not happen if required
        }));

        res.status(201).send(formattedHalls);
    } catch (error) {
        console.log(error);
        res.status(500).json({ err: 'Failed to fetch halls' });
    }
}


module.exports = { addHall, updateHall, deleteHall, fetchHall, }
