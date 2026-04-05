import { homedir } from 'os';
import { join } from 'path';

export const IS_WINDOWS = process.platform === 'win32';
export const IS_MAC = process.platform === 'darwin';
export const IS_LINUX = process.platform === 'linux';

export const HOME_DIR = homedir();
export const CONFIG_DIR = join(HOME_DIR, '.grok-code');
export const DATA_DIR = join(CONFIG_DIR, 'data');
export const SESSIONS_DIR = join(DATA_DIR, 'sessions');

export function getShell(): string {
  if (IS_WINDOWS) return process.env.COMSPEC || 'cmd.exe';
  return process.env.SHELL || '/bin/bash';
}
