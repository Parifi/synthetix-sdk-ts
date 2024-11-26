import { Logger } from 'tslog';
import { MessageType } from '../constants';

const baseLogger = new Logger({
  minLevel: 2, 
  
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
