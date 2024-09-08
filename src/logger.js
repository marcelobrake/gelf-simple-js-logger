const net = require('net');
const os = require('os');
const axios = require('axios');
const dgram = require('dgram');

// Function to get the remote IP address
async function getRemoteAddress() {
    try {
        const response = await axios.get('https://checkip.amazonaws.com/');
        return response.data.trim();
    } catch (error) {
        console.error('Error getting remote IP:', error.message);
        return '0.0.0.0'; // Default value if failed
    }
}

// Function to create a formatted GELF message
async function createGelfMessage(level, logObject, config) {
    const remoteAddress = await getRemoteAddress();
    const hostname = os.hostname();

    const gelfMessage = {
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
function mapLogLevel(level) {
    const levels = {
        debug: 7,
        info: 6,
        warn: 4,
        error: 3,
        critical: 2
    };
    return levels[level] || 6; // Default to Info
}

// Function to send logs via UDP
function sendUdpMessage(message, config) {
    const client = dgram.createSocket('udp4');
    const jsonMessage = Buffer.from(JSON.stringify(message));

    client.send(jsonMessage, 0, jsonMessage.length, config.GRAYLOG_PORT, config.GRAYLOG_HOST, (err) => {
        if (err) console.error('Error sending UDP message:', err);
        client.close();
    });
}

// Function to send logs via TCP
function sendTcpMessage(message, config) {
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
function sendLogToGraylog(message, config) {
    if (config.GRAYLOG_TRANSPORT === 'udp') {
        sendUdpMessage(message, config);
    } else if (config.GRAYLOG_TRANSPORT === 'tcp') {
        sendTcpMessage(message, config);
    } else {
        console.error('Invalid transport protocol. Use "udp" or "tcp".');
    }
}

// Function to log to the console
function logToConsole(level, logObject) {
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
async function log(level, logObject, config) {
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
function createLogger(customConfig = {}) {
    const defaultConfig = {
        GRAYLOG_HOST: process.env.GRAYLOG_HOST || '127.0.0.1',
        GRAYLOG_TRANSPORT: process.env.GRAYLOG_TRANSPORT || 'udp', // udp or tcp
        GRAYLOG_PORT: process.env.GRAYLOG_PORT || 12201,
        GRAYLOG_APPLICATION_NAME: process.env.GRAYLOG_APPLICATION_NAME || 'my-application',
        GRAYLOG_ENVIRONMENT: process.env.GRAYLOG_ENVIRONMENT || 'development',
        GRAYLOG_MIN_LEVEL_LOCAL: process.env.GRAYLOG_MIN_LEVEL_LOCAL || 'debug',
        GRAYLOG_MIN_LEVEL_REMOTE: process.env.GRAYLOG_MIN_LEVEL_REMOTE || 'info',
        GRAYLOG_OUTPUT: process.env.GRAYLOG_OUTPUT || 'both', // local, remote, both
    };

    const config = { ...defaultConfig, ...customConfig };

    return {
        debug: (logObject) => log('debug', { ...logObject, stringLevel: 'debug' }, config),
        info: (logObject) => log('info', { ...logObject, stringLevel: 'info' }, config),
        warn: (logObject) => log('warn', { ...logObject, stringLevel: 'warn' }, config),
        error: (logObject) => log('error', { ...logObject, stringLevel: 'error' }, config),
        critical: (logObject) => log('critical', { ...logObject, stringLevel: 'critical' }, config)
    };
}

module.exports = createLogger;
