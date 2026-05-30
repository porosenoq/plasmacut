const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('cq_token');
}

async function request(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  register: (d) => request('POST', '/auth/register', d),
  login: (d) => request('POST', '/auth/login', d),
  me: () => request('GET', '/auth/me'),

  // Files
  uploadFile: (formData) => request('POST', '/files/upload', formData, true),
  getFiles: () => request('GET', '/files'),
  getFile: (id) => request('GET', `/files/${id}`),
  deleteFile: (id) => request('DELETE', `/files/${id}`),
  getSvgUrl: (id) => `${BASE}/files/${id}/svg`,

  // Quotes
  getQuoteConfig: () => request('GET', '/quotes/config'),
  calculateQuote: (d) => request('POST', '/quotes/calculate', d),
  saveQuote: (d) => request('POST', '/quotes', d),
  getQuotes: () => request('GET', '/quotes'),
  getQuote: (id) => request('GET', `/quotes/${id}`),
  deleteQuote: (id) => request('DELETE', `/quotes/${id}`),

  // Orders
  createOrder: (d) => request('POST', '/orders', d),
  getOrders: () => request('GET', '/orders'),
  getOrder: (id) => request('GET', `/orders/${id}`),
};
