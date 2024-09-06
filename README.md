# Graylog Logger

Pacote para captura e envio de logs para o Graylog com integração fácil e configurável. Também suporta logging local no console.

## Instalação

```bash
npm install graylog-logger
```

## Uso

```javascript
import { createLogger, LogMessage } from 'graylog-logger';

// Configuração personalizada (opcional)
const customConfig = {
  GRAYLOG_HOST: 'graylog.example.com',
  GRAYLOG_PORT: 12201,
  GRAYLOG_TRANSPORT: 'tcp',
  GRAYLOG_OUTPUT: 'both',
  additionalFields: {
    service: 'user-service',
    region: 'us-east-1'
  }
};

const logger = createLogger(customConfig);

// Log de informação
const infoLog: LogMessage = {
  message: "Usuário logado com sucesso",
  full_message: "O usuário com ID 12345 fez login com sucesso.",
  user_id: 12345
};

logger.info(infoLog);

// Log de erro com endereço remoto (exemplo em contexto de API)
const errorLog: LogMessage = {
  message: "Erro ao processar requisição",
  full_message: "Falha ao processar a requisição devido a uma exceção inesperada.",
  error_code: "E500",
  endpoint: "/api/login"
};

const remoteAddr = '192.168.1.100'; // Exemplo, obter a partir da requisição HTTP

logger.error(errorLog, remoteAddr);


```
