import * as net from 'net';
import * as os from 'os';
import axios from 'axios';
import * as dgram from 'dgram';
import { LogLevel, Transport, LoggerConfig, LogObject, GelfMessage, Logger } from './types';

// Function to get the remote IP address
export async function getRemoteAddress(): Promise<string> {
    try {
        const response = await axios.get('https://checkip.amazonaws.com/');
        return response.data.trim();
    } catch (error) {
        console.error('Error getting remote IP:', (error as Error).message);
        return '0.0.0.0'; // Default value if failed
    }
}

// Function to create a formatted GELF message
export async function createGelfMessage(level: LogLevel, logObject: LogObject, config: LoggerConfig): Promise<GelfMessage> {
    const remoteAddress = await getRemoteAddress();
    const hostname = os.hostname();

    const gelfMessage: GelfMessage = {
        version: "1.1",
        host: hostname,
        short_message: logObject.message || "No message",
        full_message: logObject.full_message || logObject.message,
        level: mapLogLevel(level),
        application_name: config.GRAYLOG_APPLICATION_NAME,
        environment: config.GRAYLOG_ENVIRONMENT,
        remote_addr: remoteAddress,
        timestamp: new Date().toISOString(),
        ...logObject // Add custom fields
    };

    return gelfMessage;
}

// Function to map log level to Graylog levels
export function mapLogLevel(level: LogLevel): number {
    const levels: Record<LogLevel, number> = {
        debug: 7,
        info: 6,
        warn: 4,
        error: 3,
        critical: 2
    };
    return levels[level] || 6; // Default to Info
}

// Function to send logs via UDP
export function sendUdpMessage(message: GelfMessage, config: LoggerConfig): void {
    const client = dgram.createSocket('udp4');
    const jsonMessage = Buffer.from(JSON.stringify(message));

    client.send(jsonMessage, 0, jsonMessage.length, config.GRAYLOG_PORT, config.GRAYLOG_HOST, (err) => {
        if (err) console.error('Error sending UDP message:', err);
        client.close();
    });
}

// Function to send logs via TCP
export function sendTcpMessage(message: GelfMessage, config: LoggerConfig): void {
    const client = new net.Socket();
    const jsonMessage = JSON.stringify(message);

    client.connect(config.GRAYLOG_PORT, config.GRAYLOG_HOST, () => {
        client.write(jsonMessage);
        client.end();
    });

    client.on('error', (err) => {
        console.error('Error sending TCP message:', err);
    });
}

// Function to send the log based on the chosen transport
export function sendLogToGraylog(message: GelfMessage, config: LoggerConfig): void {
    if (config.GRAYLOG_TRANSPORT === 'udp') {
        sendUdpMessage(message, config);
    } else if (config.GRAYLOG_TRANSPORT === 'tcp') {
        sendTcpMessage(message, config);
    } else {
        console.error('Invalid transport protocol. Use "udp" or "tcp".');
    }
}

// Function to log to the console
export function logToConsole(level: LogLevel, logObject: LogObject): void {
    const timestamp = new Date().toISOString();

    console.log(
        `[${timestamp}] - [${level.toUpperCase()}]: ${logObject.message}`
    );
    if (logObject.full_message) {
        console.log(`${' '.repeat(50)}${logObject.full_message}`);
    }
    Object.keys(logObject).forEach(key => {
        if (!['message', 'full_message'].includes(key)) {
            console.log(`${' '.repeat(50)}${key}: ${logObject[key]}`);
        }
    });
}

// Main log function
export async function log(level: LogLevel, logObject: LogObject, config: LoggerConfig): Promise<void> {
    const gelfMessage = await createGelfMessage(level, logObject, config);

    // Conditions for console and/or Graylog output
    if (config.GRAYLOG_OUTPUT === 'both' || config.GRAYLOG_OUTPUT === 'local') {
        logToConsole(level, logObject);
    }

    if (config.GRAYLOG_OUTPUT === 'both' || config.GRAYLOG_OUTPUT === 'remote') {
        sendLogToGraylog(gelfMessage, config);
    }

    // Force garbage collection (if available)
    if (global.gc) global.gc();
}

// Function to initialize the logger with configurations
export function createLogger(customConfig: Partial<LoggerConfig> = {}): Logger {
    const defaultConfig: LoggerConfig = {
        GRAYLOG_HOST: process.env.GRAYLOG_HOST || '127.0.0.1',
        GRAYLOG_TRANSPORT: (process.env.GRAYLOG_TRANSPORT as Transport) || 'udp',
        GRAYLOG_PORT: parseInt(process.env.GRAYLOG_PORT || '12201', 10),
        GRAYLOG_APPLICATION_NAME: process.env.GRAYLOG_APPLICATION_NAME || 'my-application',
        GRAYLOG_ENVIRONMENT: process.env.GRAYLOG_ENVIRONMENT || 'development',
        GRAYLOG_MIN_LEVEL_LOCAL: (process.env.GRAYLOG_MIN_LEVEL_LOCAL as LogLevel) || 'debug',
        GRAYLOG_MIN_LEVEL_REMOTE: (process.env.GRAYLOG_MIN_LEVEL_REMOTE as LogLevel) || 'info',
        GRAYLOG_OUTPUT: (process.env.GRAYLOG_OUTPUT as any) || 'both',
    };

    const config: LoggerConfig = { ...defaultConfig, ...customConfig };

    return {
        debug: (logObject: LogObject) => log('debug', { ...logObject, stringLevel: 'debug' }, config),
        info: (logObject: LogObject) => log('info', { ...logObject, stringLevel: 'info' }, config),
        warn: (logObject: LogObject) => log('warn', { ...logObject, stringLevel: 'warn' }, config),
        error: (logObject: LogObject) => log('error', { ...logObject, stringLevel: 'error' }, config),
        critical: (logObject: LogObject) => log('critical', { ...logObject, stringLevel: 'critical' }, config)
    };
}