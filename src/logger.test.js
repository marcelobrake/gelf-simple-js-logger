const logger = require('./logger'); // Import the whole module
const os = require('os');
const dgram = require('dgram');
const net = require('net');

// Mock getRemoteAddress at the module level as it's called by createGelfMessage
// which might be indirectly called if we were testing the main `log` function.
// For sendLogToGraylog, it's not directly called, but this keeps consistency.
// We also need to mock other functions that are part of the logger module itself for the `log` function tests.
// For createLogger tests, we will spy on logger.log directly.
const actualLoggerModule = jest.requireActual('./logger');

jest.mock('./logger', () => {
  const originalModule = jest.requireActual('./logger');
  return {
    ...originalModule,
    getRemoteAddress: jest.fn().mockResolvedValue('123.123.123.123'),
    // Keep original createGelfMessage for its own tests, but allow spying for `log` tests
    // For `log` function's own tests, we mock its dependencies.
    // For `createLogger` tests, we spy on the `log` function itself.
    createGelfMessage: jest.fn(originalModule.createGelfMessage),
    logToConsole: jest.fn(originalModule.logToConsole),
    sendLogToGraylog: jest.fn(originalModule.sendLogToGraylog),
    // `log` itself is not mocked here, so createLogger can use the actual `log`
    // which we will then spy on in the createLogger test suite.
  };
});

jest.mock('os');
jest.mock('dgram');
jest.mock('net');

describe('mapLogLevel', () => {
  test('should return 7 for debug level', () => {
    expect(logger.mapLogLevel('debug')).toBe(7);
  });

  test('should return 6 for info level', () => {
    expect(logger.mapLogLevel('info')).toBe(6);
  });

  test('should return 4 for warn level', () => {
    expect(logger.mapLogLevel('warn')).toBe(4);
  });

  test('should return 3 for error level', () => {
    expect(logger.mapLogLevel('error')).toBe(3);
  });

  test('should return 2 for critical level', () => {
    expect(logger.mapLogLevel('critical')).toBe(2);
  });

  test('should return 6 for an unknown string level', () => {
    expect(logger.mapLogLevel('unknown')).toBe(6);
  });

  test('should return 6 for an undefined level', () => {
    expect(logger.mapLogLevel(undefined)).toBe(6);
  });
});

describe('createGelfMessage', () => {
  let originalCreateGelfMessage;

  beforeEach(() => {
    originalCreateGelfMessage = logger.createGelfMessage;
    // Use the actual implementation for these specific tests
    logger.createGelfMessage = actualLoggerModule.createGelfMessage;
    os.hostname.mockReturnValue('test-host');
    actualLoggerModule.getRemoteAddress.mockClear();
  });

  afterEach(() => {
    logger.createGelfMessage = originalCreateGelfMessage; // Restore mock for other suites
  });

  const config = {
    GRAYLOG_APPLICATION_NAME: 'test-app',
    GRAYLOG_ENVIRONMENT: 'test-env',
  };

  test('should create a basic GELF message', async () => {
    const logObject = { message: 'Test message' };
    const message = await logger.createGelfMessage('info', logObject, config);
    expect(actualLoggerModule.getRemoteAddress).toHaveBeenCalledTimes(1);
    expect(message.version).toBe('1.1');
    // ... other assertions
  });
});

describe('logToConsole', () => {
  let consoleLogSpy;
  let originalLogToConsole;

  beforeEach(() => {
    originalLogToConsole = logger.logToConsole;
    logger.logToConsole = actualLoggerModule.logToConsole; // Use actual for this suite
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logger.logToConsole = originalLogToConsole; // Restore mock for other suites
    consoleLogSpy.mockRestore();
  });

  test('should log a simple message', () => {
    logger.logToConsole('info', { message: 'Simple test message' });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]: Simple test message'));
  });
});

