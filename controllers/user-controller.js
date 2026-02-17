const User = require('../models/user-model')

//fetch users
const fetchUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 })
        res.send(users)
    } catch (error) {
        console.log(error)
        res.status(500).json({ err: 'Failed to fetch users!' })
    }
}

//remove user
const deleteUser = async (req, res) => {
    const id = req.params.id;

    try {
        await User.findByIdAndDelete(id)
        res.json({ success: 'The user has been deleted...' })
    } catch (err) {
        console.log(err)
        res.json({ err: 'Failed to delete user!' })
    }
}

//remove users
const deleteUsers = async (req, res) => {
    const { ids } = req.body;

    try {
        await User.deleteMany({ _id: { $in: ids } })
        res.json({ success: 'The users have been deleted...' })
    } catch (err) {
        console.log(err)
        res.status(500).json({ err: 'Failed to delete users!' })
    }
}

//deactivate user
const deactivateUser = async (req, res) => {
    const id = req.params.id;

    try {
        await User.findByIdAndUpdate(id, { status: false })
        res.json({ success: 'The user has been deactivated...' })
    } catch (err) {
        console.log(err)
        res.json({ err: 'Failed to deactivate user!' })
    }
}

//activate user
const activateUser = async (req, res) => {
    const id = req.params.id;

    try {
        await User.findByIdAndUpdate(id, { status: true })
        res.json({ success: 'The user has been activated...' })
    } catch (err) {
        console.log(err)
        res.json({ err: 'Failed to activate user!' })
    }
}

//update user
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { title, fname, lname, email, gender, birthday, phone, address, category } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { title, fname, lname, email, gender, birthday, phone, address, category },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ err: 'User not found!' });
        }

        res.status(200).json({ success: 'The user details have been updated...' });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ err: 'This email is already registered to another user.' });
        } else if (err.name === 'ValidationError') {
            res.status(400).json({ err: err.message });
        } else {
            res.status(500).json({ err: 'Internal server error: Failed to update user.' });
        }
    }
};

module.exports = { fetchUsers, deleteUser, deleteUsers, deactivateUser, activateUser, updateUser }
