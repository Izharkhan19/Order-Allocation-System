const API_URL = 'http://localhost:5000';

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.errors?.[0]?.msg || 'Something went wrong');
  }

  return data;
};
