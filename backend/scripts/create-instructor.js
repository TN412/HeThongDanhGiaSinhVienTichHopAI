/**
 * Script to create an instructor account
 * Usage: node scripts/create-instructor.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Import User model
const User = require('../src/models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = prompt => {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
};

async function createInstructor() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get instructor details
    const name = await question('📝 Instructor Name: ');
    const email = await question('📧 Email: ');
    const password = await question('🔐 Password (min 6 chars): ');
    const department = await question('🏢 Department (optional): ');

    // Validate
    if (!name || !email || !password) {
      console.error('❌ Name, email, and password are required!');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters!');
      process.exit(1);
    }

    // Check if email exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.error('❌ Email already exists!');
      process.exit(1);
    }

    // Create instructor
    const instructor = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // Will be hashed by pre-save hook
      role: 'instructor',
      department: department?.trim() || undefined,
      isActive: true,
    });

    await instructor.save();

    console.log('\n✅ Instructor account created successfully!');
    console.log('═'.repeat(50));
    console.log('📋 Account Details:');
    console.log(`   Name: ${instructor.name}`);
    console.log(`   Email: ${instructor.email}`);
    console.log(`   Role: ${instructor.role}`);
    console.log(`   Department: ${instructor.department || 'N/A'}`);
    console.log('═'.repeat(50));
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${instructor.email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🌐 Login at: http://localhost:5173/login');
    console.log('   (Select "Instructor" role)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating instructor:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

// Run the script
createInstructor();
