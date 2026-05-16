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

  const postData = '';
  const options = {
    hostname: 'accounts.zoho.com',
    path: `/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`,
    method: 'POST'
  };

  const { data } = await httpsRequest(options, postData);
  const json = JSON.parse(data);
  if (json.error) throw new Error(json.error);
  return json.access_token;
}

async function testEnroll() {
  try {
    const token = await getAccessToken();
    const url = process.env.MANAGEENGINE_URL.replace('https://', '');
    const hostname = url.split('/')[0];
    const path = '/' + url.split('/').slice(1).join('/') + '/enrollment';

    console.log(`Sending POST to: ${hostname}${path}`);
    
    const postData = JSON.stringify({
      user_name: "Test User",
      user_email: "test@tecnicell.com",
      phone_number: "3001234567",
      platform_type: 2,
      owned_by: 2
    });

    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Accept': 'application/vnd.manageengine.mdm.v1+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const res = await httpsRequest(options, postData);
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.data}`);
  } catch (e) {
    console.error("Script error:", e);
  }
}

testEnroll();
