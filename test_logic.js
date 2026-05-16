require('dotenv').config();
const https = require('https');

function httpsRequest(options, postData='') {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if(postData) req.write(postData);
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

async function getDeviceByImei(imei) {
  const token = await getAccessToken();
  const hostname = 'mdm.manageengine.com';
  const headers = { 'Authorization': `Zoho-oauthtoken ${token}`, 'Accept': 'application/vnd.manageengine.mdm.v1+json' };

  console.log("Trying primary search...");
  const searchUrl = `/api/v1/mdm/devices?search=${imei}`;
  const res1 = await httpsRequest({ hostname, path: searchUrl, method: 'GET', headers });
  console.log("Search Status:", res1.status);
  if (res1.status === 200 && res1.data) {
      const data = JSON.parse(res1.data);
      if (data.devices) {
          const device = data.devices.find(d => d.imei === imei || (Array.isArray(d.imei) && d.imei.includes(imei)));
          if (device) return device;
      }
  }

  console.log("Trying fallback...");
  const fallbackUrl = `/api/v1/mdm/devices`;
  const res2 = await httpsRequest({ hostname, path: fallbackUrl, method: 'GET', headers });
  console.log("Fallback Status:", res2.status);
  if (res2.status === 200 && res2.data) {
      const data = JSON.parse(res2.data);
      if (data.devices) {
          const device = data.devices.find(d => d.imei === imei || (Array.isArray(d.imei) && d.imei.includes(imei)));
          if (device) return device;
      }
  }

  return null;
}

getDeviceByImei('355552110781631').then(res => {
    console.log("Result:", res);
});
