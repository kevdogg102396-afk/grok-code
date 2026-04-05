import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import { COMPANIONS, COMPANION_IDS } from './companions.js';
import { colors } from './theme.js';

interface CharacterPickerProps {
  onSelect: (companionId: string) => void;
}

export function CharacterPicker({ onSelect }: CharacterPickerProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((ch, key) => {
    if (key.leftArrow) {
      setSelectedIndex(i => (i - 1 + COMPANION_IDS.length) % COMPANION_IDS.length);
    }
    if (key.rightArrow) {
      setSelectedIndex(i => (i + 1) % COMPANION_IDS.length);
    }
    if (key.return) {
      onSelect(COMPANION_IDS[selectedIndex]);
    }
  });

  const current = COMPANIONS[COMPANION_IDS[selectedIndex]];

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text color={colors.primary} bold>Choose Your Companion</Text>
      <Text color={colors.muted}>They'll hang out with you while you code</Text>
      <Text> </Text>

      {/* Character preview — pixel art */}
      <Box flexDirection="column" alignItems="center">
        {current.frames[0].map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Text> </Text>

      {/* Name and description */}
      <Text color={current.color} bold>{current.name}</Text>
      <Text color={colors.muted}>{current.description}</Text>
      <Text> </Text>

      {/* Selection indicators */}
      <Box>
        {COMPANION_IDS.map((id, i) => (
          <Box key={id} marginX={1}>
            <Text
              color={i === selectedIndex ? COMPANIONS[id].color : colors.dim}
              bold={i === selectedIndex}
            >
              {i === selectedIndex ? '> ' : '  '}
              {COMPANIONS[id].name}
            </Text>
          </Box>
        ))}
      </Box>

      <Text> </Text>
      <Text color={colors.dim}>{'<- -> to browse, Enter to select'}</Text>
    </Box>
  );
}
