import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

export function debug(...args: any[]): void {
  if (shouldLog('debug')) console.log(chalk.gray('[DEBUG]'), ...args);
}

export function info(...args: any[]): void {
  if (shouldLog('info')) console.log(chalk.cyan('[INFO]'), ...args);
}

export function warn(...args: any[]): void {
  if (shouldLog('warn')) console.log(chalk.yellow('[WARN]'), ...args);
}

export function error(...args: any[]): void {
  if (shouldLog('error')) console.log(chalk.red('[ERROR]'), ...args);
}
