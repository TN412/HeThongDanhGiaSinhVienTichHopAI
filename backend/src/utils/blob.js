const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');

/**
 * Upload file buffer lên Azure Blob Storage
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type
 * @param {string} userId - User ID (để tạo folder structure)
 * @returns {Promise<string>} - Blob URL
 */
async function uploadToBlob(buffer, filename, contentType, userId) {
  // Validate environment variables
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'assignments';

  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not found in environment variables');
  }

  try {
    // Initialize Blob Service Client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    // Get container client (tạo container nếu chưa có)
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({
      access: 'blob', // Public read access
    });

    // Generate unique blob name với folder structure: userId/timestamp_filename
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const sanitizedBaseName = baseName.replace(/[^a-z0-9]/gi, '_');
    const blobName = `${userId}/${timestamp}_${sanitizedBaseName}${ext}`;

    // Get block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload options
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
      metadata: {
        uploadedBy: userId,
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Upload buffer
    await blockBlobClient.upload(buffer, buffer.length, uploadOptions);

    // Return public URL
    return blockBlobClient.url;
  } catch (error) {
    throw new Error(`Failed to upload to Azure Blob: ${error.message}`);
  }
}

/**
 * Delete blob từ Azure Storage
 *
 * @param {string} blobUrl - Full blob URL
 * @returns {Promise<boolean>} - Success status
 */
async function deleteBlob(blobUrl) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    // Parse blob name từ URL
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    const containerName = pathParts[1];
    const blobName = pathParts.slice(2).join('/');

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();

    return true;
  } catch (error) {
    console.error('Failed to delete blob:', error);
    return false;
  }
}

/**
 * Check if Azure Blob Storage is configured
 *
 * @returns {boolean}
 */
function isBlobStorageConfigured() {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}

/**
 * Get blob metadata
 *
 * @param {string} blobUrl - Blob URL
 * @returns {Promise<Object>} - Blob properties and metadata
 */
async function getBlobMetadata(blobUrl) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    const containerName = pathParts[1];
    const blobName = pathParts.slice(2).join('/');

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const properties = await blockBlobClient.getProperties();

    return {
      contentType: properties.contentType,
      contentLength: properties.contentLength,
      lastModified: properties.lastModified,
      metadata: properties.metadata,
    };
  } catch (error) {
    throw new Error(`Failed to get blob metadata: ${error.message}`);
  }
}

module.exports = {
  uploadToBlob,
  deleteBlob,
  isBlobStorageConfigured,
  getBlobMetadata,
};
