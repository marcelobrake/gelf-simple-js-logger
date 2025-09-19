import { LoggerConfig, Transport, LogLevel } from './types';

const config: LoggerConfig = {
    GRAYLOG_HOST: process.env.GRAYLOG_HOST || '127.0.0.1',
    GRAYLOG_TRANSPORT: (process.env.GRAYLOG_TRANSPORT as Transport) || 'udp',
    GRAYLOG_PORT: parseInt(process.env.GRAYLOG_PORT || '12201', 10),
    GRAYLOG_APPLICATION_NAME: process.env.GRAYLOG_APPLICATION_NAME || 'my-application',
    GRAYLOG_ENVIRONMENT: process.env.GRAYLOG_ENVIRONMENT || 'development',
    GRAYLOG_MIN_LEVEL_LOCAL: (process.env.GRAYLOG_MIN_LEVEL_LOCAL as LogLevel) || 'debug',
    GRAYLOG_MIN_LEVEL_REMOTE: (process.env.GRAYLOG_MIN_LEVEL_REMOTE as LogLevel) || 'info',
    GRAYLOG_OUTPUT: (process.env.GRAYLOG_OUTPUT as any) || 'both',
};

export default config;