require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function listAllUsers() {
  try {
    console.log('🔵 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('+passwordHash');

    console.log(`📊 Total users in database: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database!');
      console.log('\n💡 This means registration is NOT saving to database.');
      console.log('   Check backend logs for errors when you register from frontend.');
    } else {
      users.forEach((user, index) => {
        console.log(`👤 User #${index + 1}:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Student ID: ${user.studentId || 'N/A'}`);
        console.log(`   Department: ${user.department || 'N/A'}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(
          `   Password Hash: ${user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'N/A'}`
        );
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

listAllUsers();
