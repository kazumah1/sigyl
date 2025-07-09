const crypto = require('crypto');

function hashAPIKey(apiKey) {
  return crypto.createHmac('sha256', 'sigyl-api-secret').update(apiKey).digest('hex');
}

const apiKey = 'sk_7eb4b4c08a389f731d77834bea83d5483669077c86537920dbf75c242e55706f';
console.log('Node.js hash:', hashAPIKey(apiKey));