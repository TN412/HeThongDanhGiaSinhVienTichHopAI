require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testRegistration() {
  try {
    console.log('🔵 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test data
    const testUser = {
      name: 'Test Student',
      email: 'teststudent123@example.com',
      passwordHash: 'testpassword123', // Will be hashed by pre-save hook
      role: 'student',
      studentId: 'ST001',
      department: 'Computer Science',
      isActive: true,
    };

    console.log('\n🔵 Creating user:', testUser.email);

    // Check if user exists
    const existingUser = await User.findOne({ email: testUser.email });
    if (existingUser) {
      console.log('⚠️  User already exists, deleting first...');
      await User.deleteOne({ email: testUser.email });
    }

    // Create new user
    const newUser = new User(testUser);
    await newUser.save();

    console.log('✅ User created successfully!');
    console.log('📄 User data:', {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      studentId: newUser.studentId,
      department: newUser.department,
    });

    // Verify in database
    const verifyUser = await User.findById(newUser._id);
    console.log('\n✅ Verification: User exists in database');
    console.log('📄 Verified data:', {
      id: verifyUser._id,
      name: verifyUser.name,
      email: verifyUser.email,
    });

    // Check password hash
    const userWithPassword = await User.findById(newUser._id).select('+passwordHash');
    console.log(
      '\n✅ Password hash stored:',
      userWithPassword.passwordHash.substring(0, 20) + '...'
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

testRegistration();
