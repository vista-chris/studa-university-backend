const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const gradeSchema = new Schema({
    student: { type: ObjectId, ref: 'student', required: true },
    offeredUnit: { type: ObjectId, ref: 'offeredUnit', required: true },
    scores: [{
        type: { type: String, enum: ['Assignment', 'CAT', 'Exam'], required: true },
        score: { type: Number, min: 0, max: 100, required: true },
        weight: { type: Number, required: true }
    }],
    finalScore: { type: Number }, // Calculated
    grade: { type: String }, // A, B, etc.
    points: { type: Number }, // 4.0, 3.0, etc.
    status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' }
}, { timestamps: true });

// Pre-save hook to calculate finalScore, grade, and points
gradeSchema.pre('save', function (next) {
    if (this.scores && this.scores.length > 0) {
        let totalWeight = 0;
        let weightedScore = 0;

        this.scores.forEach(s => {
            weightedScore += (s.score * (s.weight / 100));
            totalWeight += s.weight;
        });

        this.finalScore = Math.round(weightedScore);

        // Grade assignment
        if (this.finalScore >= 70) { this.grade = 'A'; this.points = 4.0; }
        else if (this.finalScore >= 60) { this.grade = 'B'; this.points = 3.0; }
        else if (this.finalScore >= 50) { this.grade = 'C'; this.points = 2.0; }
        else if (this.finalScore >= 40) { this.grade = 'D'; this.points = 1.0; }
        else { this.grade = 'F'; this.points = 0.0; }
    }
});

const Grade = mongoose.model('grade', gradeSchema);

module.exports = Grade;
