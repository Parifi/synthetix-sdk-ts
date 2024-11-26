import { Logger } from 'tslog';
import { DEFAULT_LOGGER_LEVEL, MessageType } from '../constants';

const baseLogger = new Logger({
  minLevel: DEFAULT_LOGGER_LEVEL, 
  
});

let isInitialized = false;

export const initializeLogger = (logLevel: number,type:MessageType) => {
  if (!isInitialized) {
    baseLogger.settings.minLevel = logLevel 
    baseLogger.settings.type = type
    isInitialized = true;
    baseLogger.info(`Logger initialized with log level: ${logLevel}`);
  } else {
    baseLogger.warn('Logger is already initialized. Ignoring new configuration.');
  }
};


export const logger = baseLogger;
