// tests/logger.test.ts

import { createLogger, LogMessage } from '../src';
import gelfPro from 'gelf-pro';

jest.mock('gelf-pro');

describe('Logger', () => {
  const mockGelf = gelfPro as jest.Mocked<typeof gelfPro> & { info: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    mockGelf.setConfig.mockClear();
    mockGelf.info.mockClear();
    mockGelf.error.mockClear();
  });

  it('deve inicializar com configurações padrão', () => {
    createLogger();
    expect(mockGelf.setConfig).toHaveBeenCalled();
  });

  it('deve enviar logs para Graylog e console quando output é "both"', () => {
    const logger = createLogger({ GRAYLOG_OUTPUT: 'both' });
    const log: LogMessage = { message: 'Test', full_message: 'Test message' };
    
    logger.info(log, '127.0.0.1');

    expect(mockGelf.info).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test',
      full_message: 'Test message',
      remote_addr: '127.0.0.1'
    }));
  });

  // Adicione mais testes conforme necessário
});
