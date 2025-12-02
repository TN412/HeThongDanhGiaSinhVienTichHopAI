const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('📊 MongoDB already connected');
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.warn('⚠️  MONGODB_URI is not defined in environment variables');
      console.warn('⚠️  Server will run without database connection');
      console.warn('⚠️  Create .env file and add MONGODB_URI to enable database');
      return;
    }

    // MongoDB connection options
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, options);

    isConnected = true;

    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Stack:', error.stack);
    console.warn('⚠️  Server will continue running without database');
    console.warn('⚠️  Please check your MongoDB Atlas cluster:');
    console.warn('   1. Cluster is deployed and running (not paused)');
    console.warn('   2. Username/password is correct');
    console.warn('   3. Network access allows your IP address');
    console.warn('   4. Connection string format is correct');
    // Don't exit - allow server to run for testing
    // process.exit(1);
  }
};

// Graceful shutdown
const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('📊 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
