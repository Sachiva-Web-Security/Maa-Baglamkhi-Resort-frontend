// Centralized environment configuration.
// All Vite env reads happen here so the rest of the codebase never imports
// `import.meta.env` directly.

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
  isDev: import.meta.env.DEV === true,
  isProd: import.meta.env.PROD === true,
};

export default config;