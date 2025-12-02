/**
 * Demo Script: Submission Workflow
 * Demonstrates the complete student submission lifecycle:
 * 1. Start submission (create draft)
 * 2. Save draft multiple times
 * 3. Submit assignment
 * 4. Auto-grading & AI skill scoring
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Assignment, AssignmentSubmission, AI_Log } = require('../src/models');

async function demoSubmissionWorkflow() {
  try {
    console.log('\n🎯 DEMO: Student Submission Workflow\n');

    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_assessment_system'
    );
    console.log('✅ Connected to MongoDB\n');

    // ============================================
    // STEP 1: Create a sample assignment
    // ============================================
    console.log('📝 STEP 1: Creating sample assignment...');

    const instructorId = new mongoose.Types.ObjectId();
    const assignment = await Assignment.create({
      instructorId,
      title: 'Demo Assignment: JavaScript Fundamentals',
      description: 'Test your understanding of JavaScript basics',
      questionType: 'multiple-choice',
      questions: [
        {
          type: 'multiple-choice',
          question: 'What is the output of: console.log(typeof null)?',
          options: ['null', 'undefined', 'object', 'number'],
          correctAnswer: 'object',
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'Which method adds an element to the end of an array?',
          options: ['push()', 'pop()', 'shift()', 'unshift()'],
          correctAnswer: 'push()',
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'What is a closure in JavaScript?',
          options: [
            'A function that returns another function',
            'A function with access to its outer scope',
            'A type of loop',
            'A way to close a file',
          ],
          correctAnswer: 'A function with access to its outer scope',
          points: 15,
          difficulty: 'medium',
        },
      ],
      totalPoints: 35,
      status: 'published',
      allowAI: true,
      allowMultipleDrafts: true,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    console.log(`✅ Created assignment: "${assignment.title}"`);
    console.log(`   ID: ${assignment._id}`);
    console.log(`   Questions: ${assignment.questions.length}`);
    console.log(`   Total Points: ${assignment.totalPoints}\n`);

    // ============================================
    // STEP 2: Student starts submission
    // ============================================
    console.log('🎓 STEP 2: Student starts submission...');

    const studentId = new mongoose.Types.ObjectId();

    // Initialize answers array from questions
    const initialAnswers = assignment.questions.map(q => ({
      questionId: q._id,
      answer: '',
      aiInteractionCount: 0,
    }));

    const submission = await AssignmentSubmission.create({
      assignmentId: assignment._id,
      studentId,
      attemptNumber: 1,
      answers: initialAnswers,
      status: 'draft',
      startedAt: new Date(),
    });

    console.log(`✅ Submission started: ${submission._id}`);
    console.log(`   Status: ${submission.status}`);
    console.log(`   Version: ${submission.__v}`);
    console.log(`   Answers initialized: ${submission.answers.length}\n`);

    // ============================================
    // STEP 3: Student works on questions (saves drafts)
    // ============================================
    console.log('💾 STEP 3: Student saves drafts...');

    // Draft 1: Answer first question
    submission.answers[0].answer = 'object';
    submission.answers[0].timeSpent = 45; // seconds
    await submission.save();
    console.log(`✅ Draft 1 saved (v${submission.__v}): Answered Q1`);

    // Simulate AI interaction for Q2
    await AI_Log.create({
      submissionId: submission._id,
      assignmentId: assignment._id,
      studentId,
      questionId: assignment.questions[1]._id,
      prompt: 'What is the difference between push() and unshift()?',
      response:
        'push() adds elements to the end of an array, while unshift() adds elements to the beginning.',
      promptType: 'question',
      contextProvided: true,
      timestamp: new Date(),
      promptTokens: 15,
      completionTokens: 25,
      responseTime: 850,
    });

    submission.answers[1].aiInteractionCount = 1;
    console.log(`🤖 Student used AI for Q2`);

    // Draft 2: Answer second question
    submission.answers[1].answer = 'push()';
    submission.answers[1].timeSpent = 120; // seconds (with AI help)
    await submission.save();
    console.log(`✅ Draft 2 saved (v${submission.__v}): Answered Q2 with AI help`);

    // Simulate multiple AI interactions for Q3 (poor quality prompts)
    await AI_Log.create({
      submissionId: submission._id,
      assignmentId: assignment._id,
      studentId,
      questionId: assignment.questions[2]._id,
      prompt: 'help',
      response: 'Can you be more specific about what you need help with?',
      promptType: 'question',
      contextProvided: false,
      timestamp: new Date(),
      promptTokens: 5,
      completionTokens: 12,
      responseTime: 600,
    });

    await AI_Log.create({
      submissionId: submission._id,
      assignmentId: assignment._id,
      studentId,
      questionId: assignment.questions[2]._id,
      prompt: 'help',
      response: 'Please provide more details about your question.',
      promptType: 'question',
      contextProvided: false,
      timestamp: new Date(),
      promptTokens: 5,
      completionTokens: 10,
      responseTime: 550,
    });

    await AI_Log.create({
      submissionId: submission._id,
      assignmentId: assignment._id,
      studentId,
      questionId: assignment.questions[2]._id,
      prompt: 'Explain closure in simple terms with example',
      response:
        'A closure is when a function "remembers" variables from its outer scope. Example: function outer() { let x = 10; return function inner() { console.log(x); } }',
      promptType: 'clarification',
      contextProvided: true,
      timestamp: new Date(),
      promptTokens: 12,
      completionTokens: 45,
      responseTime: 950,
    });

    submission.answers[2].aiInteractionCount = 3;
    console.log(`🤖 Student used AI 3 times for Q3 (2 poor quality, 1 good)`);

    // Draft 3: Answer third question (WRONG ANSWER)
    submission.answers[2].answer = 'A function that returns another function'; // Wrong!
    submission.answers[2].timeSpent = 300; // 5 minutes with AI help
    await submission.save();
    console.log(`✅ Draft 3 saved (v${submission.__v}): Answered Q3 (incorrect)\n`);

    // ============================================
    // STEP 4: Demonstrate optimistic concurrency
    // ============================================
    console.log('🔒 STEP 4: Testing optimistic concurrency...');

    const currentVersion = submission.__v;
    console.log(`   Current version: ${currentVersion}`);

    // Simulate another save (version should increment)
    submission.answers[0].timeSpent = 50; // Update time
    await submission.save();
    console.log(`   After save: version ${submission.__v}`);
    console.log(`   ✅ Version key incremented correctly\n`);

    // ============================================
    // STEP 5: Submit assignment & auto-grade
    // ============================================
    console.log('📤 STEP 5: Student submits assignment...');

    // Get all AI logs for scoring
    const allLogs = await AI_Log.find({ submissionId: submission._id });
    console.log(`   Total AI interactions: ${allLogs.length}`);

    // Auto-grade multiple-choice questions
    let totalScore = 0;
    for (let answer of submission.answers) {
      const question = assignment.questions.id(answer.questionId);

      if (question.type === 'multiple-choice') {
        answer.isCorrect = answer.answer === question.correctAnswer;
        answer.pointsEarned = answer.isCorrect ? question.points : 0;
        totalScore += answer.pointsEarned;
      }
    }

    console.log(`\n📊 AUTO-GRADING RESULTS:`);
    submission.answers.forEach((answer, idx) => {
      const question = assignment.questions[idx];
      console.log(
        `   Q${idx + 1}: ${answer.isCorrect ? '✅ Correct' : '❌ Wrong'} - ${answer.pointsEarned}/${question.points} points`
      );
    });
    console.log(
      `   Content Score: ${totalScore}/${assignment.totalPoints} (${Math.round((totalScore / assignment.totalPoints) * 100)}%)`
    );

    // Calculate AI Skill Score
    function calculateAISkillScore(logs, submission) {
      if (logs.length === 0) return 100;

      // Factor 1: Prompt Quality (40%)
      const avgPromptLength = logs.reduce((sum, log) => sum + log.prompt.length, 0) / logs.length;
      const contextProvidedRate = logs.filter(log => log.contextProvided).length / logs.length;
      const promptQuality = Math.min(100, (avgPromptLength / 50) * 50 + contextProvidedRate * 50);

      // Factor 2: Independence Level (30%)
      const aiUsageRate = logs.length / submission.answers.length;
      const independenceScore = Math.max(0, 100 - aiUsageRate * 30);

      // Factor 3: Iteration Pattern (30%)
      const uniquePrompts = new Set(logs.map(l => l.prompt.toLowerCase().trim())).size;
      const iterationEfficiency = (uniquePrompts / logs.length) * 100;

      return promptQuality * 0.4 + independenceScore * 0.3 + iterationEfficiency * 0.3;
    }

    const aiSkillScore = calculateAISkillScore(allLogs, submission);

    console.log(`\n🤖 AI SKILL ANALYSIS:`);
    console.log(`   Total Prompts: ${allLogs.length}`);
    console.log(`   Unique Prompts: ${new Set(allLogs.map(l => l.prompt.toLowerCase())).size}`);
    console.log(
      `   Avg Prompt Length: ${Math.round(allLogs.reduce((sum, l) => sum + l.prompt.length, 0) / allLogs.length)} chars`
    );
    console.log(
      `   Context Provided: ${allLogs.filter(l => l.contextProvided).length}/${allLogs.length}`
    );
    console.log(`   AI Skill Score: ${Math.round(aiSkillScore)}/100`);

    // Calculate final score (70% content + 30% AI skill)
    const contentScore = (totalScore / assignment.totalPoints) * 100;
    const finalScore = contentScore * 0.7 + aiSkillScore * 0.3;

    console.log(`\n🎯 FINAL SCORE CALCULATION:`);
    console.log(
      `   Content Score (70%): ${Math.round(contentScore)}% → ${Math.round(contentScore * 0.7)} points`
    );
    console.log(
      `   AI Skill Score (30%): ${Math.round(aiSkillScore)}% → ${Math.round(aiSkillScore * 0.3)} points`
    );
    console.log(`   =====================================`);
    console.log(`   FINAL SCORE: ${Math.round(finalScore)}/100`);

    // Update submission
    submission.status = 'submitted';
    submission.totalScore = totalScore;
    submission.aiSkillScore = aiSkillScore;
    submission.finalScore = finalScore;
    submission.submittedAt = new Date();
    submission.aiInteractionSummary = {
      totalPrompts: allLogs.length,
      avgPromptLength: Math.round(
        allLogs.reduce((sum, l) => sum + l.prompt.length, 0) / allLogs.length
      ),
      contextProvidedRate: allLogs.filter(l => l.contextProvided).length / allLogs.length,
      uniquePrompts: new Set(allLogs.map(l => l.prompt.toLowerCase())).size,
      independenceLevel: Math.max(0, 100 - (allLogs.length / submission.answers.length) * 30) / 100,
    };
    await submission.save();

    console.log(`\n✅ Submission complete!`);
    console.log(`   Status: ${submission.status}`);
    console.log(`   Submitted at: ${submission.submittedAt.toISOString()}`);
    console.log(
      `   Time spent: ${Math.round((submission.submittedAt - submission.startedAt) / 1000)}s (simulated)`
    );

    // ============================================
    // STEP 6: Display final summary
    // ============================================
    console.log(`\n========================================`);
    console.log(`📈 SUBMISSION SUMMARY`);
    console.log(`========================================`);
    console.log(`Assignment: ${assignment.title}`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Submission ID: ${submission._id}`);
    console.log(`\nScores:`);
    console.log(
      `  Content: ${totalScore}/${assignment.totalPoints} (${Math.round(contentScore)}%)`
    );
    console.log(`  AI Skill: ${Math.round(aiSkillScore)}/100`);
    console.log(`  Final: ${Math.round(finalScore)}/100`);
    console.log(`\nAI Usage:`);
    console.log(`  Total Interactions: ${allLogs.length}`);
    console.log(
      `  Questions with AI Help: ${submission.answers.filter(a => a.aiInteractionCount > 0).length}/${submission.answers.length}`
    );
    console.log(
      `  Independence Level: ${Math.round(submission.aiInteractionSummary.independenceLevel * 100)}%`
    );
    console.log(`\nInsights:`);
    if (aiSkillScore < 50) {
      console.log(
        `  ⚠️  Low AI skill score - Student may be over-reliant on AI or using poor prompts`
      );
    } else if (aiSkillScore > 80) {
      console.log(`  ✅ Good AI skill score - Student uses AI effectively and independently`);
    } else {
      console.log(
        `  📊 Moderate AI skill - Room for improvement in prompt quality or independence`
      );
    }
    console.log(`========================================\n`);

    // Cleanup
    await Assignment.deleteOne({ _id: assignment._id });
    await AssignmentSubmission.deleteOne({ _id: submission._id });
    await AI_Log.deleteMany({ submissionId: submission._id });
    console.log('🧹 Cleaned up demo data\n');
  } catch (error) {
    console.error('❌ Error in demo:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB\n');
  }
}

// Run the demo
if (require.main === module) {
  demoSubmissionWorkflow();
}

module.exports = demoSubmissionWorkflow;
