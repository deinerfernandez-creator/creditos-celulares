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
    
    const androidDevice = devicesData.devices.find(d => d.imei);
    const imeiArray = androidDevice.imei;
    const imei = Array.isArray(imeiArray) ? imeiArray[0] : imeiArray;
    console.log("Device IMEI is:", imei);

    // Test search_name
    const s1 = await httpsRequest({
      hostname, path: `${basePath}/devices?search_name=${imei}`, method: 'GET',
      headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Accept': 'application/vnd.manageengine.mdm.v1+json' }
    });
    console.log("?search_name found:", JSON.parse(s1.data).devices ? JSON.parse(s1.data).devices.length : 0);

    // Test search
    const s2 = await httpsRequest({
      hostname, path: `${basePath}/devices?search=${imei}`, method: 'GET',
      headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Accept': 'application/vnd.manageengine.mdm.v1+json' }
    });
    console.log("?search found:", JSON.parse(s2.data).devices ? JSON.parse(s2.data).devices.length : 0);

    // Test imei
    const s3 = await httpsRequest({
      hostname, path: `${basePath}/devices?imei=${imei}`, method: 'GET',
      headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Accept': 'application/vnd.manageengine.mdm.v1+json' }
    });
    console.log("?imei found:", JSON.parse(s3.data).devices ? JSON.parse(s3.data).devices.length : 0);

  } catch (e) {
    console.error("Script error:", e);
  }
}

testLock();
