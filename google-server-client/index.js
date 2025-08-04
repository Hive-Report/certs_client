// Server-to-server Google API client example
// 1. Помістіть service-account.json (Google private key) у цю папку
// 2. Встановіть залежності: npm install google-auth-library axios
// 3. Запустіть: npm start


require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');

const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/your-protected-endpoint';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';

class GoogleTokenManager {
  constructor(serviceAccountPath, clientId) {
    this.auth = new GoogleAuth({ keyFile: serviceAccountPath });
    this.clientId = clientId;
    this._client = null;
    this._token = null;
    this._tokenExp = 0;
  }

  async getClient() {
    if (!this._client) {
      this._client = await this.auth.getClient();
    }
    return this._client;
  }

  async getIdToken() {
    const now = Math.floor(Date.now() / 1000);
    if (this._token && now < this._tokenExp - 60) {
      return this._token;
    }
    const client = await this.getClient();
    const idToken = await client.fetchIdToken(this.clientId);
    // Decode JWT to get exp
    const [, payloadB64] = idToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    this._token = idToken;
    this._tokenExp = payload.exp;
    return idToken;
  }
}

async function main() {
  const tokenManager = new GoogleTokenManager(SERVICE_ACCOUNT_PATH, GOOGLE_CLIENT_ID);
  const idToken = await tokenManager.getIdToken();

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
