import React from 'react';
import { Text, Box } from 'ink';
import { colors } from './theme.js';

interface MarkdownRendererProps {
  text: string;
}

export function MarkdownRenderer({ text }: MarkdownRendererProps): React.ReactElement {
  const lines = text.split('\n');

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith('### ')) return <Text key={i} color={colors.primary} bold>{line.slice(4)}</Text>;
        if (line.startsWith('## ')) return <Text key={i} color={colors.primary} bold>{line.slice(3)}</Text>;
        if (line.startsWith('# ')) return <Text key={i} color={colors.primary} bold>{line.slice(2)}</Text>;
        // Code blocks (simple)
        if (line.startsWith('```')) return <Text key={i} color={colors.dim}>{line}</Text>;
        // Bullet points
        if (line.match(/^\s*[-*] /)) return <Text key={i}><Text color={colors.primary}>  • </Text>{line.replace(/^\s*[-*] /, '')}</Text>;
        // Bold (simple)
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <Text key={i}>
              {parts.map((part, j) => j % 2 === 1 ? <Text key={j} bold>{part}</Text> : <Text key={j}>{part}</Text>)}
            </Text>
          );
        }
        // Normal text
        return <Text key={i}>{line}</Text>;
      })}
    </Box>
  );
}
