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
  return json.access_token;
}

async function testLock() {
  try {
    const token = await getAccessToken();
    const urlStr = process.env.MANAGEENGINE_URL.replace('https://', '');
    const hostname = urlStr.split('/')[0];
    const basePath = '/' + urlStr.split('/').slice(1).join('/');

    const searchPath = `${basePath}/devices`;
    const getOptions = {
      hostname,
      path: searchPath,
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Accept': 'application/vnd.manageengine.mdm.v1+json'
      }
    };
    const getRes = await httpsRequest(getOptions);
    const devicesData = JSON.parse(getRes.data);
    const deviceId = devicesData.devices[0].device_id;
    console.log(`Using Device ID: ${deviceId}`);

    // Try new actions endpoint
    const commandName = "EnableLostMode"; // or "LostMode"
    const commandPath = `${basePath}/actions/LostMode`;
    console.log(`Sending POST to: ${hostname}${commandPath}`);
    
    const postData = JSON.stringify({
      device_ids: [deviceId],
      lock_message: "Prueba de bloqueo",
      phone_number: "3000000000"
    });

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
