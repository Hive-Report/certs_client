// Configuration for the application
const config = {
  // API Configuration - читаємо з build-time змінних
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://certs-api.onrender.com',
  GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  API_ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      VERIFY: '/api/auth/verify',
      PROFILE: '/api/auth/profile'
    },
    CERTS: {
      SEARCH: '/api/certs'
    }
  },
  
  // Application Settings
  APP_NAME: 'Certs Search System',
  APP_VERSION: '1.0.0',
  
  // Local Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'authToken',
    USER: 'user',
    USERNAME: 'username',
    IS_AUTHENTICATED: 'isAuthenticated'
  },
  
  // UI Configuration
  UI: {
    LOADING_DELAY: 300,
    NOTIFICATION_DURATION: 5000
  }
};

export default config;
