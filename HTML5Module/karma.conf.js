const os = require('os');
const fs = require('fs');
const path = require('path');

module.exports = function(config) {
  "use strict";

  const networkInterfaces = os.networkInterfaces();
  const containerIp = Object.values(networkInterfaces)
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';

  // Inline SonarQube Generic Test Execution reporter — no extra npm package needed
  function SonarGenericReporter(baseReporterDecorator) {
    baseReporterDecorator(this);

    const specResults = [];

    this.onSpecComplete = function(browser, result) {
      specResults.push({
        suite:   (result.suite || []).join(' '),
        name:    result.description || 'unnamed',
        time:    result.time || 0,
        success: result.success,
        skipped: result.skipped,
        log:     result.log || []
      });
    };

    this.onRunComplete = function() {
      // Group specs by suite name
      const suiteMap = {};
      specResults.forEach(function(r) {
        const key = r.suite || 'General';
        if (!suiteMap[key]) suiteMap[key] = [];
        suiteMap[key].push(r);
      });

      function escapeXml(str) {
        return String(str)
          .replace(/&/g,  '&amp;')
          .replace(/</g,  '&lt;')
          .replace(/>/g,  '&gt;')
          .replace(/"/g,  '&quot;')
          .replace(/'/g,  '&apos;');
      }

      // Map suite name to a test file path
      function suiteToFilePath(suite) {
        // "View1 Controller" -> webapp/test/unit/controller/View1.controller.js
        // "Navigation Journey" -> webapp/test/integration/NavigationJourney.js
        const lc = suite.toLowerCase();
        if (lc.indexOf('navigation') !== -1 || lc.indexOf('journey') !== -1) {
          return 'webapp/test/integration/NavigationJourney.js';
        }
        if (lc.indexOf('unit') !== -1 || lc.indexOf('controller') !== -1) {
          return 'webapp/test/unit/controller/View1.controller.js';
        }
        // fallback: convert suite name to a path
        return 'webapp/test/' + suite.replace(/\s+/g, '/') + '.js';
      }

      let xml = '<testExecutions version="1">\n';

      Object.keys(suiteMap).forEach(function(suite) {
        const filePath = suiteToFilePath(suite);
        xml += '  <file path="' + escapeXml(filePath) + '">\n';

        suiteMap[suite].forEach(function(tc) {
          const duration = Math.round(tc.time) || 1;
          const name = escapeXml(tc.name);

          if (tc.skipped) {
            xml += '    <testCase name="' + name + '" duration="' + duration + '">\n';
            xml += '      <skipped/>\n';
            xml += '    </testCase>\n';
          } else if (!tc.success) {
            const msg = escapeXml(
              (tc.log[0] || 'Test failed').substring(0, 500)
            );
            xml += '    <testCase name="' + name + '" duration="' + duration + '">\n';
            xml += '      <failure message="' + msg + '"/>\n';
            xml += '    </testCase>\n';
          } else {
            xml += '    <testCase name="' + name + '" duration="' + duration + '"/>\n';
          }
        });

        xml += '  </file>\n';
      });

      xml += '</testExecutions>\n';

      // Write the file
      const reportsDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const outputPath = path.join(reportsDir, 'test-execution.xml');
      fs.writeFileSync(outputPath, xml, 'utf8');
      console.log('Written SonarQube Generic Test report: ' + outputPath);
    };
  }

  SonarGenericReporter.$inject = ['baseReporterDecorator'];

  config.set({
    frameworks: ['ui5', 'qunit', 'browserify', 'mocha'],

    ui5: {
      url: "https://sapui5.hana.ondemand.com",
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

    // sonarqubeUnit REMOVED — it crashes with OPA5/QUnit tests
    // sonarGeneric is our inline reporter that writes test-execution.xml
    reporters: ['progress', 'coverage', 'junit', 'sonarGeneric'],

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

    plugins: [
      'karma-ui5',
      'karma-qunit',
      'karma-mocha',
      'karma-chrome-launcher',
      'karma-junit-reporter',
      'karma-browserify',
      'karma-coverage',
      'karma-webdriver-launcher',
      // Inline plugin — registered directly, no npm install needed
      { 'reporter:sonarGeneric': ['type', SonarGenericReporter] }
    ],

    concurrency: 1,
    forceJSONP: false
  });
};