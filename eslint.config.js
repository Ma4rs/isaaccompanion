export default [
  {
    files: ['app.js', 'auth-ui.js', 'supabase.js', 'sw.js', 'js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        history: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        URL: 'readonly',
        CustomEvent: 'readonly',
        Response: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        caches: 'readonly',
        self: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      eqeqeq: 'off',
    },
  },
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs', 'supabase/seed*.js', 'tests/**/*.mjs', 'js/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      eqeqeq: 'off',
    },
  },
];
