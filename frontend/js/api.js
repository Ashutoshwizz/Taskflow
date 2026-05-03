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
  const token = localStorage.getItem('tf_token');

  const headers = {
    'Content-Type': 'application/json'
  };

  // ✅ Always attach token if present
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = {
    method,
    headers
  };

  if (body) {
    opts.body = JSON.stringify(body);
  }

  const url = `${API_BASE}${path}`;

  console.log("👉 URL:", url);
  console.log("👉 TOKEN:", token);

  const res = await fetch(url, opts);

  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("❌ Non-JSON response:", text);
    throw new Error("Server returned HTML instead of JSON");
  }

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
