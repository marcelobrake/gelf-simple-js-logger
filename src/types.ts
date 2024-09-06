// src/types.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogMessage {
  message: string;
  full_message: string;
  [key: string]: any;
}

export interface LoggerConfig {
  GRAYLOG_HOST: string;
  GRAYLOG_PORT: number;
  GRAYLOG_TRANSPORT: 'udp' | 'tcp';
  GRAYLOG_APPLICATION_NAME: string;
  GRAYLOG_APPLICATION: string;
  GRAYLOG_ENVIRONMENT: string;
  GRAYLOG_OUTPUT: 'remote' | 'local' | 'both';
  additionalFields?: { [key: string]: any };
}
