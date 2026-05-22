const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (options.body) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Running Application Endpoints Verification Tests...');

  try {
    // 1. Get CSRF token
    console.log('\n1. Fetching CSRF Token...');
    const csrfRes = await request(`${BASE_URL}/api/auth/csrf`);
    if (csrfRes.statusCode !== 200) {
      throw new Error(`Failed to fetch CSRF token: ${csrfRes.statusCode} ${csrfRes.data}`);
    }
    const { csrfToken } = JSON.parse(csrfRes.data);
    console.log(`✅ CSRF Token retrieved: ${csrfToken}`);

    // 2. Perform Login
    console.log('\n2. Attempting login as "admin"...');
    const csrfCookies = (csrfRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    
    const loginBody = new URLSearchParams({
      csrfToken,
      username: 'admin',
      password: 'admin123',
      json: 'true',
    }).toString();

    const loginRes = await request(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfCookies,
      },
      body: loginBody,
    });


    console.log(`Login response code: ${loginRes.statusCode}`);
    console.log(`Login response body: ${loginRes.data}`);
    
    // Parse cookies
    const setCookieHeaders = loginRes.headers['set-cookie'] || [];
    console.log('Set-Cookie headers:', setCookieHeaders);
    const cookies = setCookieHeaders.map(c => c.split(';')[0]).join('; ');
    
    if (!cookies.includes('next-auth.session-token') && !cookies.includes('next-auth.callback-url')) {
      console.warn('⚠️ next-auth cookie not found in response headers.');
    }
    
    console.log(`✅ Login response headers processed.`);


    // 3. Test access to dashboard page (using cookie)
    console.log('\n3. Accessing /dashboard page...');
    const dashboardRes = await request(`${BASE_URL}/dashboard`, {
      headers: { Cookie: cookies }
    });
    console.log(`Dashboard page status: ${dashboardRes.statusCode}`);
    if (dashboardRes.statusCode === 200) {
      console.log('✅ Dashboard page is accessible!');
    } else {
      console.log('❌ Dashboard page is not accessible (or redirected). Status:', dashboardRes.statusCode);
    }

    // 4. Test API beds endpoint
    console.log('\n4. Fetching beds API /api/beds?floor=2...');
    const bedsRes = await request(`${BASE_URL}/api/beds?floor=2`, {
      headers: { Cookie: cookies }
    });
    console.log(`Beds API status: ${bedsRes.statusCode}`);
    if (bedsRes.statusCode === 200) {
      const beds = JSON.parse(bedsRes.data);
      console.log(`✅ Beds API returned ${beds.length} beds.`);
      if (beds.length > 0) {
        console.log(`Sample Bed Code: ${beds[0].bedCode}, Status: ${beds[0].status}`);
      }
    } else {
      console.log('❌ Beds API returned error status:', bedsRes.statusCode, bedsRes.data);
    }

    // 5. Test Dashboard Stats API
    console.log('\n5. Fetching dashboard stats API /api/dashboard/stats...');
    const statsRes = await request(`${BASE_URL}/api/dashboard/stats`, {
      headers: { Cookie: cookies }
    });
    console.log(`Stats API status: ${statsRes.statusCode}`);
    if (statsRes.statusCode === 200) {
      const stats = JSON.parse(statsRes.data);
      console.log('✅ Stats API data:', JSON.stringify(stats, null, 2));
    } else {
      console.log('❌ Stats API returned error status:', statsRes.statusCode, statsRes.data);
    }

    // 6. Test User Management page access
    console.log('\n6. Accessing /user-management page...');
    const userRes = await request(`${BASE_URL}/user-management`, {
      headers: { Cookie: cookies }
    });
    console.log(`User Management page status: ${userRes.statusCode}`);
    if (userRes.statusCode === 200) {
      console.log('✅ User Management page is accessible!');
    } else {
      console.log('❌ User Management page is not accessible. Status:', userRes.statusCode);
    }

    // 7. Test Bed Update API (Assign Patient)
    console.log('\n7. Testing Bed Update API (Assign Patient)...');
    
    // First, let's get the bed list again
    const bedsListRes = await request(`${BASE_URL}/api/beds?floor=2`, {
      headers: { Cookie: cookies }
    });
    const beds = JSON.parse(bedsListRes.data);
    const testBed = beds.find(b => b.bedCode === 'L2-A1');
    
    if (!testBed) {
      throw new Error('Test bed L2-A1 not found in seeded data.');
    }
    
    console.log(`Initial Bed Status: ${testBed.bedCode} is ${testBed.status}`);
    
    // Assign patient
    console.log(`Assigning patient to ${testBed.bedCode}...`);
    const updateRes = await request(`${BASE_URL}/api/beds/${testBed.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        status: 'OCCUPIED',
        patientName: 'Budi Santoso',
        patientId: 'RM-100234',
        notes: 'Dialisis rutin mingguan',
      }),
    });
    
    console.log(`Bed Update PATCH response status: ${updateRes.statusCode}`);
    if (updateRes.statusCode !== 200) {
      throw new Error(`Failed to update bed: ${updateRes.data}`);
    }
    
    const updatedBed = JSON.parse(updateRes.data);
    console.log(`✅ Bed updated! New Status: ${updatedBed.status}, Patient: ${updatedBed.patientName}, Machine Status: ${updatedBed.machine ? updatedBed.machine.status : 'N/A'}`);
    
    // Verify stats updated
    console.log('Verifying stats updated...');
    const statsRes2 = await request(`${BASE_URL}/api/dashboard/stats`, {
      headers: { Cookie: cookies }
    });
    const stats2 = JSON.parse(statsRes2.data);
    console.log(`✅ New Stats - Occupied Beds: ${stats2.occupiedBeds}, Available Beds: ${stats2.availableBeds}`);
    
    if (stats2.occupiedBeds !== 1) {
      console.error('❌ Error: Stats did not update occupied beds count correctly!');
    } else {
      console.log('✅ Stats count is correct.');
    }
    
    // Restore bed to AVAILABLE
    console.log(`Restoring bed ${testBed.bedCode} to AVAILABLE...`);
    const restoreRes = await request(`${BASE_URL}/api/beds/${testBed.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        status: 'AVAILABLE',
        notes: '',
      }),
    });
    
    if (restoreRes.statusCode !== 200) {
      throw new Error(`Failed to restore bed: ${restoreRes.data}`);
    }
    
    const restoredBed = JSON.parse(restoreRes.data);
    console.log(`✅ Bed restored! Status: ${restoredBed.status}, Patient: ${restoredBed.patientName}, Machine Status: ${restoredBed.machine ? restoredBed.machine.status : 'N/A'}`);
    
    // Verify stats restored
    const statsRes3 = await request(`${BASE_URL}/api/dashboard/stats`, {
      headers: { Cookie: cookies }
    });
    const stats3 = JSON.parse(statsRes3.data);
    console.log(`✅ Restored Stats - Occupied Beds: ${stats3.occupiedBeds}, Available Beds: ${stats3.availableBeds}`);


  } catch (err) {
    console.error('❌ Verification failed:', err);
  }
}

runTests();
