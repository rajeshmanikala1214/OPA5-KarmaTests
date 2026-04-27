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
    frameworks: ['ui5', 'qunit', 'browserify', 'mocha'],

    ui5: {
      // Pin to a SAPUI5 version compatible with Chrome 94
      url: "https://sapui5.hana.ondemand.com/1.108.0",
      mode: "script",
      config: {
        async: true,
        resourceRoots: {
          "ns.HTML5Module": "/base/webapp"
        }
      },
      tests: [
        "ns/HTML5Module/test/unit/AllTests",
        "ns/HTML5Module/test/integration/AllJourneys"
      ]
    },

    files: [
      { pattern: 'webapp/**', served: true, included: false, watched: true }
    ],

    preprocessors: {
      'webapp/**/*.js': ['coverage']
    },

    reporters: ['progress', 'coverage', 'junit'],

    coverageReporter: {
      dir: 'reports/coverage',   // write directly to final path
      subdir: '.',               // no subdir nesting to avoid mkdir conflict
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
    logLevel: config.LOG_INFO,   // reduced from DEBUG to keep logs cleaner
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

    plugins: [
      'karma-ui5',
      'karma-qunit',
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