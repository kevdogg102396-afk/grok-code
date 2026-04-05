import React, { useState, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import { colors } from './theme.js';

interface InputBarProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
  history: string[];
}

export function InputBar({ onSubmit, disabled, history }: InputBarProps): React.ReactElement {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Static cursor — no blink timer = zero re-renders from cursor

  useInput((ch, key) => {
    if (disabled) return;

    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
        setCursor(0);
        setHistoryIndex(-1);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (cursor > 0) {
        setInput(prev => prev.slice(0, cursor - 1) + prev.slice(cursor));
        setCursor(c => c - 1);
      }
      return;
    }

    // Left/right arrow cursor movement
    if (key.leftArrow) {
      setCursor(c => Math.max(0, c - 1));
      return;
    }
    if (key.rightArrow) {
      setCursor(c => Math.min(input.length, c + 1));
      return;
    }

    // Ctrl+A: start of line
    if (key.ctrl && ch === 'a') {
      setCursor(0);
      return;
    }
    // Ctrl+E: end of line
    if (key.ctrl && ch === 'e') {
      setCursor(input.length);
      return;
    }
    // Ctrl+U: clear line
    if (key.ctrl && ch === 'u') {
      setInput('');
      setCursor(0);
      return;
    }
    // Ctrl+W: delete word backward
    if (key.ctrl && ch === 'w') {
      const before = input.slice(0, cursor);
      const after = input.slice(cursor);
      const trimmed = before.replace(/\S+\s*$/, '');
      setInput(trimmed + after);
      setCursor(trimmed.length);
      return;
    }

    if (key.upArrow) {
      const newIdx = Math.min(historyIndex + 1, history.length - 1);
      if (newIdx >= 0 && history[history.length - 1 - newIdx]) {
        setHistoryIndex(newIdx);
        const val = history[history.length - 1 - newIdx];
        setInput(val);
        setCursor(val.length);
      }
      return;
    }

    if (key.downArrow) {
      const newIdx = historyIndex - 1;
      if (newIdx < 0) {
        setHistoryIndex(-1);
        setInput('');
        setCursor(0);
      } else {
        setHistoryIndex(newIdx);
        const val = history[history.length - 1 - newIdx] || '';
        setInput(val);
        setCursor(val.length);
      }
      return;
    }

    if (key.escape) {
      setInput('');
      setCursor(0);
      setHistoryIndex(-1);
      return;
    }

    // Regular character input — insert at cursor position
    // Handles both single keystrokes and multi-char paste
    if (ch && !key.ctrl && !key.meta) {
      const chars = ch;
      setCursor(prev => {
        const newCursor = prev + chars.length;
        setInput(prevInput => prevInput.slice(0, prev) + chars + prevInput.slice(prev));
        return newCursor;
      });
    }
  });

  // Viewport — keep input to one line by showing a window around the cursor
  const PROMPT_WIDTH = 2; // "❯ "
  const viewportWidth = Math.max(40, (process.stdout.columns || 80) - PROMPT_WIDTH - 2);

  let viewStart = 0;
  let viewEnd = input.length;

  if (input.length > viewportWidth) {
    // Center the cursor in the viewport
    viewStart = Math.max(0, cursor - Math.floor(viewportWidth / 2));
    viewEnd = viewStart + viewportWidth;
    if (viewEnd > input.length) {
      viewEnd = input.length;
      viewStart = Math.max(0, viewEnd - viewportWidth);
    }
  }

  const visibleText = input.slice(viewStart, viewEnd);
  const cursorInView = cursor - viewStart;
  const beforeCursor = visibleText.slice(0, cursorInView);
  const afterCursor = visibleText.slice(cursorInView);
  const scrollIndicator = viewStart > 0 ? '…' : '';

  return (
    <Box>
      <Text color={disabled ? colors.dim : colors.success} bold>{'❯ '}</Text>
      <Text color={disabled ? colors.dim : colors.text}>
        {scrollIndicator}{beforeCursor}
        <Text color={colors.primary}>{!disabled ? '█' : ' '}</Text>
        {afterCursor.slice(1)}
      </Text>
    </Box>
  );
}
