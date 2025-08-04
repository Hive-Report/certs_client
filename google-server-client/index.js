// Server-to-server Google API client example
// 1. Помістіть service-account.json (Google private key) у цю папку
// 2. Встановіть залежності: npm install google-auth-library axios
// 3. Запустіть: npm start


require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');

// Шлях до service account JSON з .env або за замовчуванням
const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/your-protected-endpoint';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';

async function main() {
  // Створюємо GoogleAuth клієнт
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    // scopes: [], // scopes не потрібні для fetchIdToken!
  });

  // Отримуємо id_token для автентифікації
  const client = await auth.getClient();
  const idToken = await client.fetchIdToken(GOOGLE_CLIENT_ID);

  // Надсилаємо запит до бекенду з цим токеном
  try {
    const response = await axios.get(BACKEND_URL, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log('Response:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('Backend error:', err.response.status, err.response.data);
    } else {
      console.error('Request error:', err.message);
    }
  }
}

main();
