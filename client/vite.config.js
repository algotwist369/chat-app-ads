import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
// import { VitePWA } from 'vite-plugin-pwa'; // Temporarily disabled - not compatible with Vite 7
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
        // Exclude test files from babel processing
        exclude: /\.(test|spec)\.(js|jsx|ts|tsx)$/,
      }),
      // Gzip compression (only in production)
      isProduction && viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        exclude: [/\.(br)$/, /\.(gz)$/],
      }),
      // Brotli compression (only in production)
      isProduction && viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        exclude: [/\.(br)$/, /\.(gz)$/],
      }),
      // PWA plugin - Temporarily disabled due to Vite 7 compatibility
      // Uncomment when vite-plugin-pwa supports Vite 7
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      //   manifest: {
      //     name: 'AD Chat App',
      //     short_name: 'AD Chat',
      //     description: 'Real-time chat application',
      //     theme_color: '#25d366',
      //     background_color: '#0b141a',
      //     display: 'standalone',
      //     icons: [
      //       {
      //         src: '/icon-192.png',
      //         sizes: '192x192',
      //         type: 'image/png',
      //       },
      //       {
      //         src: '/icon-512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //       },
      //     ],
      //   },
      //   workbox: {
      //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      //     runtimeCaching: [
      //       {
      //         urlPattern: /^https:\/\/api\./i,
      //         handler: 'NetworkFirst',
      //         options: {
      //           cacheName: 'api-cache',
      //           expiration: {
      //             maxEntries: 50,
      //             maxAgeSeconds: 60 * 60, // 1 hour
      //           },
      //         },
      //       },
      //       {
      //         urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      //         handler: 'CacheFirst',
      //         options: {
      //           cacheName: 'image-cache',
      //           expiration: {
      //             maxEntries: 100,
      //             maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      //           },
      //         },
      //       },
      //     ],
      //   },
      //   devOptions: {
      //     enabled: false,
      //   },
      // }),
      // Bundle visualizer (only in production build)
      isProduction && visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // 'sunburst' | 'treemap' | 'network'
      }),
    ].filter(Boolean),

    // Build optimizations
    build: {
      // Output directory
      outDir: 'dist',
      
      // Enable source maps in production (set to false for smaller builds)
      sourcemap: false,
      
      // Minification
      minify: 'esbuild', // 'esbuild' is faster than 'terser'
      
      // Chunk size warning limit (in KB)
      chunkSizeWarningLimit: 1000,
      
      // Rollup options
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              // React and React DOM in separate chunk
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              // React Router
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              // Socket.io
              if (id.includes('socket.io')) {
                return 'vendor-socket';
              }
              // Axios
              if (id.includes('axios')) {
                return 'vendor-http';
              }
              // React Icons (can be large)
              if (id.includes('react-icons')) {
                return 'vendor-icons';
              }
              // All other node_modules
              return 'vendor';
            }
            
            // Split large pages
            if (id.includes('/pages/Chat.jsx')) {
              return 'page-chat';
            }
            if (id.includes('/pages/Manager')) {
              return 'page-manager';
            }
            if (id.includes('/pages/Customer')) {
              return 'page-customer';
            }
          },
          
          // Hash filenames for cache busting
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      
      // Target modern browsers for smaller bundles
      target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Report compressed size
      reportCompressedSize: true,
    },

    // Resolve aliases for cleaner imports
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@pages': resolve(__dirname, './src/pages'),
        '@lib': resolve(__dirname, './src/lib'),
        '@context': resolve(__dirname, './src/context'),
      },
      // Deduplicate React to prevent multiple instances
      dedupe: ['react', 'react-dom'],
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router-dom',
        'socket.io-client',
        'axios',
      ],
      exclude: ['react-icons'],
      // Force re-optimization when lockfile changes
      force: false, // Set to true to force re-optimization
    },

    // Server configuration (for dev)
    server: {
      // Enable HTTP/2
      https: false,
      // Preload modules
      preTransformRequests: true,
      // HMR WebSocket configuration
      hmr: true, // Let Vite auto-detect HMR settings
      // Watch configuration
      watch: {
        usePolling: false,
      },
    },

    // Preview server (for production preview)
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});
