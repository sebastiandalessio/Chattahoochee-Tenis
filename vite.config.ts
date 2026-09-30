import { defineConfig } from 'vitest/config';

// Versión web (GitHub Pages). El build de un solo archivo lo arma scripts/build-single.mjs.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Chattahoochee-Tenis/' : '/',
  // "public/" es una carpeta normal (sprites generados y overrides); los assets
  // estáticos que se copian tal cual van en "static/".
  publicDir: 'static',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
  },
  server: {
    // Permite que la página local sprites.html lea ../referencias/ (solo en desarrollo).
    fs: { allow: ['..'] },
  },
  test: {
    // TUNE=1 corre las herramientas de ajuste de scripts/ en vez de los tests.
    include: process.env.TUNE ? ['scripts/**/*.test.ts'] : ['tests/**/*.test.ts'],
  },
}));
