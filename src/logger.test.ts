import * as logger from './logger';
import * as os from 'os';
import * as dgram from 'dgram';
import * as net from 'net';
import axios from 'axios';
import { LogLevel, LoggerConfig, LogObject, GelfMessage } from './types';

// Mock dependencies
jest.mock('axios');
jest.mock('dgram');
jest.mock('net');
jest.mock('os');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedDgram = dgram as jest.Mocked<typeof dgram>;
const mockedNet = net as jest.Mocked<typeof net>;

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: '123.123.123.123\n' });
    mockedOs.hostname.mockReturnValue('test-host');
  });

  describe('mapLogLevel', () => {
    test('should return correct values for each log level', () => {
      expect(logger.mapLogLevel('debug')).toBe(7);
      expect(logger.mapLogLevel('info')).toBe(6);
      expect(logger.mapLogLevel('warn')).toBe(4);
      expect(logger.mapLogLevel('error')).toBe(3);
      expect(logger.mapLogLevel('critical')).toBe(2);
    });

    test('should return default value for unknown level', () => {
      expect(logger.mapLogLevel('unknown' as LogLevel)).toBe(6);
    });
  });

  describe('getRemoteAddress', () => {
    test('should return IP address from AWS service', async () => {
      const result = await logger.getRemoteAddress();
      expect(result).toBe('123.123.123.123');
      expect(mockedAxios.get).toHaveBeenCalledWith('https://checkip.amazonaws.com/');
    });

    test('should return default IP on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      const result = await logger.getRemoteAddress();
      expect(result).toBe('0.0.0.0');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createGelfMessage', () => {
    const config: LoggerConfig = {
      GRAYLOG_HOST: '127.0.0.1',
      GRAYLOG_TRANSPORT: 'udp',
      GRAYLOG_PORT: 12201,
      GRAYLOG_APPLICATION_NAME: 'test-app',
      GRAYLOG_ENVIRONMENT: 'test-env',
      GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
      GRAYLOG_MIN_LEVEL_REMOTE: 'info',
      GRAYLOG_OUTPUT: 'both',
    };

    test('should create proper GELF message', async () => {
      const logObject: LogObject = { message: 'Test message', customField: 'customValue' };
      const result = await logger.createGelfMessage('info', logObject, config);

      expect(result.version).toBe('1.1');
      expect(result.host).toBe('test-host');
      expect(result.short_message).toBe('Test message');
      expect(result.level).toBe(6);
      expect(result.application_name).toBe('test-app');
      expect(result.environment).toBe('test-env');
      expect(result.remote_addr).toBe('123.123.123.123');
      expect(result.customField).toBe('customValue');
    });
  });

  describe('logToConsole', () => {
    test('should log message to console', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const logObject: LogObject = { message: 'Test message' };

      logger.logToConsole('info', logObject);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]: Test message')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('sendUdpMessage', () => {
    test('should send UDP message', () => {
      const mockSocket = {
        send: jest.fn((buffer, offset, length, port, host, callback) => callback()),
        close: jest.fn()
      };
      mockedDgram.createSocket.mockReturnValue(mockSocket as any);

      const message: GelfMessage = {
        version: '1.1',
        host: 'test-host',
        short_message: 'Test message',
        level: 6,
        application_name: 'test-app',
        environment: 'test',
        remote_addr: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      const config: LoggerConfig = {
        GRAYLOG_HOST: 'localhost',
        GRAYLOG_PORT: 12201,
        GRAYLOG_TRANSPORT: 'udp',
        GRAYLOG_APPLICATION_NAME: 'test-app',
        GRAYLOG_ENVIRONMENT: 'test',
        GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
        GRAYLOG_MIN_LEVEL_REMOTE: 'info',
        GRAYLOG_OUTPUT: 'both'
      };

      logger.sendUdpMessage(message, config);

      expect(mockedDgram.createSocket).toHaveBeenCalledWith('udp4');
      expect(mockSocket.send).toHaveBeenCalled();
      expect(mockSocket.close).toHaveBeenCalled();
    });
  });

  describe('sendTcpMessage', () => {
    test('should send TCP message', () => {
      const mockSocket = {
        connect: jest.fn((port, host, callback) => callback()),
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      mockedNet.Socket.mockReturnValue(mockSocket as any);

      const message: GelfMessage = {
        version: '1.1',
        host: 'test-host',
        short_message: 'Test message',
        level: 6,
        application_name: 'test-app',
        environment: 'test',
        remote_addr: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      const config: LoggerConfig = {
        GRAYLOG_HOST: 'localhost',
        GRAYLOG_PORT: 12201,
        GRAYLOG_TRANSPORT: 'tcp',
        GRAYLOG_APPLICATION_NAME: 'test-app',
        GRAYLOG_ENVIRONMENT: 'test',
        GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
        GRAYLOG_MIN_LEVEL_REMOTE: 'info',
        GRAYLOG_OUTPUT: 'both'
      };

      logger.sendTcpMessage(message, config);

      expect(mockedNet.Socket).toHaveBeenCalled();
      expect(mockSocket.connect).toHaveBeenCalled();
      expect(mockSocket.write).toHaveBeenCalled();
      expect(mockSocket.end).toHaveBeenCalled();
    });
  });

  describe('sendLogToGraylog', () => {
    test('should call sendUdpMessage for UDP transport', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const message: GelfMessage = {
        version: '1.1',
        host: 'test-host',
        short_message: 'Test message',
        level: 6,
        application_name: 'test-app',
        environment: 'test',
        remote_addr: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      const config: LoggerConfig = {
        GRAYLOG_HOST: 'localhost',
        GRAYLOG_PORT: 12201,
        GRAYLOG_TRANSPORT: 'udp',
        GRAYLOG_APPLICATION_NAME: 'test-app',
        GRAYLOG_ENVIRONMENT: 'test',
        GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
        GRAYLOG_MIN_LEVEL_REMOTE: 'info',
        GRAYLOG_OUTPUT: 'both'
      };

      // Mock the UDP socket for this test
      const mockSocket = {
        send: jest.fn((buffer, offset, length, port, host, callback) => callback()),
        close: jest.fn()
      };
      mockedDgram.createSocket.mockReturnValue(mockSocket as any);

      logger.sendLogToGraylog(message, config);
      expect(mockedDgram.createSocket).toHaveBeenCalledWith('udp4');
      
      consoleErrorSpy.mockRestore();
    });

    test('should call sendTcpMessage for TCP transport', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const message: GelfMessage = {
        version: '1.1',
        host: 'test-host',
        short_message: 'Test message',
        level: 6,
        application_name: 'test-app',
        environment: 'test',
        remote_addr: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      const config: LoggerConfig = {
        GRAYLOG_HOST: 'localhost',
        GRAYLOG_PORT: 12201,
        GRAYLOG_TRANSPORT: 'tcp',
        GRAYLOG_APPLICATION_NAME: 'test-app',
        GRAYLOG_ENVIRONMENT: 'test',
        GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
        GRAYLOG_MIN_LEVEL_REMOTE: 'info',
        GRAYLOG_OUTPUT: 'both'
      };

      // Mock the TCP socket for this test
      const mockSocket = {
        connect: jest.fn((port, host, callback) => callback()),
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      mockedNet.Socket.mockReturnValue(mockSocket as any);

      logger.sendLogToGraylog(message, config);
      expect(mockedNet.Socket).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    test('should log error for invalid transport', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const message: GelfMessage = {
        version: '1.1',
        host: 'test-host',
        short_message: 'Test message',
        level: 6,
        application_name: 'test-app',
        environment: 'test',
        remote_addr: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      const config: LoggerConfig = {
        GRAYLOG_HOST: 'localhost',
        GRAYLOG_PORT: 12201,
        GRAYLOG_TRANSPORT: 'invalid' as any,
        GRAYLOG_APPLICATION_NAME: 'test-app',
        GRAYLOG_ENVIRONMENT: 'test',
        GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
        GRAYLOG_MIN_LEVEL_REMOTE: 'info',
        GRAYLOG_OUTPUT: 'both'
      };

      logger.sendLogToGraylog(message, config);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid transport protocol. Use "udp" or "tcp".');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createLogger', () => {
    test('should create logger with all methods', () => {
      const loggerInstance = logger.createLogger();
      
      expect(loggerInstance).toHaveProperty('debug');
      expect(loggerInstance).toHaveProperty('info');
      expect(loggerInstance).toHaveProperty('warn');
      expect(loggerInstance).toHaveProperty('error');
      expect(loggerInstance).toHaveProperty('critical');
      expect(typeof loggerInstance.debug).toBe('function');
      expect(typeof loggerInstance.info).toBe('function');
      expect(typeof loggerInstance.warn).toBe('function');
      expect(typeof loggerInstance.error).toBe('function');
      expect(typeof loggerInstance.critical).toBe('function');
    });

    test('should merge custom config with defaults', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const customConfig: Partial<LoggerConfig> = {
        GRAYLOG_APPLICATION_NAME: 'custom-app',
        GRAYLOG_OUTPUT: 'local' // Only local output, so no network calls
      };
      
      const loggerInstance = logger.createLogger(customConfig);
      await loggerInstance.info({ message: 'Test message' });

      // Should log to console since output is 'local'
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]: Test message')
      );
      
      consoleLogSpy.mockRestore();
    });
  });
});