/**
 * Database Seed Script
 * Creates sample data for development and testing
 * - 1 instructor user
 * - 1 student user
 * - 3 sample assignments (various types)
 * - 1 draft submission for the student
 *
 * Usage: node scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Assignment, AssignmentSubmission, AI_Log } = require('../src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_assessment_system';

// Sample data
const sampleData = {
  instructor: {
    name: 'Dr. Nguyễn Văn A',
    email: 'instructor@example.com',
    passwordHash: 'password123', // Will be hashed by model
    role: 'instructor',
    department: 'Khoa Công Nghệ Thông Tin',
    isActive: true,
  },
  student: {
    name: 'Trần Thị B',
    email: 'student@example.com',
    passwordHash: 'password123', // Will be hashed by model
    role: 'student',
    studentId: 'SV2021001',
    department: 'Khoa Công Nghệ Thông Tin',
    isActive: true,
  },
};

// Sample assignments
function createSampleAssignments(instructorId) {
  return [
    {
      instructorId,
      title: 'Kiến Thức Cơ Bản về JavaScript',
      description:
        'Bài tập trắc nghiệm về các khái niệm cơ bản của JavaScript bao gồm biến, hàm, vòng lặp và điều kiện.',
      questionType: 'multiple-choice',
      questions: [
        {
          type: 'multiple-choice',
          question:
            'Từ khóa nào được sử dụng để khai báo biến có phạm vi block scope trong JavaScript?',
          options: ['var', 'let', 'const', 'function'],
          correctAnswer: 'let',
          explanation:
            'Từ khóa "let" được sử dụng để khai báo biến có phạm vi block scope, trong khi "var" có function scope.',
          points: 10,
          difficulty: 'easy',
          estimatedTime: 2,
        },
        {
          type: 'multiple-choice',
          question: 'Kết quả của biểu thức `typeof null` trong JavaScript là gì?',
          options: ['"null"', '"undefined"', '"object"', '"number"'],
          correctAnswer: '"object"',
          explanation:
            'Đây là một bug lịch sử trong JavaScript. `typeof null` trả về "object" thay vì "null".',
          points: 10,
          difficulty: 'medium',
          estimatedTime: 2,
        },
        {
          type: 'multiple-choice',
          question: 'Method nào được sử dụng để thêm phần tử vào cuối mảng?',
          options: ['push()', 'pop()', 'shift()', 'unshift()'],
          correctAnswer: 'push()',
          explanation:
            'Method push() thêm một hoặc nhiều phần tử vào cuối mảng và trả về độ dài mới của mảng.',
          points: 10,
          difficulty: 'easy',
          estimatedTime: 2,
        },
        {
          type: 'multiple-choice',
          question: 'Arrow function khác với function thông thường ở điểm nào?',
          options: [
            'Không có từ khóa function',
            'Không có this riêng',
            'Cú pháp ngắn gọn hơn',
            'Tất cả đều đúng',
          ],
          correctAnswer: 'Tất cả đều đúng',
          explanation:
            'Arrow function khác function thông thường ở nhiều điểm: cú pháp ngắn gọn, không có this/arguments/super riêng.',
          points: 10,
          difficulty: 'medium',
          estimatedTime: 3,
        },
        {
          type: 'multiple-choice',
          question: 'Promise ở trạng thái nào khi đang chờ xử lý?',
          options: ['fulfilled', 'rejected', 'pending', 'resolved'],
          correctAnswer: 'pending',
          explanation:
            'Promise có 3 trạng thái: pending (chờ xử lý), fulfilled (thành công), rejected (thất bại).',
          points: 10,
          difficulty: 'medium',
          estimatedTime: 2,
        },
      ],
      status: 'published',
      settings: {
        timeLimit: 30,
        allowAI: true,
        allowMultipleDrafts: true,
        maxAttempts: 2,
        shuffleQuestions: false,
        shuffleOptions: true,
        showResultsImmediately: true,
      },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    {
      instructorId,
      title: 'Phân Tích và Thiết Kế Hệ Thống',
      description: 'Bài tập tự luận về phân tích yêu cầu và thiết kế kiến trúc hệ thống phần mềm.',
      questionType: 'essay',
      questions: [
        {
          type: 'essay',
          question:
            'Mô tả quy trình phân tích yêu cầu cho một hệ thống quản lý thư viện. Bao gồm các bước thu thập yêu cầu, phân loại yêu cầu chức năng và phi chức năng, và cách xác định use case.',
          rubric: `
Tiêu chí chấm điểm:
- Thu thập yêu cầu (5 điểm): Mô tả các kỹ thuật thu thập (phỏng vấn, khảo sát, quan sát)
- Phân loại yêu cầu (10 điểm): Liệt kê rõ ràng yêu cầu chức năng và phi chức năng
- Use case (10 điểm): Xác định đúng các use case chính và mô tả tương tác
- Tính logic và mạch lạc (5 điểm): Trình bày có logic, dễ hiểu
          `.trim(),
          points: 30,
          difficulty: 'hard',
          estimatedTime: 30,
        },
        {
          type: 'essay',
          question:
            'So sánh kiến trúc Monolithic và Microservices. Phân tích ưu nhược điểm của mỗi kiến trúc và đưa ra tình huống phù hợp để áp dụng từng loại.',
          rubric: `
Tiêu chí chấm điểm:
- Mô tả Monolithic (5 điểm): Giải thích đúng khái niệm và đặc điểm
- Mô tả Microservices (5 điểm): Giải thích đúng khái niệm và đặc điểm
- Ưu nhược điểm (10 điểm): So sánh chi tiết ưu nhược điểm của cả hai
- Tình huống áp dụng (10 điểm): Đưa ra ví dụ cụ thể và giải thích lý do
          `.trim(),
          points: 30,
          difficulty: 'hard',
          estimatedTime: 25,
        },
      ],
      status: 'published',
      settings: {
        timeLimit: 90,
        allowAI: true,
        allowMultipleDrafts: true,
        maxAttempts: 1,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResultsImmediately: false, // Manual grading required
      },
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
    {
      instructorId,
      title: 'Tổng Hợp: Lập Trình Web Full Stack',
      description: 'Bài tập kết hợp trắc nghiệm và tự luận về kiến thức Full Stack Development.',
      questionType: 'mixed',
      questions: [
        {
          type: 'multiple-choice',
          question: 'RESTful API sử dụng HTTP method nào để tạo mới một resource?',
          options: ['GET', 'POST', 'PUT', 'DELETE'],
          correctAnswer: 'POST',
          explanation:
            'POST được sử dụng để tạo mới resource, PUT để cập nhật, GET để lấy dữ liệu, DELETE để xóa.',
          points: 5,
          difficulty: 'easy',
          estimatedTime: 1,
        },
        {
          type: 'multiple-choice',
          question: 'MongoDB là loại database nào?',
          options: [
            'Relational Database',
            'NoSQL Document Database',
            'Graph Database',
            'Time Series Database',
          ],
          correctAnswer: 'NoSQL Document Database',
          explanation:
            'MongoDB là NoSQL document database, lưu trữ dữ liệu dưới dạng JSON-like documents (BSON).',
          points: 5,
          difficulty: 'easy',
          estimatedTime: 1,
        },
        {
          type: 'multiple-choice',
          question: 'JWT (JSON Web Token) được sử dụng cho mục đích gì?',
          options: ['Mã hóa dữ liệu', 'Xác thực và ủy quyền', 'Nén dữ liệu', 'Lưu trữ file'],
          correctAnswer: 'Xác thực và ủy quyền',
          explanation:
            'JWT được sử dụng để xác thực (authentication) và ủy quyền (authorization) người dùng trong ứng dụng web.',
          points: 5,
          difficulty: 'medium',
          estimatedTime: 2,
        },
        {
          type: 'essay',
          question:
            'Thiết kế API endpoints cho một ứng dụng blog đơn giản. Bao gồm các chức năng: đăng ký/đăng nhập, tạo/sửa/xóa bài viết, comment. Mô tả HTTP method, endpoint path, request body và response cho mỗi API.',
          rubric: `
Tiêu chí chấm điểm:
- API Authentication (5 điểm): POST /register, POST /login với body và response hợp lý
- API Posts (10 điểm): CRUD endpoints đầy đủ (GET, POST, PUT, DELETE)
- API Comments (5 điểm): Endpoints cho comment (GET, POST, DELETE)
- RESTful principles (5 điểm): Tuân thủ nguyên tắc RESTful (resource naming, HTTP methods)
          `.trim(),
          points: 25,
          difficulty: 'medium',
          estimatedTime: 20,
        },
        {
          type: 'essay',
          question:
            'Giải thích cách hoạt động của React Hooks (useState và useEffect). Đưa ra ví dụ code minh họa việc fetch dữ liệu từ API và hiển thị lên component.',
          rubric: `
Tiêu chí chấm điểm:
- Giải thích useState (5 điểm): Mô tả đúng cách sử dụng và mục đích
- Giải thích useEffect (5 điểm): Mô tả đúng lifecycle và dependency array
- Code example (10 điểm): Code hoạt động, có fetch API, xử lý loading/error
- Best practices (5 điểm): Cleanup, error handling, loading state
          `.trim(),
          points: 25,
          difficulty: 'hard',
          estimatedTime: 25,
        },
      ],
      status: 'published',
      settings: {
        timeLimit: 60,
        allowAI: true,
        allowMultipleDrafts: true,
        maxAttempts: 1,
        shuffleQuestions: false,
        shuffleOptions: true,
        showResultsImmediately: false,
      },
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    },
  ];
}

// Create draft submission for student
function createDraftSubmission(studentId, assignmentId, assignment) {
  // Get first 3 questions for draft answers
  const answers = assignment.questions.slice(0, 3).map(question => ({
    questionId: question._id,
    answer:
      question.type === 'multiple-choice'
        ? question.options[0] // Select first option as draft
        : 'Đây là câu trả lời nháp. Sinh viên đang suy nghĩ và sẽ hoàn thiện sau...', // Draft essay answer
    aiInteractionCount: question.type === 'essay' ? 2 : 0, // Essay questions have AI interactions
  }));

  return {
    studentId,
    assignmentId,
    attemptNumber: 1,
    answers,
    status: 'draft',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
    behaviorMetrics: {
      tabSwitchCount: 3,
      totalTimeSpent: 7200000, // 2 hours in milliseconds
      lastActivityAt: new Date(Date.now() - 10 * 60 * 1000), // Last activity 10 minutes ago
    },
  };
}

// Create sample AI logs for the draft submission
function createSampleAILogs(studentId, assignmentId, submissionId, questionId) {
  const now = Date.now();
  return [
    {
      submissionId,
      assignmentId,
      studentId,
      questionId,
      prompt: 'Làm thế nào để phân tích yêu cầu chức năng và phi chức năng trong hệ thống?',
      response:
        'Để phân tích yêu cầu chức năng và phi chức năng:\n\n1. **Yêu cầu chức năng**: Mô tả những gì hệ thống phải làm\n   - Thu thập thông qua phỏng vấn stakeholder\n   - Xác định các use case chính\n   - Viết user stories\n\n2. **Yêu cầu phi chức năng**: Mô tả cách hệ thống hoạt động\n   - Performance (thời gian phản hồi)\n   - Security (bảo mật)\n   - Scalability (khả năng mở rộng)\n   - Usability (dễ sử dụng)\n\nBạn có thể áp dụng kỹ thuật MoSCoW để ưu tiên yêu cầu.',
      promptType: 'question',
      contextProvided: true,
      timestamp: new Date(now - 90 * 60 * 1000), // 90 minutes ago
      promptTokens: 125,
      completionTokens: 342,
      responseTime: 2340,
      model: 'gpt-4',
      temperature: 0.7,
    },
    {
      submissionId,
      assignmentId,
      studentId,
      questionId,
      prompt:
        'Cho ví dụ cụ thể về yêu cầu chức năng và phi chức năng của hệ thống quản lý thư viện',
      response:
        '**Ví dụ hệ thống quản lý thư viện:**\n\n**Yêu cầu chức năng:**\n- RF1: Người dùng có thể tìm kiếm sách theo tên, tác giả, thể loại\n- RF2: Thủ thư có thể mượn/trả sách cho độc giả\n- RF3: Hệ thống gửi thông báo khi sách sắp đến hạn trả\n- RF4: Độc giả có thể đặt trước sách đang được mượn\n\n**Yêu cầu phi chức năng:**\n- NFR1: Performance - Tìm kiếm phải trả kết quả trong 2 giây\n- NFR2: Security - Mã hóa thông tin cá nhân của độc giả\n- NFR3: Availability - Hệ thống hoạt động 99.9% thời gian\n- NFR4: Usability - Giao diện thân thiện, dễ sử dụng cho người cao tuổi',
      promptType: 'clarification',
      contextProvided: true,
      timestamp: new Date(now - 60 * 60 * 1000), // 60 minutes ago
      promptTokens: 156,
      completionTokens: 428,
      responseTime: 2890,
      model: 'gpt-4',
      temperature: 0.7,
    },
  ];
}

async function seed() {
  try {
    console.log('🌱 Starting database seed...');
    console.log(
      `🔗 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`
    );

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Assignment.deleteMany({});
    await AssignmentSubmission.deleteMany({});
    await AI_Log.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create instructor
    console.log('👤 Creating instructor...');
    const instructor = await User.create(sampleData.instructor);
    console.log(`   ✅ Instructor created: ${instructor.name} (${instructor.email})`);
    console.log(`      ID: ${instructor._id}`);
    console.log(`      Role: ${instructor.role}`);
    console.log(`      Department: ${instructor.department}\n`);

    // Create student
    console.log('👤 Creating student...');
    const student = await User.create(sampleData.student);
    console.log(`   ✅ Student created: ${student.name} (${student.email})`);
    console.log(`      ID: ${student._id}`);
    console.log(`      Student ID: ${student.studentId}`);
    console.log(`      Role: ${student.role}`);
    console.log(`      Department: ${student.department}\n`);

    // Create assignments
    console.log('📝 Creating sample assignments...');
    const assignmentsData = createSampleAssignments(instructor._id);
    const assignments = await Assignment.insertMany(assignmentsData);

    assignments.forEach((assignment, index) => {
      console.log(`   ✅ Assignment ${index + 1}: ${assignment.title}`);
      console.log(`      ID: ${assignment._id}`);
      console.log(`      Type: ${assignment.questionType}`);
      console.log(`      Questions: ${assignment.questions.length}`);
      console.log(`      Total Points: ${assignment.totalPoints}`);
      console.log(`      Status: ${assignment.status}`);
      console.log(`      Deadline: ${assignment.deadline.toLocaleDateString('vi-VN')}`);
      console.log(`      Allow AI: ${assignment.settings.allowAI ? 'Yes' : 'No'}\n`);
    });

    // Create draft submission (for first assignment)
    console.log('📤 Creating draft submission...');
    const firstAssignment = assignments[0];
    const draftSubmissionData = createDraftSubmission(
      student._id,
      firstAssignment._id,
      firstAssignment
    );
    const draftSubmission = await AssignmentSubmission.create(draftSubmissionData);

    console.log(`   ✅ Draft submission created`);
    console.log(`      ID: ${draftSubmission._id}`);
    console.log(`      Student: ${student.name}`);
    console.log(`      Assignment: ${firstAssignment.title}`);
    console.log(`      Status: ${draftSubmission.status}`);
    console.log(
      `      Answers: ${draftSubmission.answers.length}/${firstAssignment.questions.length}`
    );
    console.log(`      Started: ${draftSubmission.startedAt.toLocaleString('vi-VN')}`);
    console.log(
      `      Time spent: ${Math.round(draftSubmission.behaviorMetrics.totalTimeSpent / 1000 / 60)} minutes\n`
    );

    // Create sample AI logs (for essay assignment)
    const essayAssignment = assignments[1]; // Assignment 2 is essay type
    const essaySubmissionData = createDraftSubmission(
      student._id,
      essayAssignment._id,
      essayAssignment
    );
    const essaySubmission = await AssignmentSubmission.create(essaySubmissionData);

    console.log('🤖 Creating sample AI logs...');
    const aiLogs = createSampleAILogs(
      student._id,
      essayAssignment._id,
      essaySubmission._id,
      essayAssignment.questions[0]._id
    );
    await AI_Log.insertMany(aiLogs);

    console.log(`   ✅ Created ${aiLogs.length} AI interaction logs`);
    console.log(`      Assignment: ${essayAssignment.title}`);
    console.log(`      Question: ${essayAssignment.questions[0].question.substring(0, 50)}...`);
    aiLogs.forEach((log, index) => {
      console.log(
        `      Log ${index + 1}: ${log.promptType} - ${log.promptTokens + log.completionTokens} tokens`
      );
    });

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log('   ================================');
    console.log(`   Users created: ${await User.countDocuments()}`);
    console.log(`   - Instructors: ${await User.countDocuments({ role: 'instructor' })}`);
    console.log(`   - Students: ${await User.countDocuments({ role: 'student' })}`);
    console.log(`   Assignments created: ${await Assignment.countDocuments()}`);
    console.log(
      `   - Multiple choice: ${await Assignment.countDocuments({ questionType: 'multiple-choice' })}`
    );
    console.log(`   - Essay: ${await Assignment.countDocuments({ questionType: 'essay' })}`);
    console.log(`   - Mixed: ${await Assignment.countDocuments({ questionType: 'mixed' })}`);
    console.log(`   Submissions created: ${await AssignmentSubmission.countDocuments()}`);
    console.log(`   - Draft: ${await AssignmentSubmission.countDocuments({ status: 'draft' })}`);
    console.log(`   AI Logs created: ${await AI_Log.countDocuments()}`);

    console.log('\n✅ Database seeded successfully!');

    console.log('\n🔐 Login Credentials:');
    console.log('   ================================');
    console.log('   Instructor:');
    console.log(`   - Email: ${instructor.email}`);
    console.log('   - Password: password123');
    console.log('   ');
    console.log('   Student:');
    console.log(`   - Email: ${student.email}`);
    console.log('   - Password: password123');

    console.log('\n💡 Next Steps:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Login as instructor to view assignments');
    console.log('   3. Login as student to continue draft submission');
    console.log('   4. Test AI chat functionality in the draft submission');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seed script
seed();
