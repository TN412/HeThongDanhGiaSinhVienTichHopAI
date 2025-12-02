/**
 * Database Index Setup Script
 * Creates all indexes defined in the models for optimal query performance
 * Run this script after initial deployment or when indexes change
 *
 * Usage: node scripts/setup-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Assignment, AssignmentSubmission, AI_Log } = require('../src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_assessment_system';

async function setupIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Creating indexes for all collections...\n');

    // User indexes
    console.log('👤 User collection:');
    await User.createIndexes();
    const userIndexes = await User.collection.getIndexes();
    console.log(
      `   ✅ Created ${Object.keys(userIndexes).length} indexes:`,
      Object.keys(userIndexes).join(', ')
    );

    // Assignment indexes
    console.log('\n📝 Assignment collection:');
    await Assignment.createIndexes();
    const assignmentIndexes = await Assignment.collection.getIndexes();
    console.log(
      `   ✅ Created ${Object.keys(assignmentIndexes).length} indexes:`,
      Object.keys(assignmentIndexes).join(', ')
    );

    // AssignmentSubmission indexes
    console.log('\n📤 AssignmentSubmission collection:');
    await AssignmentSubmission.createIndexes();
    const submissionIndexes = await AssignmentSubmission.collection.getIndexes();
    console.log(
      `   ✅ Created ${Object.keys(submissionIndexes).length} indexes:`,
      Object.keys(submissionIndexes).join(', ')
    );

    // AI_Log indexes (Critical for performance)
    console.log('\n🤖 AI_Log collection:');
    await AI_Log.createIndexes();
    const aiLogIndexes = await AI_Log.collection.getIndexes();
    console.log(
      `   ✅ Created ${Object.keys(aiLogIndexes).length} indexes:`,
      Object.keys(aiLogIndexes).join(', ')
    );

    console.log('\n✅ All indexes created successfully!');
    console.log('\n📋 Index Summary:');
    console.log(`   - User: ${Object.keys(userIndexes).length} indexes`);
    console.log(`   - Assignment: ${Object.keys(assignmentIndexes).length} indexes`);
    console.log(`   - AssignmentSubmission: ${Object.keys(submissionIndexes).length} indexes`);
    console.log(`   - AI_Log: ${Object.keys(aiLogIndexes).length} indexes`);
    console.log(
      `   - Total: ${Object.keys(userIndexes).length + Object.keys(assignmentIndexes).length + Object.keys(submissionIndexes).length + Object.keys(aiLogIndexes).length} indexes`
    );

    // Validate critical indexes from documentation
    console.log('\n🔍 Validating critical indexes from documentation:');

    const criticalIndexes = {
      AI_Log: [
        { name: 'submissionId_1_timestamp_1', keys: { submissionId: 1, timestamp: 1 } },
        { name: 'studentId_1_assignmentId_1', keys: { studentId: 1, assignmentId: 1 } },
        { name: 'questionId_1', keys: { questionId: 1 } },
      ],
      AssignmentSubmission: [
        {
          name: 'studentId_1_assignmentId_1_attemptNumber_1',
          keys: { studentId: 1, assignmentId: 1, attemptNumber: 1 },
        },
        { name: 'status_1', keys: { status: 1 } },
        { name: 'submittedAt_1', keys: { submittedAt: 1 } },
      ],
      Assignment: [
        { name: 'instructorId_1_status_1', keys: { instructorId: 1, status: 1 } },
        { name: 'deadline_1', keys: { deadline: 1 } },
      ],
    };

    let allCriticalIndexesFound = true;

    for (const [collection, expectedIndexes] of Object.entries(criticalIndexes)) {
      console.log(`\n   ${collection}:`);
      const collectionIndexes =
        collection === 'AI_Log'
          ? aiLogIndexes
          : collection === 'AssignmentSubmission'
            ? submissionIndexes
            : assignmentIndexes;

      for (const expectedIndex of expectedIndexes) {
        const found = Object.keys(collectionIndexes).some(
          indexName =>
            indexName === expectedIndex.name ||
            indexName.includes(Object.keys(expectedIndex.keys).join('_'))
        );
        if (found) {
          console.log(`      ✅ ${expectedIndex.name}`);
        } else {
          console.log(`      ❌ MISSING: ${expectedIndex.name}`);
          allCriticalIndexesFound = false;
        }
      }
    }

    if (allCriticalIndexesFound) {
      console.log('\n✅ All critical indexes are present!');
    } else {
      console.log('\n⚠️  Some critical indexes are missing. Check model definitions.');
    }
  } catch (error) {
    console.error('❌ Error setting up indexes:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
setupIndexes();
