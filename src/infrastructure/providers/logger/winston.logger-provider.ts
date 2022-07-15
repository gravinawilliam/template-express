import 'winston-daily-rotate-file';

import emoji from 'node-emoji';
import { addColors, createLogger, format, Logger as WinstonLoggerType, transports } from 'winston';

import {
  ISendErrorLoggerProvider,
  SendErrorLoggerProviderDTO
} from '@domain/contracts/providers/logger/send-error-logger.provider';
import {
  ISendHttpLoggerProvider,
  SendHttpLoggerProviderDTO
} from '@domain/contracts/providers/logger/send-http-logger.provider';
import {
  ISendInfoLoggerProvider,
  SendInfoLoggerProviderDTO
} from '@domain/contracts/providers/logger/send-info-logger.provider';

import { GLOBAL_CONFIG } from '@main/configs/environments.config';

enum LevelName {
  SILLY = 'silly',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
  HTTP = 'http',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

const LEVEL_SEVERITY = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const LEVEL_COLOR = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'grey',
  debug: 'white',
  silly: 'cyan'
};

const DEFAULT_FORMAT = format.combine(
  format.errors({ stack: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.ms' }),
  format.printf(parameters =>
    `[${parameters.timestamp}] ${parameters.level.toLocaleUpperCase()} ${parameters.message} ${
      parameters.stack || ''
    }`.trim()
  )
);

const CONSOLE_FORMAT = format.combine(
  format(parameters => ({ ...parameters, level: parameters.level.toUpperCase() }))(),
  format.errors({ stack: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.ms' }),
  format.colorize({ all: true }),
  format.printf(parameters =>
    `[${parameters.timestamp}] ${parameters.level} ${parameters.message} ${parameters.stack || ''}`.trim()
  )
);

export class WinstonLoggerProvider
  implements ISendErrorLoggerProvider, ISendInfoLoggerProvider, ISendHttpLoggerProvider
{
  private readonly level: string = GLOBAL_CONFIG.IS_DEVELOPMENT ? LevelName.DEBUG : LevelName.INFO;

  private readonly logsFolder: string = GLOBAL_CONFIG.LOGS_FOLDER;

  private readonly logger: WinstonLoggerType;

  constructor() {
    this.logger = this.configureAndGetLogger();
  }

  public error(parameters: SendErrorLoggerProviderDTO.Parameters): SendErrorLoggerProviderDTO.Result {
    if (parameters.value instanceof Error) {
      this.logger.error(emoji.get('x'), parameters.value);
    } else {
      this.logger.error(`${emoji.get('x')} ${this.getValue(parameters.value)}`);
    }
  }

  public info(parameters: SendInfoLoggerProviderDTO.Parameters): SendInfoLoggerProviderDTO.Result {
    this.logger.info(`${emoji.get('bulb')} ${this.getValue(parameters.message)}`);
  }

  public http(parameters: SendHttpLoggerProviderDTO.Parameters): void {
    this.logger.http(`${emoji.get('computer')} ${this.getValue(parameters.message)}`);
  }

  private configureAndGetLogger = (): WinstonLoggerType => {
    addColors(LEVEL_COLOR);

    const transportsList = [
      new transports.Console({
        level: this.level,
        handleExceptions: true,
        format: CONSOLE_FORMAT
      }),
      new transports.File({
        filename: `${this.logsFolder}/error.log`,
        level: LevelName.ERROR,
        handleExceptions: true,
        maxsize: 5_242_880, // 5MB
        maxFiles: 1
      }),
      new transports.DailyRotateFile({
        filename: `${this.logsFolder}/all-%DATE%.log`,
        level: this.level,
        handleExceptions: true,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d'
      })
    ];

    return createLogger({
      level: this.level,
      levels: LEVEL_SEVERITY,
      format: DEFAULT_FORMAT,
      transports: transportsList,
      exitOnError: false,
      handleExceptions: true
    });
  };

  private getValue = (parameters: string | unknown): string => {
    if (typeof parameters === 'string') {
      return parameters;
    }
    return JSON.stringify(parameters);
  };
}
