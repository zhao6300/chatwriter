import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
});
