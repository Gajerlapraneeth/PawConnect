import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/react-build/',
  build: {
    outDir: '../src/main/resources/static/react-build',
    emptyOutDir: true,
  },
});