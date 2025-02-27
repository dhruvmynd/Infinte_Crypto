import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Ensure external dependencies are properly handled
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          thirdweb: ['@thirdweb-dev/react', '@thirdweb-dev/sdk', '@thirdweb-dev/chains'],
        }
      }
    }
  }
});