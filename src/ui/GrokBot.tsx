import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';

// ── Splash Robot (bigger, cooler, for the intro animation) ──
const SPLASH_FRAMES = [
  // Frame 0: standing
  [
    '    ╔═══╗    ',
    '   ╔╩═══╩╗   ',
    '   ║ ◉ ◉ ║   ',
    '   ║  ▽  ║   ',
    '   ╚═╤═╤═╝   ',
    '  ┌──┘ └──┐  ',
    '  │ ░░░░░ │  ',
    '  │ ░░░░░ │  ',
    '  └──┬─┬──┘  ',
    '     │ │     ',
    '    ═╧ ╧═    ',
  ],
  // Frame 1: right step
  [
    '    ╔═══╗    ',
    '   ╔╩═══╩╗   ',
    '   ║ ◉ ◉ ║   ',
    '   ║  ▽  ║   ',
    '   ╚═╤═╤═╝   ',
    '  ┌──┘ └──┐  ',
    '  │ ░░░░░ │  ',
    '  │ ░░░░░ │  ',
    '  └──┬─┬──┘  ',
    '     │  \\   ',
    '    ═╧  └─   ',
  ],
  // Frame 2: happy stride
  [
    '    ╔═══╗    ',
    '   ╔╩═══╩╗   ',
    '   ║ ◠ ◠ ║   ',
    '   ║  ◡  ║   ',
    '   ╚═╤═╤═╝   ',
    '  ┌──┘ └──┐  ',
    '  │ ░░░░░ │  ',
    '  │ ░░░░░ │  ',
    '  └──┬─┬──┘  ',
    '    / │      ',
    '   ─┘ ╧═     ',
  ],
  // Frame 3: left step
  [
    '    ╔═══╗    ',
    '   ╔╩═══╩╗   ',
    '   ║ ◉ ◉ ║   ',
    '   ║  ▽  ║   ',
    '   ╚═╤═╤═╝   ',
    '  ┌──┘ └──┐  ',
    '  │ ░░░░░ │  ',
    '  │ ░░░░░ │  ',
    '  └──┬─┬──┘  ',
    '    /  │     ',
    '   ─┘ ╧═     ',
  ],
];

// ── Companion Blob (cute lil creature for the status bar) ──
const BLOB_FRAMES = [
  [' ╭───╮ ', ' │◠‿◠│ ', ' ╰───╯ '],
  [' ╭───╮ ', ' │◠ω◠│ ', '  ╰─╯  '],
  [' ╭───╮ ', ' │◠‿◠│ ', ' ╰───╯ '],
  ['  ╭──╮ ', '  │◠◡◠│', '  ╰──╯ '],
  [' ╭───╮ ', ' │◉‿◉│ ', ' ╰───╯ '],
  ['╭────╮ ', '│ ◠‿◠ │', '╰────╯ '],
];

interface GrokBotProps {
  frame?: number;
  color?: string;
}

export function GrokBotSprite({ frame = 0, color = '#00D4FF' }: GrokBotProps): React.ReactElement {
  const frameData = SPLASH_FRAMES[frame % SPLASH_FRAMES.length];
  return (
    <Box flexDirection="column">
      {frameData.map((line, i) => (
        <Text key={i} color={color}>{line}</Text>
      ))}
    </Box>
  );
}

interface CompanionProps {
  color?: string;
}

export function CompanionBlob({ color = '#00D4FF' }: CompanionProps): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % BLOB_FRAMES.length);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const blob = BLOB_FRAMES[frame];
  return (
    <Box flexDirection="column">
      {blob.map((line, i) => (
        <Text key={i} color={color}>{line}</Text>
      ))}
    </Box>
  );
}

export const GROKBOT_WIDTH = 14;
export const GROKBOT_HEIGHT = SPLASH_FRAMES[0].length;
export const GROKBOT_FRAME_COUNT = SPLASH_FRAMES.length;
