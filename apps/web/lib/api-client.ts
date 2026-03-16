import type { ApiResponse } from '@/types';
import { getErrorMessage, isAuthError } from './error-messages';

/**
 * API base URL from environment
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Default request timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 30_000;

/**
 * Max retries for retryable errors
 */
const MAX_RETRIES = 3;

/**
 * Token refresh state to prevent multiple concurrent refresh attempts
 */
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return getErrorMessage(this.code);
  }

  /**
   * Check if this is an authentication error requiring re-login
   */
  isAuthError(): boolean {
    return isAuthError(this.code);
  }
}

/**
 * Network error class for offline/connectivity failures
 */
export class NetworkError extends Error {
  constructor(message: string = 'Нет подключения к сети') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Check if an error is a network/connectivity failure
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('networkerror') ||
      msg.includes('load failed')
    );
  }
  return false;
}

/**
 * Check if an HTTP status code is retryable
 */
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Sleep for exponential backoff: 1s, 2s, 4s
 */
function backoffDelay(attempt: number): Promise<void> {
  const ms = Math.min(1000 * 2 ** attempt, 8000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Request configuration options
 */
interface RequestConfig extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  skipRefresh?: boolean; // Skip auto-refresh for this request
  skipAuth?: boolean; // Skip auth header for this request
  timeout?: number; // Request timeout in ms (default: 30s)
  retries?: number; // Max retry attempts (default: 3 for GET, 0 for mutations)
}

/**
 * Get auth token from storage (client-side only)
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.accessToken || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Get refresh token from storage (client-side only)
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.refreshToken || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Update tokens in storage
 */
function setTokens(accessToken: string, refreshToken?: string, sessionId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      parsed.state = {
        ...parsed.state,
        accessToken,
        refreshToken: refreshToken || parsed.state?.refreshToken,
        sessionId: sessionId || parsed.state?.sessionId,
      };
      localStorage.setItem('mp-auth-storage', JSON.stringify(parsed));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Clear auth state (on failed refresh)
 */
function clearAuthState(): void {
  if (typeof window === 'undefined') return;

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      parsed.state = {
        ...parsed.state,
        accessToken: null,
        refreshToken: null,
        sessionId: null,
        isAuthenticated: false,
        user: null,
      };
      localStorage.setItem('mp-auth-storage', JSON.stringify(parsed));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Attempt to refresh the access token
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for that result
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        clearAuthState();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data?.accessToken) {
        setTokens(data.data.accessToken, data.data.refreshToken, data.data.sessionId);
        return true;
      }

      clearAuthState();
      return false;
    } catch {
      clearAuthState();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Redirect to login page
 */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return;

  // Store current URL for redirect after login
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/login') {
    sessionStorage.setItem('mp-redirect-after-login', currentPath);
  }

  window.location.href = '/login';
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Execute a single fetch with AbortController timeout
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Превышено время ожидания запроса', 408, 'SRV_003');
    }
    if (isNetworkError(error)) {
      throw new NetworkError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make an API request with automatic token refresh, retry, and timeout
 */
async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const {
    params,
    body,
    headers: customHeaders,
    skipRefresh,
    skipAuth,
    timeout = DEFAULT_TIMEOUT,
    retries,
    ...init
  } = config;

  const method = (init.method || 'GET').toUpperCase();
  // Default: retry GETs up to MAX_RETRIES, no retries for mutations
  const maxRetries = retries ?? (method === 'GET' ? MAX_RETRIES : 0);

  // Build URL with query params
  const url = buildUrl(endpoint, params);

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...customHeaders,
  };

  // Add auth token if available (client-side only)
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOpts: RequestInit = {
    ...init,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  };

  // Retry loop
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let response = await fetchWithTimeout(url, fetchOpts, timeout);

      // Handle 401 - attempt token refresh (only on first attempt)
      if (response.status === 401 && !skipRefresh && !skipAuth && attempt === 0) {
        const refreshed = await attemptTokenRefresh();

        if (refreshed) {
          const newToken = getAuthToken();
          if (newToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
            fetchOpts.headers = headers;
          }
          response = await fetchWithTimeout(url, fetchOpts, timeout);
        } else {
          redirectToLogin();
          throw new ApiError('Session expired', 401, 'AUTH_002');
        }
      }

      // Parse response
      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle errors
      if (!response.ok) {
        const errorData = data as {
          message?: string;
          code?: string;
          details?: Record<string, string[]>;
        };
        const apiError = new ApiError(
          errorData?.message || `Request failed with status ${response.status}`,
          response.status,
          errorData?.code,
          errorData?.details
        );

        // Retry on retryable status codes
        if (isRetryableStatus(response.status) && attempt < maxRetries) {
          lastError = apiError;
          await backoffDelay(attempt);
          continue;
        }

        throw apiError;
      }

      return data as T;
    } catch (error) {
      // Don't retry auth errors or non-retryable ApiErrors
      if (error instanceof ApiError && !isRetryableStatus(error.status)) {
        throw error;
      }

      // Retry on network errors
      if (isNetworkError(error) && attempt < maxRetries) {
        lastError = error;
        await backoffDelay(attempt);
        continue;
      }

      // Last attempt — throw
      if (attempt >= maxRetries) {
        throw error;
      }

      lastError = error;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new ApiError('Request failed', 500, 'SRV_001');
}

