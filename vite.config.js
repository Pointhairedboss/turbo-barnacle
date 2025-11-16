import { defineConfig } from 'vite';

export default defineConfig({
  base: '/turbo-barnacle/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});
