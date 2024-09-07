const logger = require('../src/logger');

describe('Logger', () => {
    describe('debug', () => {
        it('should log a debug message', () => {
            const logObject = { message: 'Debug message' };
            logger.debug(logObject);
            // Add your assertion here
        });
    });

    describe('info', () => {
        it('should log an info message', () => {
            const logObject = { message: 'Info message' };
            logger.info(logObject);
            // Add your assertion here
        });
    });

    describe('warn', () => {
        it('should log a warning message', () => {
            const logObject = { message: 'Warning message' };
            logger.warn(logObject);
            // Add your assertion here
        });
    });

    describe('error', () => {
        it('should log an error message', () => {
            const logObject = { message: 'Error message' };
            logger.error(logObject);
            // Add your assertion here
        });
    });

    describe('critical', () => {
        it('should log a critical message', () => {
            const logObject = { message: 'Critical message' };
            logger.critical(logObject);
            // Add your assertion here
        });
    });
});