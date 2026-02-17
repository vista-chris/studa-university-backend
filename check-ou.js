const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const { OfferedUnit } = require('./models/unit-model');

async function checkOU() {
    try {
        await mongoose.connect(process.env.dbURI);
        const ou = await OfferedUnit.findOne().populate('period');
        console.log('Sample OfferedUnit:', JSON.stringify(ou, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkOU();
