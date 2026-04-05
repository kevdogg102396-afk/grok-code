import React from 'react';
import { Text, Box, Static } from 'ink';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { colors } from './theme.js';

export interface DisplayMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolStatus?: 'running' | 'done' | 'error';
  toolArgs?: Record<string, any>;
}

interface ChatViewProps {
  messages: DisplayMessage[];
  streamText: string;
  isStreaming: boolean;
}

export function ChatView({ messages, streamText, isStreaming }: ChatViewProps): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Conversation history — permanent, never re-rendered */}
      <Static items={messages.map((m, i) => ({ ...m, id: String(i) }))}>
        {(msg) => (
          <Box key={msg.id} flexDirection="column" marginBottom={1}>
            {msg.role === 'user' && (
              <Box>
                <Text color={colors.success} bold>{'❯ '}</Text>
                <Text>{msg.content}</Text>
              </Box>
            )}
            {msg.role === 'assistant' && (
              <Box flexDirection="column">
                <MarkdownRenderer text={msg.content} />
              </Box>
            )}
          </Box>
        )}
      </Static>

      {/* Live area — streaming text or static "Working..." label */}
      {isStreaming && streamText ? (
        <Box flexDirection="column">
          <MarkdownRenderer text={streamText} />
        </Box>
      ) : isStreaming ? (
        <Text color={colors.primary}>⚡ Working...</Text>
      ) : null}
    </Box>
  );
}
