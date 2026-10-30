import powerbiVisuals from 'eslint-plugin-powerbi-visuals';
import globals from 'globals';

// Microsoft's recommended security rules apply to EVERY shipped source module.
// Build/test code runs in Node, is not shipped, and has a separate environment.
export default [
    { ignores: ['node_modules/**', 'dist/**', '.tmp/**', '.core-build/**', '.offline-package/**', 'vendor/**', 'preview/**', 'docs/qa/**', 'upstream/**', '.git/**'] },
    { ...powerbiVisuals.configs.recommended, files: ['src/**/*.{js,jsx,ts,tsx}'] },
    {
        files: ['scripts/**/*.{js,cjs,mjs}', 'tests/**/*.{js,cjs,mjs}', 'eslint.config.mjs'],
        languageOptions: { ecmaVersion: 'latest', globals: globals.node },
        rules: { 'no-dupe-args': 'error', 'no-dupe-class-members': 'error', 'no-unreachable': 'error', 'constructor-super': 'error', 'no-const-assign': 'error' },
    },
];
