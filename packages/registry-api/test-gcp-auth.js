const { GoogleAuth } = require('google-auth-library');

async function main() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const headers = await client.getRequestHeaders();
  console.log('Headers:', headers);

  if (!headers.authorization && !headers.get('authorization')) {
    throw new Error('Authorization header is missing. Make sure your credentials are valid.');
  }

  const token = (headers.authorization || headers.get('authorization')).replace('Bearer ', '');
  console.log('Access token:', token);
}

main().catch(console.error);