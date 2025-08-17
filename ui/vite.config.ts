/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import type { RollupLog, LoggingFunction } from 'rollup'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        '**/*.d.ts',
        'vite.config.ts',
        'src/lib/api-client/**', // Generated API client
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React (keep separate as it's used everywhere)
          'vendor-react': ['react', 'react-dom'],

          //UI libraries
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
            'i18next',
            'react-i18next',
            'date-fns',
            'crypto-js',
            'clsx',
            'tailwind-merge',
            'react-markdown',
            'remark-gfm',
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/notifications',
            'recharts'
          ],

          // Large libraries (keep separate)
          'vendor-ai': ['openai', '@xenova/transformers']
        }
      },
      // Suppress specific warnings we can't fix (third-party library issues)
      onwarn(warning: RollupLog, warn: LoggingFunction) {
        // Suppress eval warnings from onnxruntime-web (third-party minified code)
        if (warning.code === 'EVAL' && warning.id?.includes('onnxruntime-web')) {
          return;
        }
        warn(warning);
      }
    },
    // Increase chunk size warning limit to 1MB (from default 500KB)
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging in production
    sourcemap: false,
    // Optimize for smaller builds
    minify: true
  }
})
