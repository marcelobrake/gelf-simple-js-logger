// logger.js
const dgram = require('dgram');
const net = require('net');
const os = require('os');
const axios = require('axios');
const config = require('./gelf-logger-config');


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

// Function to create a GELF formatted message
async function createGelfMessage(level, logObject) {
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
function sendUdpMessage(message) {
    const client = dgram.createSocket('udp4');
    const jsonMessage = Buffer.from(JSON.stringify(message));

    client.send(jsonMessage, 0, jsonMessage.length, config.GRAYLOG_PORT, config.GRAYLOG_HOST, (err) => {
        if (err) console.error('Error sending UDP message:', err);
        client.close();
    });
}

// Function to send logs via TCP
function sendTcpMessage(message) {
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
function sendLogToGraylog(message) {
    if (config.GRAYLOG_TRANSPORT === 'udp') {
        sendUdpMessage(message);
    } else if (config.GRAYLOG_TRANSPORT === 'tcp') {
        sendTcpMessage(message);
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
async function log(level, logObject) {
    const gelfMessage = await createGelfMessage(level, logObject);

    // Conditions for console and/or Graylog output
    if (config.GRAYLOG_OUTPUT === 'both' || config.GRAYLOG_OUTPUT === 'local') {
        logToConsole(level, logObject);
    }

    if (config.GRAYLOG_OUTPUT === 'both' || config.GRAYLOG_OUTPUT === 'remote') {
        sendLogToGraylog(gelfMessage);
    }

    // Force garbage collection (if available)
    if (global.gc) global.gc();
}

// Log level functions
module.exports = {
    debug: (logObject) => log('debug', logObject),
    info: (logObject) => log('info', logObject),
    warn: (logObject) => log('warn', logObject),
    error: (logObject) => log('error', logObject),
    critical: (logObject) => log('critical', logObject)
};
