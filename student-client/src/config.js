// Single source of truth for the API base URL.
// All requests are built from this value — never hard-code the full URL inline.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default API_BASE_URL;
