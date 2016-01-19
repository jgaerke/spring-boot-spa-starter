var resourcesDir = 'src/main/resources',
    staticDir = resourcesDir + '/static',
    testDir = 'src/test/resources/static/js',
    _ = require('lodash'),
    jsFiles = [
      staticDir + '/js/common/Polyfill.js',
      staticDir + '/js/libs/riot.js',
      staticDir + '/js/libs/compiler.js',
      staticDir + '/js/libs/page.js',
      staticDir + '/js/libs/**/*.js',
      staticDir + '/js/support/Class.js',
      staticDir + '/js/support/Component.js',
      staticDir + '/js/App.js',
      staticDir + '/js/support/**/*.js',
      staticDir + '/js/interceptors/**/*.js',
      staticDir + '/js/components/**/*.js',
      '!' + staticDir + '/js/application.js',
      '!' + staticDir + '/js/application.min.js'
    ],
    testFiles = [
        testDir + '/libs/**/*.js',
        testDir + '/Init.js',
        testDir + '/**/*.spec.js'
    ]

module.exports = {
  resourcesDir: resourcesDir,
  staticDir: staticDir,
  jsFiles: jsFiles,
  testFiles: _.union(jsFiles, testFiles)
}