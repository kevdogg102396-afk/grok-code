import React from 'react';
import { Text, Box } from 'ink';
import gradientString from 'gradient-string';
import { colors, gradientColors } from './theme.js';
import { formatTokenCount } from '../util/tokens.js';
import { formatCost } from '../util/cost.js';
import { basename } from 'path';

interface StatusBarProps {
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  mode: string;
  sandboxed?: boolean;
  companionId: string;
  lastEvent?: 'idle' | 'toolStart' | 'toolDone' | 'error' | 'thinking';
  quipOverride?: string;
  cwd: string;
}

// Pre-render gradient title ONCE — never re-computed
const gradient = gradientString(...gradientColors.splash);
let GROK_TITLE: string;
try {
  GROK_TITLE = gradient('GROK CODE');
} catch {
  GROK_TITLE = 'GROK CODE';
}

export function StatusBar({ model, tokensIn, tokensOut, cost, mode, sandboxed, cwd }: StatusBarProps): React.ReactElement {
  const modeColor = mode === 'yolo' ? colors.error : mode === 'manual' ? colors.warning : colors.secondary;

  return (
    <Box borderStyle="single" borderColor={colors.primary}>
      <Text> {GROK_TITLE} </Text>
      <Text color={colors.dim}>│</Text>
      <Text color={colors.primary} bold> {model} </Text>
      <Text color={colors.dim}>│</Text>
      <Text color={colors.muted}> ↑{formatTokenCount(tokensIn)} ↓{formatTokenCount(tokensOut)} </Text>
      <Text color={colors.dim}>│</Text>
      <Text color={colors.warning}> {formatCost(cost)} </Text>
      <Text color={colors.dim}>│</Text>
      <Text color={modeColor}> {mode.toUpperCase()}</Text>
      {sandboxed && <Text color={colors.warning}> 🔒</Text>}
      <Text> </Text>
      <Text color={colors.dim}>│</Text>
      <Text color={colors.muted}> {basename(cwd)}</Text>
    </Box>
  );
}
