import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dev-no-cache-headers',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((_req, res, next) => {
            const origSetHeader = res.setHeader.bind(res);
            res.setHeader = ((name: string, value: number | string | readonly string[]) => {
              if (name.toLowerCase() === 'cache-control') {
                return origSetHeader(name, 'no-store, no-cache, must-revalidate, max-age=0');
              }
              return origSetHeader(name, value);
            }) as typeof res.setHeader;
            origSetHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            origSetHeader('Pragma', 'no-cache');
            origSetHeader('Expires', '0');
            next();
          });
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
