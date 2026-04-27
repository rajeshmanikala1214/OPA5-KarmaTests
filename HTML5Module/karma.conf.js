const os = require('os');
const path = require('path');
const fs = require('fs');

module.exports = function(config) {
  "use strict";

  const networkInterfaces = os.networkInterfaces();
  const containerIp = Object.values(networkInterfaces)
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';

  // Clean reports/coverage dir before run to avoid EEXIST error
  const coverageDir = path.join(__dirname, 'reports', 'coverage');
  if (fs.existsSync(coverageDir)) {
    fs.rmSync(coverageDir, { recursive: true, force: true });
  }

  config.set({
    basePath: '',

    frameworks: ['browserify', 'mocha'],

    files: [
      'webapp/test/**/*.js'
    ],

    exclude: [
      'webapp/test/**/*.conf.js'
    ],

    preprocessors: {
      'webapp/test/**/*.js': ['browserify', 'coverage']
    },

    reporters: ['progress', 'coverage', 'junit'],

    coverageReporter: {
      dir: 'reports/coverage',
      subdir: '.',
      reporters: [
        { type: 'cobertura', file: 'coverage.xml' },
        { type: 'lcov' },
        { type: 'text-summary' }
      ]
    },

    junitReporter: {
      outputDir: 'reports',
      outputFile: 'TESTS-karma.xml',
      useBrowserName: false,
      suite: 'KarmaTests'
    },

    port: 9876,
    hostname: containerIp,
    listenAddress: '0.0.0.0',

    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    singleRun: true,

    browsers: ['SeleniumChrome'],

    customLaunchers: {
      SeleniumChrome: {
        base: 'WebDriver',
        config: {
          hostname: process.env.PIPER_SELENIUM_WEBDRIVER_HOSTNAME || 'selenium',
          port: parseInt(process.env.PIPER_SELENIUM_WEBDRIVER_PORT) || 4444
        },
        browserName: 'chrome',
        name: 'Karma',
        flags: ['--no-sandbox', '--disable-dev-shm-usage', '--headless'],
        pseudoActivityInterval: 30000
      }
    },

    captureTimeout: 210000,
    browserDisconnectTimeout: 210000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 210000,
    reportSlowerThan: 500,

    plugins: [
      'karma-mocha',
      'karma-chrome-launcher',
      'karma-junit-reporter',
      'karma-browserify',
      'karma-coverage',
      'karma-webdriver-launcher'
    ],

    concurrency: 1,
    forceJSONP: true
  });
};