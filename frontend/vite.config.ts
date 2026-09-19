import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@mock-data': path.resolve(__dirname, '../mock-data'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
