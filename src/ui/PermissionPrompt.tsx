import React from 'react';
import { Text, Box, useInput } from 'ink';
import { colors } from './theme.js';

interface PermissionPromptProps {
  toolName: string;
  args: Record<string, any>;
  onAllow: () => void;
  onDeny: () => void;
}

export function PermissionPrompt({ toolName, args, onAllow, onDeny }: PermissionPromptProps): React.ReactElement {
  useInput((ch) => {
    if (ch === 'y' || ch === 'Y') onAllow();
    else if (ch === 'n' || ch === 'N') onDeny();
  });

  const argStr = Object.entries(args)
    .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v).slice(0, 80)}`)
    .join('\n');

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.warning} paddingX={1} paddingY={0}>
      <Text color={colors.warning} bold>⚠ Permission Required</Text>
      <Text> </Text>
      <Text>Tool: <Text color={colors.primary} bold>{toolName}</Text></Text>
      <Text color={colors.muted}>{argStr}</Text>
      <Text> </Text>
      <Text>
        Allow? <Text color={colors.success} bold>[Y]es</Text> / <Text color={colors.error} bold>[N]o</Text>
      </Text>
    </Box>
  );
}
