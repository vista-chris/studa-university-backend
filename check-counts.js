const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Timetable = require('./models/timetable-model');
const { OfferedUnit } = require('./models/unit-model');

async function checkCounts() {
    try {
        await mongoose.connect(process.env.dbURI);
        const tCount = await Timetable.countDocuments();
        const ouCount = await OfferedUnit.countDocuments();
        console.log(`Timetable count: ${tCount}`);
        console.log(`OfferedUnit count: ${ouCount}`);

        if (tCount > 0) {
            const sample = await Timetable.findOne().populate({
                path: 'unit',
                populate: { path: 'unit' }
            });
            console.log('Sample Timetable Entry Populated:', JSON.stringify(sample, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkCounts();
