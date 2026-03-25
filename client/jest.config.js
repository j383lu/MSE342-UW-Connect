module.exports = {
    transform: {
      "^.+\\.(js|jsx)$": "babel-jest",
    },
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    verbose: true,
    silent: false,
  };