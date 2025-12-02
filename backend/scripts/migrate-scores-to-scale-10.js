/**
 * Migration Script: Convert scores from 0-100 scale to 0-10 scale
 * Run once to fix existing submissions in database
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Import models
const AssignmentSubmission = require('../src/models/AssignmentSubmission');
const Assignment = require('../src/models/Assignment');

async function migrateScores() {
  try {
    console.log('🔄 Starting score migration to scale 10...\n');

    // Find all submitted/graded submissions
    const submissions = await AssignmentSubmission.find({
      status: { $in: ['submitted', 'graded'] },
    }).populate('assignmentId');

    console.log(`📊 Found ${submissions.length} submissions to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const submission of submissions) {
      // Check if already migrated (aiSkillScore < 15 means it's probably already /10)
      if (submission.aiSkillScore && submission.aiSkillScore < 15) {
        console.log(`⏭️  Skipping ${submission._id} - appears already migrated`);
        skippedCount++;
        continue;
      }

      const assignment = submission.assignmentId;
      if (!assignment || !assignment.totalPoints) {
        console.log(`⚠️  Skipping ${submission._id} - no assignment or totalPoints found`);
        skippedCount++;
        continue;
      }

      // Recalculate scores
      const contentPercentage = (submission.totalScore / assignment.totalPoints) * 100;
      const contentScoreScale10 = Math.min(10, (contentPercentage / 100) * 10);

      // Convert aiSkillScore from 0-100 to 0-10
      const aiSkillScoreScale10 = submission.aiSkillScore
        ? Math.min(10, (submission.aiSkillScore / 100) * 10)
        : 0;

      // Recalculate final score
      const finalScore = Math.min(10, contentScoreScale10 * 0.7 + aiSkillScoreScale10 * 0.3);

      // Update submission
      submission.contentScore = contentScoreScale10;
      submission.aiSkillScore = aiSkillScoreScale10;
      submission.finalScore = finalScore;

      await submission.save();

      console.log(`✅ Migrated ${submission._id}:`);
      console.log(`   Content: ${contentScoreScale10.toFixed(2)}/10`);
      console.log(`   AI Skill: ${aiSkillScoreScale10.toFixed(2)}/10`);
      console.log(`   Final: ${finalScore.toFixed(2)}/10\n`);

      migratedCount++;
    }

    console.log('\n🎉 Migration completed!');
    console.log(`✅ Migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`📊 Total: ${submissions.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateScores();
