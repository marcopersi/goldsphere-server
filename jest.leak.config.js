const baseConfig = require('./jest.config.json');

module.exports = {
  ...baseConfig,
  forceExit: false,
  detectOpenHandles: true,
  detectLeaks: true,
};
