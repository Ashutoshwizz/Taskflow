// ==========================================
// API Module — centralised fetch wrapper
// ==========================================
const API_BASE = "https://lovely-healing-production-cc7a.up.railway.app";

const api = {
  _token() {
    return localStorage.getItem('tf_token');
  },

  _headers(json = true) {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    const t = this._token();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  },

 async request(method, path, body = null) {
  const opts = { method, headers: this._headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  const text = await res.text();               // ⭐ safe read
  const data = text ? JSON.parse(text) : {};   // ⭐ safe parse

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
},

  get:    (path)       => api.request('GET', path),
  post:   (path, body) => api.request('POST', path, body),
  put:    (path, body) => api.request('PUT', path, body),
  delete: (path)       => api.request('DELETE', path),
};
