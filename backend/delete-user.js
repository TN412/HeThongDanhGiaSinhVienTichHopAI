require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function deleteTestUser() {
  try {
    const emailToDelete = process.argv[2];

    if (!emailToDelete) {
      console.log('❌ Please provide email to delete');
      console.log('Usage: node delete-user.js <email>');
      console.log('Example: node delete-user.js test@example.com');
      process.exit(1);
    }

    console.log('🔵 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: emailToDelete });

    if (!user) {
      console.log(`⚠️  User with email "${emailToDelete}" not found`);
    } else {
      console.log(`👤 Found user:`, {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      // Delete
      await User.deleteOne({ email: emailToDelete });
      console.log(`\n✅ User deleted successfully!`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

deleteTestUser();
