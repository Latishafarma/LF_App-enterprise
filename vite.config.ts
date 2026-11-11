import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  return {
    plugins: [react(), tailwindcss()],
    // Gunakan './' saat build agar path aset otomatis menyesuaikan di GitHub Pages (baik root maupun /LF_App-enterprise/)
    base: command === 'build' ? './' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
    },
  };
});