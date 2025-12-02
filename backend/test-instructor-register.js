require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';

async function testInstructorRegistration() {
  try {
    console.log('🧪 Testing Instructor Registration API\n');
    console.log('📡 Backend URL:', BACKEND_URL);
    console.log('📍 Endpoint: POST /api/auth/instructor/register\n');

    const testData = {
      name: 'Test Instructor ' + Date.now(),
      email: `instructor${Date.now()}@test.com`,
      password: 'password123',
      department: 'Computer Science Department',
    };

    console.log('📤 Request data:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('\n⏳ Sending request...\n');

    const response = await axios.post(`${BACKEND_URL}/api/auth/instructor/register`, testData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Registration successful!\n');
    console.log('📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n🎉 Test passed!');
    console.log('\n🔑 Login credentials:');
    console.log('   Email:', testData.email);
    console.log('   Password:', testData.password);
    console.log('   URL: http://localhost:5173/login');
  } catch (error) {
    console.error('\n❌ Test failed!');

    if (error.response) {
      console.error('\n📥 Error response:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('\n❌ No response received from server');
      console.error('Is the backend running at', BACKEND_URL, '?');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

testInstructorRegistration();
