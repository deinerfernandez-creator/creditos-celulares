const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("==================================================");
console.log("    OBTENEDOR DE REFRESH TOKEN (ZOHO/MDM)         ");
console.log("==================================================");
console.log("IMPORTANTE: Asegúrate de estar usando el Client ID y Secret");
console.log("que pertenecen EXCLUSIVAMENTE a este 'Self Client'.\n");

rl.question("1. Pega tu Client ID: ", (clientId) => {
  rl.question("2. Pega tu Client Secret: ", (clientSecret) => {
    console.log("\nVe a Zoho, genera el código en este mismo Self Client");
    rl.question("3. Pega el Código aquí: ", (code) => {
      clientId = clientId.trim();
      clientSecret = clientSecret.trim();
      code = code.trim();

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
          console.log("\n--- RESPUESTA DE ZOHO ---");
          try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
            
            if (json.refresh_token) {
              console.log("\n✅ ¡ÉXITO! Copia tu refresh_token y ponlo en el archivo .env");
            } else if (json.error === 'invalid_code') {
              console.log("\n❌ ERROR: invalid_code.");
            }
          } catch(e) {
            console.log(data);
          }
          rl.close();
        });
      });

      req.on('error', (e) => {
        console.error(`Error de conexión: ${e.message}`);
        rl.close();
      });

      req.write(postData);
      req.end();
    });
  });
});