/**
 * API client with typed methods
 */
export const api = {
  /**
   * GET request
   */
  get<T>(endpoint: string, config?: Omit<RequestConfig, 'body'>): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'GET' });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'POST', body: data });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'PUT', body: data });
  },

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'PATCH', body: data });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'DELETE' });
  },

  /**
   * Upload file with multipart/form-data
   */
  async upload<T>(endpoint: string, formData: FormData, config?: Omit<RequestConfig, 'body'>): Promise<ApiResponse<T>> {
    const { headers: customHeaders, skipAuth, ...init } = config || {};

    const url = buildUrl(endpoint);

    const headers: HeadersInit = {
      // Don't set Content-Type for FormData - browser will set it with boundary
      'Accept': 'application/json',
      ...customHeaders,
    };

    // Add auth token
    if (!skipAuth) {
      const token = getAuthToken();
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    }

    let response = await fetch(url, {
      ...init,
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    // Handle 401 - attempt token refresh
    if (response.status === 401 && !skipAuth) {
      const refreshed = await attemptTokenRefresh();

      if (refreshed) {
        const newToken = getAuthToken();
        if (newToken) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        }

        response = await fetch(url, {
          ...init,
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });
      } else {
        redirectToLogin();
        throw new ApiError('Session expired', 401, 'AUTH_002');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data?.message || 'Upload failed',
        response.status,
        data?.code,
        data?.details
      );
    }

    return data as ApiResponse<T>;
  },
};

