import type { NextConfig } from "next"
import withPWAInit from "@ducanh2912/next-pwa"

const isDev = process.env.NODE_ENV === 'development'
const enablePWAInDev = process.env.ENABLE_PWA === 'true'

const isPWAEnabled = !(isDev && !enablePWAInDev)

const withPWA = withPWAInit({
  dest: "public",
  // Default: nonaktif saat dev, kecuali ENABLE_PWA=true
  disable: isDev && !enablePWAInDev,
  // Jangan cache start URL agar saat offline jatuh ke offline.html, bukan cache lama
  cacheStartUrl: false,

  // Gunakan fallbacks yang lebih aman; hanya muncul saat benar2 offline
  ...(isPWAEnabled && {
    fallbacks: {
      document: '/offline.html',
    },
  }),

  workboxOptions: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
    // Inject push notification handlers
    importScripts: isPWAEnabled ? ['/push-sw.js'] : [],
    // Jangan gunakan navigateFallback karena akan selalu fallback bahkan saat online
    // Gunakan handlerDidError di runtimeCaching untuk fallback yang lebih tepat
    // ...(isPWAEnabled && {
    //   navigateFallback: '/offline.html',
    //   navigateFallbackDenylist: [
    //     /^\/_/,
    //     /^\/_next/,
    //     /\/api\//,
    //     /\/magang\/detail\//,
    //     /^\/login/,
    //     /^\/register/,
    //     /^\/forgot-password/,
    //     /^\/reset-password/,
    //   ],
    // }),

    // Precache offline.html saat PWA aktif
    ...(isPWAEnabled && {
      additionalManifestEntries: [
        { url: '/offline.html', revision: '1' }
      ],
    }),

    // Strategi cache untuk navigasi: online terlebih dulu, cache sebagai cadangan
    // Hanya aktif saat PWA enabled
    ...(isPWAEnabled && {
      runtimeCaching: [
        {
          // Semua navigasi halaman, tapi exclude route detail magang
          urlPattern: ({ request, url }) => {
            if (request.mode !== 'navigate') return false
            // Exclude route detail magang dari caching
            if (url.pathname.startsWith('/magang/detail/')) return false
            // Exclude auth routes dari caching untuk menghindari redirect aneh dan query loss
            // Gunakan startsWith untuk catch semua variasi (dengan atau tanpa query string)
            if (
              url.pathname.startsWith('/login') ||
              url.pathname.startsWith('/register') ||
              url.pathname.startsWith('/forgot-password') ||
              url.pathname.startsWith('/reset-password')
            ) {
              return false
            }
            return true
          },
          // NetworkFirst dengan timeout lebih panjang dan network timeout
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages-cache',
            // Jangan abaikan search agar token di query string tetap dianggap berbeda
            matchOptions: { ignoreSearch: false },
            networkTimeoutSeconds: 5, // Timeout 5 detik sebelum fallback ke cache
            plugins: [
              {
                handlerDidError: async ({ request }) => {
                  // Hanya fallback ke offline.html jika benar-benar offline
                  // Cek dengan cara yang lebih reliable
                  let isOnline = false;
                  try {
                    // Cek dengan fetch ke root untuk memastikan benar-benar offline
                    const testResponse = await fetch('/', { 
                      method: 'HEAD',
                      cache: 'no-cache',
                      mode: 'no-cors'
                    });
                    isOnline = true;
                  } catch (e) {
                    // Jika fetch gagal, cek navigator.onLine sebagai fallback
                    isOnline = typeof self !== 'undefined' && self.navigator?.onLine === true;
                  }
                  
                  // Hanya fallback ke offline.html jika benar-benar offline
                  if (!isOnline) {
                    return await caches.match('/offline.html') || Response.error();
                  }
                  // Jika online tapi error, throw error agar browser handle sendiri
                  throw new Error('Network error but device is online');
                },
              },
            ],
          },
        },
      ],
    }),
  },
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default withPWA(nextConfig)