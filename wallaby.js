module.exports = function (w) {

  return {
    files: [
      { pattern: 'src/**/*.spec.ts', ignore: true },
      'src/**/*.ts'
    ],

    tests: [
      'src/**/*.spec.ts'
    ],

    env: {
      type: 'node'
    },

    // or any other supported testing framework:
    // https://wallabyjs.com/docs/integration/overview.html#supported-testing-frameworks
    testFramework: 'jasmine',

    setup: (w) => {
      Object.keys(require.cache).filter(k => k.indexOf('jasmine-expect') >= 0)
        .forEach((k) => { delete require.cache[k]; });

      require("jasmine-expect");
      w.testFramework.DEFAULT_TIMEOUT_INTERVAL = 2500;
    }

  };
};
