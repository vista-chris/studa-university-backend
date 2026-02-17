const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Period = require('./models/period-model');

async function checkPeriods() {
    try {
        await mongoose.connect(process.env.dbURI);
        const periods = await Period.find().limit(10);
        console.log('Periods Sample:', JSON.stringify(periods, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkPeriods();