describe('sendUdpMessage', () => {
  const mockSend = jest.fn((buffer, offset, length, port, host, callback) => callback());
  const mockClose = jest.fn();
  let consoleErrorSpy;
  let originalSendUdpMessage;

  beforeEach(() => {
    originalSendUdpMessage = logger.sendUdpMessage;
    logger.sendUdpMessage = actualLoggerModule.sendUdpMessage; // Use actual for this suite
    dgram.createSocket.mockReturnValue({ send: mockSend, close: mockClose });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSend.mockClear();
    mockClose.mockClear();
    dgram.createSocket.mockClear();
  });

  afterEach(() => {
    logger.sendUdpMessage = originalSendUdpMessage; // Restore mock for other suites
    consoleErrorSpy.mockRestore();
  });

  test('should create a udp4 socket and send message', () => {
    logger.sendUdpMessage({ m: 'UDP' }, { GRAYLOG_HOST: 'h', GRAYLOG_PORT: 1 });
    expect(dgram.createSocket).toHaveBeenCalledWith('udp4');
    expect(mockSend).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});

describe('sendTcpMessage', () => {
  const mockConnect = jest.fn((port, host, callback) => callback()); // Auto-invoke connect callback
  const mockWrite = jest.fn();
  const mockEnd = jest.fn();
  const mockOn = jest.fn();
  let consoleErrorSpy;
  let originalSendTcpMessage;

  beforeEach(() => {
    originalSendTcpMessage = logger.sendTcpMessage;
    logger.sendTcpMessage = actualLoggerModule.sendTcpMessage; // Use actual for this suite
    net.Socket.mockReturnValue({ connect: mockConnect, write: mockWrite, end: mockEnd, on: mockOn });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConnect.mockClear();
    mockWrite.mockClear();
    mockEnd.mockClear();
    mockOn.mockClear();
    net.Socket.mockClear();
  });

  afterEach(() => {
    logger.sendTcpMessage = originalSendTcpMessage; // Restore mock for other suites
    consoleErrorSpy.mockRestore();
  });

  test('should create a socket, connect, write, and end', () => {
    logger.sendTcpMessage({ m: 'TCP' }, { GRAYLOG_HOST: 'h', GRAYLOG_PORT: 1 });
    expect(net.Socket).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalled();
    expect(mockEnd).toHaveBeenCalled();
  });
});

describe('sendLogToGraylog', () => {
  let sendUdpMessageSpy, sendTcpMessageSpy, consoleErrorSpy;
  let originalSendLogToGraylog, originalSendUdp, originalSendTcp;

  beforeEach(() => {
    originalSendLogToGraylog = logger.sendLogToGraylog;
    originalSendUdp = logger.sendUdpMessage; // Keep track of the mocked version from jest.mock
    originalSendTcp = logger.sendTcpMessage; // Keep track of the mocked version from jest.mock

    logger.sendLogToGraylog = actualLoggerModule.sendLogToGraylog; // Test actual implementation
    // Spy on the (potentially mocked) implementations that sendLogToGraylog will call
    sendUdpMessageSpy = jest.spyOn(logger, 'sendUdpMessage').mockImplementation(() => {});
    sendTcpMessageSpy = jest.spyOn(logger, 'sendTcpMessage').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logger.sendLogToGraylog = originalSendLogToGraylog; // Restore outer mock
    logger.sendUdpMessage = originalSendUdp; // Restore outer mock
    logger.sendTcpMessage = originalSendTcp; // Restore outer mock
    // Spies are restored automatically by Jest if created with jest.spyOn in beforeEach
  });

  test('should call sendUdpMessage for udp transport', () => {
    logger.sendLogToGraylog({}, { GRAYLOG_TRANSPORT: 'udp' });
    expect(sendUdpMessageSpy).toHaveBeenCalled();
  });
  test('should call sendTcpMessage for tcp transport', () => {
    logger.sendLogToGraylog({}, { GRAYLOG_TRANSPORT: 'tcp' });
    expect(sendTcpMessageSpy).toHaveBeenCalled();
  });
});

describe('log (main function)', () => {
  let createGelfMessageSpy, logToConsoleSpy, sendLogToGraylogSpy, gcSpy;
  let originalLog;

  const testLevel = 'info';
  const testLogObject = { message: 'Main log test' };
  const generatedGelfMessage = { version: "1.1", host: "test-host", short_message: "Main log test", level: 6 };

  beforeEach(() => {
    originalLog = logger.log; // Save the actual log function or its current mock state
    logger.log = actualLoggerModule.log; // Ensure we are testing the actual log function

    // These are dependencies of the 'log' function.
    // We use the mocks defined in the top-level jest.mock for these.
    createGelfMessageSpy = logger.createGelfMessage.mockResolvedValue(generatedGelfMessage);
    logToConsoleSpy = logger.logToConsole.mockImplementation(() => {});
    sendLogToGraylogSpy = logger.sendLogToGraylog.mockImplementation(() => {});
    
    if (global.gc) gcSpy = jest.spyOn(global, 'gc').mockImplementation(() => {});
    else gcSpy = undefined;
  });

  afterEach(() => {
    logger.log = originalLog; // Restore log to its previous state
    // Restore mocks for dependencies of 'log'
    createGelfMessageSpy.mockRestore();
    logToConsoleSpy.mockRestore();
    sendLogToGraylogSpy.mockRestore();
    if (gcSpy) gcSpy.mockRestore();
  });

  test('should call createGelfMessage, logToConsole, sendLogToGraylog for "both" output', async () => {
    await logger.log(testLevel, testLogObject, { GRAYLOG_OUTPUT: 'both' });
    expect(createGelfMessageSpy).toHaveBeenCalled();
    expect(logToConsoleSpy).toHaveBeenCalled();
    expect(sendLogToGraylogSpy).toHaveBeenCalled();
  });
});

describe('createLogger', () => {
  let logSpy;

  // Expected default configuration based on src/logger.js (environment variables are not set in test)
  const expectedDefaultConfig = {
    GRAYLOG_HOST: '127.0.0.1',
    GRAYLOG_TRANSPORT: 'udp',
    GRAYLOG_PORT: 12201,
    GRAYLOG_APPLICATION_NAME: 'my-application',
    GRAYLOG_ENVIRONMENT: 'development',
    GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
    GRAYLOG_MIN_LEVEL_REMOTE: 'info',
    GRAYLOG_OUTPUT: 'both',
  };

  beforeEach(() => {
    // Spy on the main 'log' function from the *actual* module implementation
    // because createLogger returns methods that will call this actual 'log' function.
    logSpy = jest.spyOn(actualLoggerModule, 'log').mockImplementation(async () => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('should return an object with standard logger methods', () => {
    const loggerInstance = actualLoggerModule.createLogger();
    expect(loggerInstance).toHaveProperty('debug');
    expect(loggerInstance).toHaveProperty('info');
    expect(loggerInstance).toHaveProperty('warn');
    expect(loggerInstance).toHaveProperty('error');
    expect(loggerInstance).toHaveProperty('critical');
  });

  describe('with default configuration', () => {
    const loggerInstance = actualLoggerModule.createLogger();
    const testMessage = { message: 'Test with default config' };

    test('info method should call main log function with correct parameters', async () => {
      await loggerInstance.info(testMessage);
      expect(logSpy).toHaveBeenCalledWith('info', { ...testMessage, stringLevel: 'info' }, expectedDefaultConfig);
    });

    test('debug method should call main log function with correct parameters', async () => {
      await loggerInstance.debug(testMessage);
      expect(logSpy).toHaveBeenCalledWith('debug', { ...testMessage, stringLevel: 'debug' }, expectedDefaultConfig);
    });

    test('warn method should call main log function with correct parameters', async () => {
      await loggerInstance.warn(testMessage);
      expect(logSpy).toHaveBeenCalledWith('warn', { ...testMessage, stringLevel: 'warn' }, expectedDefaultConfig);
    });

    test('error method should call main log function with correct parameters', async () => {
      await loggerInstance.error(testMessage);
      expect(logSpy).toHaveBeenCalledWith('error', { ...testMessage, stringLevel: 'error' }, expectedDefaultConfig);
    });

    test('critical method should call main log function with correct parameters', async () => {
      await loggerInstance.critical(testMessage);
      expect(logSpy).toHaveBeenCalledWith('critical', { ...testMessage, stringLevel: 'critical' }, expectedDefaultConfig);
    });
  });

  describe('with custom configuration', () => {
    const customConfig = {
      GRAYLOG_APPLICATION_NAME: 'MyCustomTestApp',
      GRAYLOG_ENVIRONMENT: 'testing',
      GRAYLOG_OUTPUT: 'remote',
      MY_CUSTOM_PARAM: 'customValue' // Example of an extra param that might be passed
    };
    const loggerInstance = actualLoggerModule.createLogger(customConfig);
    const testMessage = { message: 'Test with custom config', code: 500 };
    
    const expectedMergedConfig = {
      ...expectedDefaultConfig,
      ...customConfig
    };

    test('error method should call main log function with merged custom config', async () => {
      await loggerInstance.error(testMessage);
      expect(logSpy).toHaveBeenCalledWith('error', { ...testMessage, stringLevel: 'error' }, expectedMergedConfig);
    });

    test('info method should call main log function with merged custom config and different message', async () => {
      const specificMessage = { event: 'UserLoggedIn', userId: 123 };
      await loggerInstance.info(specificMessage);
      expect(logSpy).toHaveBeenCalledWith('info', { ...specificMessage, stringLevel: 'info' }, expectedMergedConfig);
    });
  });
});
