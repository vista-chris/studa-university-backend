const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Timetable = require('./models/timetable-model');
const { OfferedUnit } = require('./models/unit-model');

async function dumpData() {
    try {
        await mongoose.connect(process.env.dbURI);
        console.log('Connected to DB');

        const timetable = await Timetable.find().limit(5);
        console.log('Timetable Sample:', JSON.stringify(timetable, null, 2));

        if (timetable.length > 0) {
            const ouId = timetable[0].unit;
            const ou = await OfferedUnit.findById(ouId);
            console.log('Related OfferedUnit:', JSON.stringify(ou, null, 2));
        }

        const allOU = await OfferedUnit.find().limit(5);
        console.log('OfferedUnits Sample:', JSON.stringify(allOU, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

dumpData();
