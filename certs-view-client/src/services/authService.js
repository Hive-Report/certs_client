import config from '../config/config.js';

const TOKEN_KEY = config.STORAGE_KEYS.AUTH_TOKEN;
const TOKEN_EXPIRY_KEY = 'authTokenExpiry';

// Try to silently re-auth if the token has less than this many seconds left.
const PROACTIVE_REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

/**
 * Central auth service.
 *
 * Responsibilities:
 *  - Store / retrieve the backend JWT (and its expiry) in localStorage.
 *  - Exchange a Google ID token for a backend JWT via POST /api/auth/google.
 *  - Silently refresh the backend JWT using the Google Identity Services SDK
 *    (google.accounts.id.prompt) without showing any UI to the user.
 *  - Expose helpers used by apiService to decide when to refresh.
 */
class AuthService {
  // ── Token storage ─────────────────────────────────────────────────────────

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token, expiresInSeconds) {
    localStorage.setItem(TOKEN_KEY, token);
    const expiryMs = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryMs));
  }

  /**
   * Returns true when the stored token will expire within the proactive
   * refresh threshold (or when no expiry information is available).
   */
  isTokenExpiringSoon() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    // No expiry stored means this is an old/legacy session token.
    // Don't proactively refresh — the reactive 401 handler will take over if needed.
    if (!expiry) return false;
    return Date.now() > Number(expiry) - PROACTIVE_REFRESH_THRESHOLD_SECONDS * 1000;
  }

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(config.STORAGE_KEYS.USER);
    localStorage.removeItem(config.STORAGE_KEYS.USERNAME);
    localStorage.removeItem(config.STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem('avatarUrl');
  }

  // ── Token exchange ────────────────────────────────────────────────────────

  /**
   * Sends the Google ID token to the backend and stores the returned
   * backend JWT. Returns the full response payload { success, token, expiresIn, user }.
   */
  async exchangeGoogleToken(idToken) {
    const response = await fetch(`${config.API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to exchange Google token');
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Auth failed');

    this.setToken(data.token, data.expiresIn);
    return data;
  }

  // ── Silent refresh ────────────────────────────────────────────────────────

  /**
   * Attempts a silent re-authentication using the Google Identity Services
   * One Tap prompt. This succeeds without any user interaction as long as
   * the user still has an active Google session in the browser.
   *
   * On success the new backend JWT is stored and the full payload is resolved.
   * On failure (Google session gone, cookies cleared, etc.) the promise rejects —
   * callers should treat this as a hard logout and redirect to the login page.
   *
   * Implementation note: google.accounts.id.initialize() is called again
   * with a temporary one-shot callback so we can wrap the async result in a
   * Promise. Because GoogleLoginButton is only rendered while the user is
   * logged OUT, there is no conflict with the login-page callback.
   * When the user logs out and GoogleLoginButton mounts again its useEffect
   * calls initialize() once more, restoring the login callback.
   */
  silentRefresh() {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.id) {
        reject(new Error('Google SDK not available'));
        return;
      }

      let settled = false;
      const settle = (fn, value) => {
        if (!settled) {
          settled = true;
          fn(value);
        }
      };

      window.google.accounts.id.initialize({
        client_id: config.GOOGLE_CLIENT_ID,
        // auto_select: true tells the SDK to sign the user in silently
        // (One Tap) without showing the account chooser UI.
        auto_select: true,
        callback: async (response) => {
          try {
            const data = await this.exchangeGoogleToken(response.credential);
            settle(resolve, data);
          } catch (err) {
            settle(reject, err);
          }
        },
      });

      window.google.accounts.id.prompt((notification) => {
        // isNotDisplayed  – browser blocked the prompt (e.g. ITP / user dismissed)
        // isSkippedMoment – no eligible Google account found in this browser
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          settle(reject, new Error('Silent refresh not available'));
        }
      });
    });
  }
}

const authService = new AuthService();
export default authService;
