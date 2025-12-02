require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createInstructor() {
  try {
    console.log('🎓 ========================================');
    console.log('   TẠO TÀI KHOẢN GIẢNG VIÊN');
    console.log('========================================\n');

    // Get user input
    const name = await question('👤 Tên giảng viên: ');
    const email = await question('📧 Email: ');
    const password = await question('🔒 Mật khẩu (tối thiểu 6 ký tự): ');
    const department = await question('🏢 Khoa/Bộ môn: ');

    // Validation
    if (!name || !email || !password) {
      console.log('\n❌ Tên, email và mật khẩu là bắt buộc!');
      rl.close();
      process.exit(1);
    }

    if (password.length < 6) {
      console.log('\n❌ Mật khẩu phải có ít nhất 6 ký tự!');
      rl.close();
      process.exit(1);
    }

    console.log('\n🔵 Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB\n');

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log('❌ Email đã được sử dụng!');
      console.log(`   Người dùng hiện tại: ${existingUser.name} (${existingUser.role})`);
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    // Create instructor user
    const instructor = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // Will be hashed by pre-save hook
      role: 'instructor',
      department: department?.trim() || null,
      isActive: true,
    });

    await instructor.save();

    console.log('✅ Tạo tài khoản giảng viên thành công!\n');
    console.log('📄 Thông tin tài khoản:');
    console.log('   ├─ ID:', instructor._id);
    console.log('   ├─ Tên:', instructor.name);
    console.log('   ├─ Email:', instructor.email);
    console.log('   ├─ Vai trò:', instructor.role);
    console.log('   ├─ Khoa:', instructor.department || 'N/A');
    console.log('   └─ Ngày tạo:', instructor.createdAt);
    console.log('\n🔑 Đăng nhập với:');
    console.log('   URL: http://localhost:5173/login');
    console.log('   Email:', instructor.email);
    console.log('   Password: (mật khẩu bạn vừa nhập)\n');
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    if (error.name === 'ValidationError') {
      console.error(
        'Chi tiết:',
        Object.values(error.errors)
          .map(e => e.message)
          .join(', ')
      );
    }
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('👋 Đã ngắt kết nối MongoDB');
    process.exit(0);
  }
}

createInstructor();
