import { createLogger, LoggerConfig } from './src/index';

// Example usage with TypeScript
async function exampleUsage() {
  // Create logger with default configuration
  const defaultLogger = createLogger();

  // Create logger with custom configuration
  const customConfig: Partial<LoggerConfig> = {
    GRAYLOG_HOST: 'my-graylog-server.com',
    GRAYLOG_PORT: 12201,
    GRAYLOG_TRANSPORT: 'udp',
    GRAYLOG_APPLICATION_NAME: 'my-typescript-app',
    GRAYLOG_ENVIRONMENT: 'production',
    GRAYLOG_OUTPUT: 'both' // Send to both console and Graylog
  };

  const customLogger = createLogger(customConfig);

  // Log different levels with type safety
  await defaultLogger.debug({ 
    message: 'Debug message',
    userId: 12345,
    action: 'user_login'
  });

  await customLogger.info({ 
    message: 'Application started',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });

  await customLogger.warn({ 
    message: 'Warning: High memory usage',
    memoryUsage: '85%',
    threshold: '80%'
  });

  await customLogger.error({ 
    message: 'Database connection failed',
    error: 'Connection timeout',
    retryAttempt: 3
  });

  await customLogger.critical({ 
    message: 'System critical error',
    errorCode: 500,
    stackTrace: 'Error stack...'
  });
}

// Run example
if (require.main === module) {
  exampleUsage().catch(console.error);
}