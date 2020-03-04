module.exports = {
    preset: 'ts-jest',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
};
