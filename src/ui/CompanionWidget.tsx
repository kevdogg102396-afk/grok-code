import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import { COMPANIONS, getRandomQuip } from './companions.js';

interface CompanionWidgetProps {
  companionId: string;
  lastEvent?: 'idle' | 'toolStart' | 'toolDone' | 'error' | 'thinking';
  quipOverride?: string;
}

export function CompanionWidget({ companionId, lastEvent = 'idle', quipOverride }: CompanionWidgetProps): React.ReactElement {
  const [frame, setFrame] = useState(0);
  const [quip, setQuip] = useState('');
  const companion = COMPANIONS[companionId] || COMPANIONS.alien;

  // No animation timer — static companion prevents footer re-renders
  // Frame only changes on event transitions (toolDone, error)

  // Show quip on events — quip stays until replaced by next one (no timeout = no re-render)
  useEffect(() => {
    if (quipOverride) {
      setQuip(quipOverride);
    }
  }, [quipOverride]);

  useEffect(() => {
    if (lastEvent === 'toolDone' || lastEvent === 'error') {
      setQuip(getRandomQuip(companion, lastEvent));
      setFrame(f => (f + 1) % companion.frames.length);
    }
  }, [lastEvent, companion]);

  const frameData = companion.frames[frame % companion.frames.length];

  return (
    <Box>
      <Box flexDirection="column">
        {frameData.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      {quip ? (
        <Box marginLeft={1} flexDirection="column" justifyContent="center">
          <Text color={companion.color} dimColor italic>
            {quip.length > 28 ? quip.slice(0, 28) + '..' : quip}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
