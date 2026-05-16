require('dotenv').config();
const https = require('https');

const clientId = process.env.MANAGEENGINE_CLIENT_ID.trim();
const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET.trim();
const code = '1000.8879a46fe0230dbcdcf99f57298e80dc.84274180c65f2d9c8816fa1b1f9ed2e2'.trim();

const postData = new URLSearchParams({
  grant_type: 'authorization_code',
  client_id: clientId,
  client_secret: clientSecret,
  code: code
}).toString();

const options = {
  hostname: 'accounts.zoho.com',
  port: 443,
  path: '/oauth/v2/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("RESPONSE:", json);
      if (json.refresh_token) {
        console.log("REFRESH_TOKEN_FOUND=" + json.refresh_token);
      }
    } catch(e) {
      console.log("Raw Data:", data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(postData);
req.end();
