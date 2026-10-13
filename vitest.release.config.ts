import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/release/**/*.release.test.ts'],
    environment: 'node',
  },
});
