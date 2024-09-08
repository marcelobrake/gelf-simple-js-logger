# gelf-simple-js-logger

## Description

`gelf-simple-js-logger` is a simple logger that sends logs to Graylog using the GELF (Graylog Extended Log Format) protocol and console. This package allows you to configure the logger to send logs via UDP or TCP.

## Installation

To install the package, use npm:

```sh
npm install gelf-simple-js-logger
```

## Usage

1. **Create a configuration file:** Create a file named `logger-config.js` with the following content or use this environment variables on run:

```javascript

// logger-config.js
module.exports = {
    GRAYLOG_HOST: '127.0.0.1', // Replace with your Graylog server address
    GRAYLOG_TRANSPORT: 'udp', // or 'tcp'
    GRAYLOG_PORT: 12201,
    GRAYLOG_APPLICATION_NAME: 'my_app',
    GRAYLOG_ENVIRONMENT: 'development',
    GRAYLOG_MIN_LEVEL_LOCAL: 'debug',
    GRAYLOG_MIN_LEVEL_REMOTE: 'info',
    GRAYLOG_OUTPUT: 'both' // both, local or remote
};

```

* If you prefer, you can provide these variables as environment variables instead of creating this file.

2.**Use the logger in your project:** Import and use the logger in your project files.

```javascript
// test.js
const createLogger = require('gelf-simple-js-logger');
const customConfig = require('./logger-config');

const logger = createLogger(customConfig);

// Send messages to Graylog and Console
logger.debug({ message: 'Information log test', additional: 'debug log', product: 'test' });
logger.info({ message: 'Information log test', additional: 'info log', product: 'test' });
logger.warn({ message: 'Information log test', additional: 'warning log', product: 'test' });
logger.error({ message: 'Information log test', additional: 'error log', product: 'test' });
logger.critical({ message: 'Information log test', additional: 'critical log', product: 'test' });

logger.info({ message: 'Information log test' });

```

No value is required. But it is recommended to send the `message` and/or `full_message` values.
Any other value sent becomes additional fields on the Graylog Server, in addition to the fields that are already sent by default:

* **host** (get by function os.hostname())
* **short_message** (get by message field or if null 'No message')
* **full_message** (get by full_message field or equals message field)
* **level** (get by function - debug, info, warn, error or critical)
* **application_name** (get by ENV GRAYLOG_APPLICATION_NAME )
* **environment** (get by ENV GRAYLOG_ENVIRONMENT)
* **remote_addr** (get public IP via https://checkip.amazonaws.com)
* **timestamp** (get by new Date().toISOString() command)

3.**Run your project:** Execute your project to see the logs being sent to Graylog.

```sh
node --expose-gc test.js
```

### Configuration Options

* **GRAYLOG_HOST:** The address of your Graylog server.
* **GRAYLOG_TRANSPORT:** The transport protocol to use (udp, tcp, or http).
* **GRAYLOG_PORT:** The port on which Graylog is listening.
* **GRAYLOG_APPLICATION_NAME:** The name of your application.
* **GRAYLOG_ENVIRONMENT:** The environment (e.g., development, production).
* **GRAYLOG_MIN_LEVEL_LOCAL:** The minimum log level for local logging.
* **GRAYLOG_MIN_LEVEL_REMOTE:** The minimum log level for remote logging.
* **GRAYLOG_OUTPUT:** Where to output logs (console, graylog, or both).
