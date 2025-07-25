import config from '../config/config.js';

/**
 * API Service для централізованого управління запитами
 */
class ApiService {
  constructor() {
    this.baseUrl = config.API_BASE_URL;
    this.endpoints = config.API_ENDPOINTS;
  }

  /**
   * Базовий метод для HTTP запитів
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Додаємо токен авторизації якщо він є
    const token = localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      defaultOptions.headers.Authorization = `Bearer ${token}`;
    }

    const requestOptions = {
      ...defaultOptions,
      ...options
    };

    try {
      console.log('Making request to:', url, 'with options:', requestOptions);
      const response = await fetch(url, requestOptions);
      console.log('Response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'API request failed');
      }
      
      // Якщо токен недійсний, очищаємо localStorage
      if (response.status === 401) {
        this.clearAuth();
      }
      
      return response;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * GET запит
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST запит
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT запит
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE запит
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Очищення даних авторизації
   */
  clearAuth() {
    localStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.USER);
    localStorage.removeItem(config.STORAGE_KEYS.USERNAME);
    localStorage.removeItem(config.STORAGE_KEYS.IS_AUTHENTICATED);
  }

  // === AUTH ENDPOINTS ===
  
  /**
   * Авторизація користувача
   */
  async login(credentials) {
    const response = await this.post(this.endpoints.AUTH.LOGIN, credentials);
    return response.json();
  }

  /**
   * Реєстрація користувача
   */
  async register(userData) {
    const response = await this.post(this.endpoints.AUTH.REGISTER, userData);
    return response.json();
  }

  /**
   * Верифікація токена
   */
  async verifyToken(token) {
    const response = await this.post(this.endpoints.AUTH.VERIFY, { token });
    return response.json();
  }

  /**
   * Отримання профілю користувача
   */
  async getProfile() {
    const response = await this.get(this.endpoints.AUTH.PROFILE);
    return response.json();
  }

  /**
   * Логаут
   */
  async logout() {
    const response = await this.post(this.endpoints.AUTH.LOGOUT);
    this.clearAuth();
    return response.json();
  }

  /**
   * Надсилання Google ID Token на бекенд
   */
  async postGoogleToken(idToken) {
    // Використовуємо endpoint /api/auth/google
    const response = await this.post('/api/auth/google', { idToken });
    return response.json();
  }

  // === CERTS ENDPOINTS ===

  /**
   * Пошук сертифікатів
   */
  async searchCerts(edrpou) {
    const response = await this.get(`${this.endpoints.CERTS.SEARCH}/${edrpou}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Сесія закінчилась. Будь ласка, авторизуйтесь знову.');
      }
      throw new Error(`Помилка сервера: ${response.status}`);
    }
    
    return response.json();
  }
}

// Створюємо singleton instance
const apiService = new ApiService();

export default apiService;
