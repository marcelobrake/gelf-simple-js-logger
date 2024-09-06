// src/utils.ts

import os from 'os';

export const getHostname = (): string => {
  return os.hostname();
};

export const getRemoteAddress = (req?: any): string => {
  if (req && req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }
  return 'unknown';
};
