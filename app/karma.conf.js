var assets = require('./assets');

module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon', 'chai', 'sinon-chai'],

    files: assets.testFiles,

    exclude: [assets.staticDir + '/js/application*.js'],

    browsers: ['PhantomJS'],

    reporters: ['progress', 'junit'],

    junitReporter: {
        outputFile: 'test-results.xml',
        suite: 'unit'
    }
  });
};
