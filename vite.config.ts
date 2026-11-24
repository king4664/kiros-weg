import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// على GitHub Pages الموقع بيبقى تحت /<اسم الريبو>/، والـworkflow بيبعت المسار ده في BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
  },
  plugins: [
    VitePWA({
      // التحديث بينزل لوحده أول ما تفتح التطبيق والنت شغال
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      // الأيقونات بتتعمل من public/icon.svg (pwa-assets.config.ts)
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Kiros Weg',
        short_name: 'Kiros Weg',
        description: 'خطة الألماني من A1 لـB1: مهام كل يوم، والروابط، والمواعيد، والكلمات، والمتابعة.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#3f4f86',
        theme_color: '#3f4f86',
      },
      workbox: {
        // كل حاجة بتتحفظ على الموبايل بعد أول فتح، فالتطبيق بيفتح من غير نت
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,txt}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // الـservice worker الجديد بيمسك الصفحة المفتوحة على طول، من غير ما تقفلها وتفتحها
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
