import config from '../config/config.js';
import authService from './authService.js';

/**
 * API Service для централізованого управління запитами
 */
class ApiService {
  constructor() {
    this.baseUrl = config.API_BASE_URL;
    this.endpoints = config.API_ENDPOINTS;
  }

  /**
   * Базовий метод для HTTP запитів.
   *
   * Token refresh strategy:
   *  1. Before the request: if the stored backend JWT is within 5 minutes of
   *     expiry, attempt a silent refresh proactively so the request never hits
   *     a 401 in the first place.
   *  2. After a 401 response: attempt a silent refresh once, then retry the
   *     original request with the new token.
   *  3. If silent refresh is unavailable (Google session gone), clear auth
   *     state and fire the 'auth:session-expired' event so App.js can redirect
   *     the user to the login page.
   *
   * The `_isRetry` parameter is internal — callers should never pass it.
   */
  async request(endpoint, options = {}, _isRetry = false) {
    const url = `${this.baseUrl}${endpoint}`;

    // ── Proactive refresh (only on first attempt) ──────────────────────────
    if (!_isRetry && authService.getToken() && authService.isTokenExpiringSoon()) {
      try {
        await authService.silentRefresh();
      } catch {
        // Proactive refresh failed – proceed with the existing token.
        // If it is truly expired the 401 handler below will deal with it.
      }
    }

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Додаємо токен авторизації якщо він є
    const token = authService.getToken();
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

      // ── Reactive refresh on 401 ──────────────────────────────────────────
      if (response.status === 401 && !_isRetry) {
        try {
          await authService.silentRefresh();
          // Retry with the fresh token (isRetry = true prevents infinite loop).
          return this.request(endpoint, options, true);
        } catch {
          // Silent refresh unavailable – force logout.
          authService.clearAuth();
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
          throw new Error('Сесія закінчилась. Будь ласка, авторизуйтесь знову.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'API request failed');
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
    authService.clearAuth();
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

  // === MEDOC ENDPOINTS ===

  /**
   * Пошук ліцензій MedDoc
   */
  async searchMedoc(edrpou) {
    const response = await this.get(`${this.endpoints.MEDOC.SEARCH}/${edrpou}`);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Сесія закінчилась. Будь ласка, авторизуйтесь знову.');
      }
      throw new Error(`Помилка сервера: ${response.status}`);
    }

    return response.json();
  }

  // === CERT PAYMENTS ENDPOINTS ===

  /**
   * Пошук оплат КЕП у cert.suzs.info
   * @param {string} queryString - URLSearchParams string
   */
  async searchCertPayments(queryString) {
    const response = await this.get(`${this.endpoints.CERT_PAYMENTS.SEARCH}?${queryString}`);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Сесія закінчилась. Будь ласка, авторизуйтесь знову.');
      }
      throw new Error(`Помилка сервера: ${response.status}`);
    }

    return response.json();
  }

  // === USPACY ENDPOINTS ===

  /**
   * Знайти ID компанії в Uspacy CRM за кодом ЄДРПОУ.
   * Повертає { companyId: number | null }.
   * @param {string} edrpou
   */
  async getUspacyCompanyId(edrpou) {
    try {
      const response = await this.get(`${this.endpoints.USPACY.COMPANY_ID}?edrpou=${encodeURIComponent(edrpou)}`);
      if (!response.ok) return { companyId: null };
      return response.json();
    } catch {
      return { companyId: null };
    }
  }
}

// Створюємо singleton instance
const apiService = new ApiService();

export default apiService;
