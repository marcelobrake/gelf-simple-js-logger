// src/logger.ts

import { LogLevel, LogMessage, LoggerConfig } from './types';
import config from './config';
import { getHostname } from './utils';
import gelfPro from 'gelf-pro';

class Logger {
  private config: LoggerConfig;

  constructor(customConfig?: Partial<LoggerConfig>) {
    this.config = { ...config, ...customConfig };
    if (['remote', 'both'].includes(this.config.GRAYLOG_OUTPUT)) {
      gelfPro.setConfig({
        fields: this.config.additionalFields || {},
        adapterName: this.config.GRAYLOG_TRANSPORT,
        adapterOptions: {
          host: this.config.GRAYLOG_HOST,
          port: this.config.GRAYLOG_PORT
        }
      });
    }
  }

  private log(level: LogLevel, logObj: LogMessage, remoteAddr?: string) {
    const baseFields = {
      hostname: getHostname(),
      application: this.config.GRAYLOG_APPLICATION,
      environment: this.config.GRAYLOG_ENVIRONMENT,
      level: level.toUpperCase(),
      timestamp: new Date().toISOString(),
      ...this.config.additionalFields,
      ...logObj,
      remote_addr: remoteAddr // Add the 'remote_addr' property
    };
  
    if (['remote', 'both'].includes(this.config.GRAYLOG_OUTPUT)) {
      (gelfPro as any)[level](baseFields);
    }
  
    if (['local', 'both'].includes(this.config.GRAYLOG_OUTPUT)) {
      this.logToConsole(level, logObj);
    }
  }

  private logToConsole(level: LogLevel, logObj: LogMessage) {
    const timestamp = new Date().toISOString();
    const consoleMessage = `[${timestamp}] - [${level.toUpperCase()}]: ${logObj.message}\n${logObj.full_message}`;
    
    const additional: Partial<LogMessage> = { ...logObj };
    delete additional?.message;
    delete additional?.full_message;

    if (Object.keys(additional).length > 0) {
      console.log(consoleMessage, JSON.stringify(additional, null, 2));
    } else {
      console.log(consoleMessage);
    }
  }

  public debug(logObj: LogMessage, remoteAddr?: string) {
    this.log('debug', logObj, remoteAddr);
  }

  public info(logObj: LogMessage, remoteAddr?: string) {
    this.log('info', logObj, remoteAddr);
  }

  public warn(logObj: LogMessage, remoteAddr?: string) {
    this.log('warn', logObj, remoteAddr);
  }

  public error(logObj: LogMessage, remoteAddr?: string) {
    this.log('error', logObj, remoteAddr);
  }

  public critical(logObj: LogMessage, remoteAddr?: string) {
    this.log('critical', logObj, remoteAddr);
  }
}

export default Logger;
