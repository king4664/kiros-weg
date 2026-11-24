import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/** أيقونات التطبيق بتتعمل من public/icon.svg وقت الـbuild. الرسمة مالية المربع، فمن غير حواف. */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/icon.svg'],
});
