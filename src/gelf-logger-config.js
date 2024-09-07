// gelf-logger-config.js
module.exports = {
    GRAYLOG_HOST: process.env.GRAYLOG_HOST || '127.0.0.1',
    GRAYLOG_TRANSPORT: process.env.GRAYLOG_TRANSPORT || 'udp', // udp ou tcp
    GRAYLOG_PORT: process.env.GRAYLOG_PORT || 12201,
    GRAYLOG_APPLICATION_NAME: process.env.GRAYLOG_APPLICATION_NAME || 'my-application',
    GRAYLOG_ENVIRONMENT: process.env.GRAYLOG_ENVIRONMENT || 'development',
    GRAYLOG_MIN_LEVEL_LOCAL: process.env.GRAYLOG_MIN_LEVEL_LOCAL || 'debug',
    GRAYLOG_MIN_LEVEL_REMOTE: process.env.GRAYLOG_MIN_LEVEL_REMOTE || 'info',
    GRAYLOG_OUTPUT: process.env.GRAYLOG_OUTPUT || 'both', // local, remote, both
};
