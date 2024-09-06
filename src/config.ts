// src/config.ts

import { LoggerConfig } from './types';


const config: LoggerConfig = {
  GRAYLOG_HOST: process.env.GRAYLOG_HOST || 'localhost',
  GRAYLOG_PORT: parseInt(process.env.GRAYLOG_PORT || '12201', 10),
  GRAYLOG_TRANSPORT: (process.env.GRAYLOG_TRANSPORT as 'udp' | 'tcp') || 'udp',
  GRAYLOG_APPLICATION_NAME: process.env.GRAYLOG_APPLICATION_NAME || 'MyApp',
  GRAYLOG_APPLICATION: process.env.GRAYLOG_APPLICATION || 'MyApp',
  GRAYLOG_ENVIRONMENT: process.env.GRAYLOG_ENVIRONMENT || 'development',
  GRAYLOG_OUTPUT: (process.env.GRAYLOG_OUTPUT as 'remote' | 'local' | 'both') || 'both',
  additionalFields: process.env.GRAYLOG_ADDITIONAL_FIELDS
    ? JSON.parse(process.env.GRAYLOG_ADDITIONAL_FIELDS)
    : {}
};

export default config;
