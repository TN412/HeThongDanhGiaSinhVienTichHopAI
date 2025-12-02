/**
 * Models Index
 * Central export for all Mongoose models
 */

const User = require('./User');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');
const AI_Log = require('./AI_Log');

module.exports = {
  User,
  Assignment,
  AssignmentSubmission,
  AI_Log,
};
