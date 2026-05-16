const fetch = require('node-fetch') || globalThis.fetch;

async function run() {
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', '1000.IQG9HQ9GTVPQKRVO5AQCZB3SLJ0JGQ');
  params.append('client_secret', '4fd68bc36f521e31bfe34a7e495ad33badb03b3958');
  params.append('code', '1000.4203c442dcd5019f32de39178938e228.a1c99b77ed68fc0703d19a000a7a4907');

  try {
    const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      body: params
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
