import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Request interceptor to automatically route calls to deployed backend URL if VITE_API_BASE_URL is configured
axios.interceptors.request.use((config) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl && config.url) {
    if (config.url.startsWith('http://127.0.0.1:5000')) {
      config.url = config.url.replace('http://127.0.0.1:5000', apiBaseUrl);
    } else if (config.url.startsWith('http://localhost:5000')) {
      config.url = config.url.replace('http://localhost:5000', apiBaseUrl);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

createRoot(document.getElementById('root')).render(<App />)
