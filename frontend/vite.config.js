import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend lives in /frontend; production assets build to /frontend/dist, which
// Spring Boot serves as static resources (see application.properties).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Dev server proxies API calls to the Spring Boot backend on 8081 so the
    // browser sees a single origin and the inkly_token cookie stays same-site.
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
