require('dotenv').config();
const https = require('https');

function httpsRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
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
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data).access_token));
    });
    req.write(postData); req.end();
  });
}

async function listAllDevices() {
  const token = await getAccessToken();
  const options = {
    hostname: 'mdm.manageengine.com',
    path: '/api/v1/mdm/devices',
    method: 'GET',
    headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Accept': 'application/vnd.manageengine.mdm.v1+json' }
  };
  const res = await httpsRequest(options);
  const data = JSON.parse(res.data);
  const devices = data.devices || [];
  console.log("Devices in ManageEngine:");
  devices.forEach(d => {
      console.log(`- ID: ${d.device_id}, Name: ${d.device_name}, IMEI: ${JSON.stringify(d.imei)}`);
  });
}

listAllDevices();
