require('dotenv').config();
const https = require('https');

function httpsRequest(options, postData = '') {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getAccessToken() {
  const clientId = process.env.MANAGEENGINE_CLIENT_ID;
  const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
  const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
  const postData = `grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`;
  const options = {
    hostname: 'accounts.zoho.com',
    path: '/oauth/v2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  const res = await httpsRequest(options, postData);
  return JSON.parse(res.data).access_token;
}

async function testLock() {
  try {
    const token = await getAccessToken();
    const hostname = 'mdm.manageengine.com';

    const deviceId = '180925000000426006'; // PRUEBA234
    
    console.log("Checking applicable actions for device...");
    const actionPath = `/api/v1/mdm/devices/${deviceId}/actions`;
    const actionOptions = {
      hostname, path: actionPath, method: 'GET',
      headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Accept': 'application/vnd.manageengine.mdm.v1+json' }
    };
    const actionRes = await httpsRequest(actionOptions);
    console.log("Applicable Actions:", actionRes.data);

    console.log("---");
    console.log("Testing resume_kiosk POST...");
    const commandPath = `/api/v1/mdm/devices/${deviceId}/actions/resume_kiosk`;
    const postData = JSON.stringify({});

    const postOptions = {
      hostname,
      path: commandPath,
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Accept': 'application/vnd.manageengine.mdm.v1+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const postRes = await httpsRequest(postOptions, postData);
    console.log(`Post Command Status: ${postRes.status}`);
    console.log(`Post Command Response: ${postRes.data}`);
  } catch (e) {
    console.error("Script error:", e);
  }
}

testLock();
