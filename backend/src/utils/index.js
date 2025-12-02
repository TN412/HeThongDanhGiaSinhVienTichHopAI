/**
 * Central export file for utility modules
 */

const documentParser = require('./documentParser');
const blob = require('./blob');

module.exports = {
  // Document Parser
  extractText: documentParser.extractText,
  validateExtractedText: documentParser.validateExtractedText,
  truncateForAI: documentParser.truncateForAI,
  cleanText: documentParser.cleanText,

  // Azure Blob Storage
  uploadToBlob: blob.uploadToBlob,
  deleteBlob: blob.deleteBlob,
  isBlobStorageConfigured: blob.isBlobStorageConfigured,
  getBlobMetadata: blob.getBlobMetadata,
};
