module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'web',
        'extension',
        'desktop',
        'shared',
        'ci',
        'dx',
        'deps',
        'embed',
        'editor',
        'landing',
        'tests',
        'docs',
      ],
    ],
  },
};
