// src/index.ts

import Logger from './logger';
import { LoggerConfig, LogMessage } from './types';

const createLogger = (customConfig?: Partial<LoggerConfig>): Logger => {
  return new Logger(customConfig);
};

export { Logger, LoggerConfig, LogMessage, createLogger };
