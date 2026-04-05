import React from 'react';
import { Text, Box } from 'ink';
import { Spinner } from './Spinner.js';
import { colors } from './theme.js';

interface ToolIndicatorProps {
  toolName: string;
  args?: Record<string, any>;
  status: 'running' | 'done' | 'error';
}

export function ToolIndicator({ toolName, args, status }: ToolIndicatorProps): React.ReactElement {
  const argStr = args ? Object.entries(args).map(([k, v]) => {
    const val = typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40);
    return `${k}=${val}`;
  }).join(', ') : '';

  return (
    <Box>
      {status === 'running' && <Spinner color={colors.primary} />}
      {status === 'done' && <Text color={colors.success}>✓</Text>}
      {status === 'error' && <Text color={colors.error}>✗</Text>}
      <Text color={colors.muted}> {toolName}</Text>
      {argStr && <Text color={colors.dim}>({argStr.slice(0, 60)})</Text>}
    </Box>
  );
}
