module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Remove console.log, keep warn and error
      // ['transform-remove-console', { exclude: ['warn', 'error'] }],

      // Module resolver for clean import aliases
      [
        'module-resolver',
        {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          alias: {
            '@': './app',
            '@assets': './assets',
          },
        },
      ],

      // React Native Reanimated plugin must be last
      'react-native-reanimated/plugin',
    ],
  };
};
