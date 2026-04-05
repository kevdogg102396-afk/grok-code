import React from 'react';
import { Text, Box } from 'ink';
import gradientString from 'gradient-string';
import { gradientColors, colors, brand } from './theme.js';

interface HeaderProps {
  model: string;
}

const TITLE = [
  ' ██████╗ ██████╗  ██████╗ ██╗  ██╗     ██████╗ ██████╗ ██████╗ ███████╗',
  '██╔════╝ ██╔══██╗██╔═══██╗██║ ██╔╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
  '██║  ███╗██████╔╝██║   ██║█████╔╝     ██║     ██║   ██║██║  ██║█████╗  ',
  '██║   ██║██╔══██╗██║   ██║██╔═██╗     ██║     ██║   ██║██║  ██║██╔══╝  ',
  '╚██████╔╝██║  ██║╚██████╔╝██║  ██╗    ╚██████╗╚██████╔╝██████╔╝███████╗',
  ' ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝',
];

const gradient = gradientString(...gradientColors.splash);
let renderedTitle: string;
try {
  renderedTitle = gradient.multiline(TITLE.join('\n'));
} catch {
  renderedTitle = TITLE.join('\n');
}

export function Header({ model }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" alignItems="center" paddingTop={1}>
      <Box flexDirection="column">
        {renderedTitle.split('\n').map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Text color={colors.primary} bold>  {brand.tagline}</Text>
      <Text dimColor>  v{brand.version} • {model} • xAI</Text>
    </Box>
  );
}
