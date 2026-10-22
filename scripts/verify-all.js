const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { SignJWT } = require('jose');
const axios = require('axios');

// 1. Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
for (const line of envLines) {
  const eq = line.indexOf('=');
  if (eq !== -1 && !line.startsWith('#')) {
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hostelmatch_default_secret_key_minimum_32_characters_long'
);
const BASE_URL = 'http://localhost:3000/api';

async function createToken(userId, role, gender = 'male', year = 2) {
  return await new SignJWT({ userId, role, gender, year })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   HOSTEL & ROOM MANAGEMENT AUTOMATED TEST SUITE    ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Admin Token
  const adminToken = await createToken('600000000000000000000001', 'admin');
  const adminHeaders = { headers: { Cookie: `hm_token=${adminToken}` } };

  // 2. Test GET /api/admin/stats
  try {
    const statsRes = await axios.get(`${BASE_URL}/admin/stats`, adminHeaders);
    assert(statsRes.status === 200, 'GET /api/admin/stats returns 200');
    assert(statsRes.data.data.totals.hostels >= 17, `Stats reports ${statsRes.data.data.totals.hostels} hostels (>=17)`);
    assert(statsRes.data.data.totals.rooms >= 680, `Stats reports ${statsRes.data.data.totals.rooms} rooms (>=680)`);
    assert(statsRes.data.data.totals.availableBeds >= 2040, `Stats reports ${statsRes.data.data.totals.availableBeds} beds (>=2040)`);
  } catch (err) {
    assert(false, `GET /api/admin/stats failed: ${err.message}`);
  }

  // 3. Test POST /api/hostels (Create new hostel)
  let createdHostelId = null;
  const testHostelCode = `TEST_${Date.now().toString().slice(-4)}`;
  try {
    const createRes = await axios.post(
      `${BASE_URL}/hostels`,
      {
        name: 'Automated Test Hostel',
        code: testHostelCode,
        gender: 'mixed',
        location: 'West Campus Zone 4',
        totalFloors: 3,
        allowedYears: [1, 2, 3],
        facilities: ['Wi-Fi', 'Study Room'],
        rules: 'Curfew 11 PM',
      },
      adminHeaders
    );
    assert(createRes.status === 201, 'POST /api/hostels returns 201 Created');
    createdHostelId = createRes.data.data._id;
    assert(createRes.data.data.code === testHostelCode, `Hostel created with code ${testHostelCode}`);
  } catch (err) {
    assert(false, `POST /api/hostels failed: ${err.response?.data?.message || err.message}`);
  }

  // 4. Test duplicate code rejection
  try {
    await axios.post(
      `${BASE_URL}/hostels`,
      {
        name: 'Duplicate Hostel',
        code: testHostelCode,
        gender: 'boys',
        totalFloors: 2,
      },
      adminHeaders
    );
    assert(false, 'Duplicate hostel code was not rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'POST /api/hostels with duplicate code rejected with 400');
  }

  // 5. Test Floor Bound Validation: POST /api/rooms with floor > hostel.totalFloors
  try {
    await axios.post(
      `${BASE_URL}/rooms`,
      {
        hostelId: createdHostelId,
        roomNumber: '999',
        floor: 10, // Hostel only has 3 floors!
        capacity: 2,
        roomType: 'AC',
      },
      adminHeaders
    );
    assert(false, 'Room on invalid floor (> totalFloors) was not rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'POST /api/rooms on floor > totalFloors rejected with 400');
  }

  // 6. Test POST /api/rooms (Single room creation)
  let createdRoomId = null;
  try {
    const singleRoomRes = await axios.post(
      `${BASE_URL}/rooms`,
      {
        hostelId: createdHostelId,
        roomNumber: '101',
        floor: 1,
        capacity: 3,
        roomType: 'AC',
        notes: 'Secret VIP Room Notes for Admin Only',
      },
      adminHeaders
    );
    assert(singleRoomRes.status === 201, 'POST /api/rooms returns 201');
    createdRoomId = singleRoomRes.data.data._id;
  } catch (err) {
    assert(false, `POST /api/rooms failed: ${err.response?.data?.message || err.message}`);
  }

  // 7. Test POST /api/rooms/bulk (Batch creation & duplicate skipping)
  try {
    const bulkRes1 = await axios.post(
      `${BASE_URL}/rooms/bulk`,
      {
        hostelId: createdHostelId,
        floor: 1,
        startNumber: 101, // 101 already exists from above!
        count: 5,         // Will target 101, 102, 103, 104, 105
        capacity: 2,
        roomType: 'Non-AC',
      },
      adminHeaders
    );
    assert(bulkRes1.status === 201, 'POST /api/rooms/bulk returns 201');
    assert(bulkRes1.data.data.created === 4, `Bulk created 4 rooms (rooms 102-105)`);
    assert(bulkRes1.data.data.skipped === 1, `Bulk correctly skipped 1 duplicate room (101)`);
    assert(bulkRes1.data.data.skippedNumbers.includes('101'), `Skipped room number accurately identified as '101'`);

    // Run again to verify 100% skipped
    const bulkRes2 = await axios.post(
      `${BASE_URL}/rooms/bulk`,
      {
        hostelId: createdHostelId,
        floor: 1,
        startNumber: 101,
        count: 5,
        capacity: 2,
        roomType: 'Non-AC',
      },
      adminHeaders
    );
    assert(bulkRes2.data.data.created === 0, 'Second bulk run created 0 rooms');
    assert(bulkRes2.data.data.skipped === 5, 'Second bulk run skipped all 5 existing rooms');
  } catch (err) {
    assert(false, `POST /api/rooms/bulk failed: ${err.response?.data?.message || err.message}`);
  }

  // 8. Test PUT /api/rooms/[id]
  try {
    const updateRes = await axios.put(
      `${BASE_URL}/rooms/${createdRoomId}`,
      { capacity: 4, roomType: 'AC' },
      adminHeaders
    );
    assert(updateRes.status === 200, 'PUT /api/rooms/[id] returns 200');
    assert(updateRes.data.data.capacity === 4, 'Room capacity successfully updated to 4');
  } catch (err) {
    assert(false, `PUT /api/rooms/[id] failed: ${err.message}`);
  }

  // 9. Test Student Eligibility Isolation: Male Student
  const maleToken = await createToken('600000000000000000000002', 'student', 'male', 2);
  const maleHeaders = { headers: { Cookie: `hm_token=${maleToken}` } };
  try {
    const maleHostelsRes = await axios.get(`${BASE_URL}/hostels?limit=50`, maleHeaders);
    const maleHostels = maleHostelsRes.data.data.hostels;
    const hasGirlsHostel = maleHostels.some((h) => h.gender === 'girls');
    const hasBoysHostel = maleHostels.some((h) => h.gender === 'boys');
    assert(!hasGirlsHostel, 'Male student CANNOT see any Girls Hostels');
    assert(hasBoysHostel, 'Male student CAN see Boys Hostels (BH1-BH10)');
  } catch (err) {
    assert(false, `Male student eligibility check failed: ${err.message}`);
  }

  // 10. Test Student Eligibility Isolation: Female Student
  const femaleToken = await createToken('600000000000000000000003', 'student', 'female', 2);
  const femaleHeaders = { headers: { Cookie: `hm_token=${femaleToken}` } };
  try {
    const femaleHostelsRes = await axios.get(`${BASE_URL}/hostels?limit=50`, femaleHeaders);
    const femaleHostels = femaleHostelsRes.data.data.hostels;
    const hasBoysHostel = femaleHostels.some((h) => h.gender === 'boys');
    const hasGirlsHostel = femaleHostels.some((h) => h.gender === 'girls');
    assert(!hasBoysHostel, 'Female student CANNOT see any Boys Hostels');
    assert(hasGirlsHostel, 'Female student CAN see Girls Hostels (GH1-GH7)');
  } catch (err) {
    assert(false, `Female student eligibility check failed: ${err.message}`);
  }

  // 11. Test Safe Field Projection for Students (No Admin Notes)
  try {
    const studentRoomsRes = await axios.get(
      `${BASE_URL}/rooms?hostelId=${createdHostelId}`,
      maleHeaders
    );
    const studentRooms = studentRoomsRes.data.data.rooms;
    assert(studentRooms.length > 0, 'Student can view rooms in eligible mixed hostel');
    const leakedNotes = studentRooms.some((r) => r.notes !== undefined && r.notes !== '');
    assert(!leakedNotes, 'Student view strictly omits internal admin notes');
  } catch (err) {
    assert(false, `Student room projection check failed: ${err.message}`);
  }

  // 12. Test Clean Up: DELETE /api/hostels/[id] (Cascade room deletion)
  try {
    const deleteHostelRes = await axios.delete(
      `${BASE_URL}/hostels/${createdHostelId}`,
      adminHeaders
    );
    assert(deleteHostelRes.status === 200, 'DELETE /api/hostels/[id] returns 200');
    // Verify rooms are also deleted
    const leftoverRoomsRes = await axios.get(
      `${BASE_URL}/rooms?hostelId=${createdHostelId}`,
      adminHeaders
    );
    assert(leftoverRoomsRes.data.data.rooms.length === 0, 'Associated rooms were cascade-deleted with the hostel');
  } catch (err) {
    assert(false, `DELETE /api/hostels/[id] cleanup failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTestSuite();
