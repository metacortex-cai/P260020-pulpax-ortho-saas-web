// @ts-check
// Next.js 16 removed the "next lint" CLI command and eslint-config-next now
// ships only a flat-config export, so this project lints via `eslint .`
// directly (see the "lint" script in package.json) using this config.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**'],
  },
  ...nextCoreWebVitals,
  eslintConfigPrettier,
];

export default eslintConfig;