/**
 * Type-safe API endpoints
 */
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: (token: string) => `/auth/verify-email/${token}`,
  },

  // Users
  users: {
    me: '/users/me',
    profile: '/users/me/profile',
    password: '/users/me/password',
    uploadAvatar: '/users/me/avatar',
    verification: '/users/me/verification',
    verificationStatus: '/users/me/verification/status',
  },

  // Content
  content: {
    list: '/content',
    detail: (slug: string) => `/content/${slug}`,
    featured: '/content/featured',
    search: '/content/search',
  },

  // Series
  series: {
    list: '/series',
    detail: (slug: string) => `/series/${slug}`,
    episodes: (seriesId: string) => `/series/${seriesId}/episodes`,
  },

  // Categories
  categories: {
    list: '/categories',
    tree: '/categories/tree',
  },

  // Watch history
  watchHistory: {
    list: '/users/me/watch-history',
    continueWatching: '/users/me/watch-history/continue',
    updateProgress: (contentId: string) => `/users/me/watch-history/${contentId}/progress`,
  },

  // Subscriptions
  subscriptions: {
    plans: '/subscriptions/plans',
    plan: (id: string) => `/subscriptions/plans/${id}`,
    my: '/subscriptions/my',
    purchase: '/subscriptions/purchase',
    cancel: '/subscriptions/cancel',
    autoRenew: '/subscriptions/auto-renew',
    checkAccess: (contentId: string) => `/subscriptions/access/${contentId}`,
  },

  // Payments
  payments: {
    initiate: '/payments/initiate',
    status: (transactionId: string) => `/payments/status/${transactionId}`,
    transactions: '/payments/transactions',
    refund: '/payments/refund',
    complete: (transactionId: string) => `/payments/complete/${transactionId}`,
  },

  // Partners
  partners: {
    // Public
    levels: '/partners/levels',
    // User partner dashboard
    dashboard: '/partners/dashboard',
    referrals: '/partners/referrals',
    commissions: '/partners/commissions',
    commission: (id: string) => `/partners/commissions/${id}`,
    balance: '/partners/balance',
    withdrawals: '/partners/withdrawals',
    withdrawal: (id: string) => `/partners/withdrawals/${id}`,
    createWithdrawal: '/partners/withdrawals',
    taxPreview: '/partners/tax-preview',
    paymentMethods: '/partners/payment-methods',
    addPaymentMethod: '/partners/payment-methods',
    deletePaymentMethod: (id: string) => `/partners/payment-methods/${id}`,
  },

  // Admin Partners
  adminPartners: {
    // Partners management
    list: '/admin/partners',
    stats: '/admin/partners/stats',
    detail: (userId: string) => `/admin/partners/${userId}`,
    // Commission management
    commissions: '/admin/partners/commissions',
    approveCommission: (id: string) => `/admin/partners/commissions/${id}/approve`,
    rejectCommission: (id: string) => `/admin/partners/commissions/${id}/reject`,
    approveCommissionsBatch: '/admin/partners/commissions/approve-batch',
    // Withdrawal management
    withdrawalStats: '/admin/partners/withdrawals/stats',
    withdrawals: '/admin/partners/withdrawals',
    withdrawalDetail: (id: string) => `/admin/partners/withdrawals/${id}`,
    approveWithdrawal: (id: string) => `/admin/partners/withdrawals/${id}/approve`,
    rejectWithdrawal: (id: string) => `/admin/partners/withdrawals/${id}/reject`,
    completeWithdrawal: (id: string) => `/admin/partners/withdrawals/${id}/complete`,
  },

  // Bonuses
  bonuses: {
    balance: '/bonuses/balance',
    statistics: '/bonuses/statistics',
    transactions: '/bonuses/transactions',
    expiring: '/bonuses/expiring',
    maxApplicable: '/bonuses/max-applicable',
    withdrawalPreview: '/bonuses/withdrawal-preview',
    withdraw: '/bonuses/withdraw',
    rate: '/bonuses/rate',
  },

  // Admin Bonuses
  adminBonuses: {
    stats: '/admin/bonuses/stats',
    rates: '/admin/bonuses/rates',
    rate: (id: string) => `/admin/bonuses/rates/${id}`,
    campaigns: '/admin/bonuses/campaigns',
    campaign: (id: string) => `/admin/bonuses/campaigns/${id}`,
    executeCampaign: (id: string) => `/admin/bonuses/campaigns/${id}/execute`,
    cancelCampaign: (id: string) => `/admin/bonuses/campaigns/${id}/cancel`,
    userDetails: (userId: string) => `/admin/bonuses/users/${userId}`,
    adjustUserBalance: (userId: string) => `/admin/bonuses/users/${userId}/adjust`,
    export: '/admin/bonuses/export',
  },

  // Store
  store: {
    products: '/store/products',
    productById: (id: string) => `/store/products/${id}`,
    productBySlug: (slug: string) => `/store/products/slug/${slug}`,
    categories: '/store/products/categories',
    cart: '/store/cart',
    cartSummary: '/store/cart/summary',
    cartItems: '/store/cart/items',
    cartItem: (productId: string) => `/store/cart/items/${productId}`,
    orders: '/store/orders',
    order: (id: string) => `/store/orders/${id}`,
    cancelOrder: (id: string) => `/store/orders/${id}/cancel`,
  },

  // Users - Watchlist & Sessions
  userWatchlist: {
    list: '/users/me/watchlist',
    add: '/users/me/watchlist',
    remove: (contentId: string) => `/users/me/watchlist/${contentId}`,
  },
  userSessions: {
    list: '/users/me/sessions',
    terminate: (sessionId: string) => `/users/me/sessions/${sessionId}`,
    terminateAll: '/users/me/sessions',
  },

  // Notifications
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    unreadCount: '/notifications/unread-count',
    preferences: '/notifications/preferences',
    delete: (id: string) => `/notifications/${id}`,
    deleteAll: '/notifications',
  },

  // Documents
  documents: {
    list: '/documents',
    detail: (type: string) => `/documents/${type}`,
    accept: (type: string) => `/documents/${type}/accept`,
    pending: '/documents/pending',
  },

  // Admin Notifications
  adminNotifications: {
    templates: '/admin/notifications/templates',
    template: (id: string) => `/admin/notifications/templates/${id}`,
    send: '/admin/notifications/send',
    newsletters: '/admin/notifications/newsletters',
    newsletter: (id: string) => `/admin/notifications/newsletters/${id}`,
    sendNewsletter: (id: string) => `/admin/notifications/newsletters/${id}/send`,
    scheduleNewsletter: (id: string) => `/admin/notifications/newsletters/${id}/schedule`,
    cancelNewsletter: (id: string) => `/admin/notifications/newsletters/${id}/cancel`,
  },

  // Admin Documents
  adminDocuments: {
    list: '/admin/documents',
    detail: (id: string) => `/admin/documents/${id}`,
    publish: (id: string) => `/admin/documents/${id}/publish`,
    deactivate: (id: string) => `/admin/documents/${id}/deactivate`,
    acceptances: (id: string) => `/admin/documents/${id}/acceptances`,
    versions: (type: string) => `/admin/documents/types/${type}/versions`,
  },

  // Admin Audit
  adminAudit: {
    list: '/admin/audit',
    detail: (id: string) => `/admin/audit/${id}`,
  },

  // Admin Payments
  adminPayments: {
    transactions: '/admin/payments/transactions',
    transaction: (id: string) => `/admin/payments/transactions/${id}`,
    refund: (id: string) => `/admin/payments/transactions/${id}/refund`,
    stats: '/admin/payments/stats',
  },

  // Admin Content
  adminContent: {
    list: '/admin/content',
    detail: (id: string) => `/admin/content/${id}`,
    create: '/admin/content',
    update: (id: string) => `/admin/content/${id}`,
    delete: (id: string) => `/admin/content/${id}`,
  },

  // Admin Dashboard
  adminDashboard: {
    overview: '/admin/dashboard',
    stats: '/admin/dashboard/stats',
  },

  // Admin Store
  adminStore: {
    products: '/admin/store/products',
    product: (id: string) => `/admin/store/products/${id}`,
    productStats: '/admin/store/products/stats',
    categories: '/admin/store/categories',
    category: (id: string) => `/admin/store/categories/${id}`,
    orders: '/admin/store/orders',
    order: (id: string) => `/admin/store/orders/${id}`,
    orderStatus: (id: string) => `/admin/store/orders/${id}/status`,
    orderStats: '/admin/store/orders/stats',
  },

  // Streaming
  streaming: {
    url: (contentId: string) => `/content/${contentId}/stream`,
  },

  // Admin Video
  adminVideo: {
    upload: (contentId: string) => `/admin/content/${contentId}/video/upload`,
    uploadUrl: (contentId: string) => `/admin/content/${contentId}/video/upload-url`,
    status: (contentId: string) => `/admin/content/${contentId}/video/status`,
    delete: (contentId: string) => `/admin/content/${contentId}/video`,
    thumbnails: (contentId: string) => `/admin/content/${contentId}/video/thumbnails`,
  },

  // Upload
  upload: {
    image: '/upload/image',
    video: '/upload/video',
  },

  // Admin Users
  adminUsers: {
    list: '/admin/users',
    detail: (userId: string) => `/admin/users/${userId}`,
    update: (userId: string) => `/admin/users/${userId}`,
  },

  // Genres
  genres: {
    list: '/genres',
    detail: (id: string) => `/genres/${id}`,
    bySlug: (slug: string) => `/genres/slug/${slug}`,
  },

  // User Genre Preferences
  userGenres: {
    list: '/users/me/genres',
    add: '/users/me/genres',
    update: (preferenceId: string) => `/users/me/genres/${preferenceId}`,
    remove: (preferenceId: string) => `/users/me/genres/${preferenceId}`,
    reorder: '/users/me/genres/reorder',
  },
} as const;
