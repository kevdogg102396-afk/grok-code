import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
  color?: string;
  label?: string;
}

export function Spinner({ color = '#00D4FF', label }: SpinnerProps): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text>
      <Text color={color}>{SPINNER_FRAMES[frame]}</Text>
      {label && <Text> {label}</Text>}
    </Text>
  );
}
