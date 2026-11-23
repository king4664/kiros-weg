import { defineConfig } from 'vitest/config';

// على GitHub Pages الموقع بيبقى تحت /<اسم الريبو>/، والـworkflow بيبعت المسار ده في BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
