const os = require('os');

module.exports = function(config) {
  "use strict";

  // Dynamic IP detection for Selenium Sidecar
  const networkInterfaces = os.networkInterfaces();
  const containerIp = Object.values(networkInterfaces)
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';

  config.set({
    frameworks: ['ui5', 'qunit', 'browserify', 'mocha'], // Added 'ui5' framework

    ui5: {
      url: "https://sapui5.hana.ondemand.com",
      mode: "script",
      config: {
        async: true,
        resourceRoots: {
          "ns.HTML5Module": "./webapp" 
        }
      },
      // Point to the specific "All" files you shared
      tests: [
        "ns/HTML5Module/test/unit/AllTests",
        "ns/HTML5Module/test/integration/AllJourneys"
      ]
    },

    files: [
      { pattern: 'webapp/**', served: true, included: false, watched: true }
    ],

    preprocessors: {
        // Use coverage on the actual source code, not the tests
        'webapp/**/*.js': ['coverage']
    },

    // 3. Simplified Reporters (Removed sonarqubeUnit temporarily to stop the crash)
    reporters: ['progress', 'coverage', 'junit'],

    coverageReporter: {
      dir: 'reports',
      reporters: [
        { type: 'cobertura', subdir: 'coverage', file: 'coverage.xml' },
        { type: 'lcov',      subdir: 'coverage' },
        { type: 'text-summary' }
      ]
    },

    junitReporter: {
      outputDir: 'reports',
      outputFile: 'TESTS-karma.xml',
      useBrowserName: false,
      suite: 'KarmaTests'
    },

    // 4. Networking
    port: 9876,
    hostname: containerIp,
    listenAddress: '0.0.0.0',
     
    colors: true,
    logLevel: config.LOG_DEBUG, // Increased log level to see more details
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