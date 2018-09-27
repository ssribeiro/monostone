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
    testFramework: 'jasmine'
  };
};
