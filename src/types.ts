export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export type Transport = 'udp' | 'tcp';

export type OutputMode = 'local' | 'remote' | 'both';

export interface LoggerConfig {
  GRAYLOG_HOST: string;
  GRAYLOG_TRANSPORT: Transport;
  GRAYLOG_PORT: number;
  GRAYLOG_APPLICATION_NAME: string;
  GRAYLOG_ENVIRONMENT: string;
  GRAYLOG_MIN_LEVEL_LOCAL: LogLevel;
  GRAYLOG_MIN_LEVEL_REMOTE: LogLevel;
  GRAYLOG_OUTPUT: OutputMode;
}

export interface LogObject {
  message?: string;
  full_message?: string;
  [key: string]: any;
}

export interface GelfMessage {
  version: string;
  host: string;
  short_message: string;
  full_message?: string;
  level: number;
  application_name: string;
  environment: string;
  remote_addr: string;
  timestamp: string;
  stringLevel?: LogLevel;
  [key: string]: any;
}

export interface Logger {
  debug: (logObject: LogObject) => Promise<void>;
  info: (logObject: LogObject) => Promise<void>;
  warn: (logObject: LogObject) => Promise<void>;
  error: (logObject: LogObject) => Promise<void>;
  critical: (logObject: LogObject) => Promise<void>;
}