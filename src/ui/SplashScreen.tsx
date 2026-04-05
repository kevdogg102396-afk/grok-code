import React, { useState, useEffect } from 'react';
import { Text, Box, useApp } from 'ink';
import figlet from 'figlet';
import gradientString from 'gradient-string';
import { GrokBotSprite, GROKBOT_FRAME_COUNT } from './GrokBot.js';
import { gradientColors, brand, colors } from './theme.js';

interface SplashScreenProps {
  onComplete: () => void;
  model: string;
}

export function SplashScreen({ onComplete, model }: SplashScreenProps): React.ReactElement {
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState<'run' | 'reveal' | 'gradient' | 'info' | 'done'>('run');
  const [botX, setBotX] = useState(0);
  const [revealCol, setRevealCol] = useState(0);
  const [gradientOffset, setGradientOffset] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  // Generate the big title text
  const titleText = figlet.textSync('GROK CODE', { font: 'ANSI Shadow', horizontalLayout: 'fitted' });
  const titleLines = titleText.split('\n');
  const titleWidth = Math.max(...titleLines.map(l => l.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Use actual title width + some padding so the full text reveals
    const SCREEN_WIDTH = titleWidth + 10;

    if (phase === 'run') {
      // GrokBot runs across screen
      const newX = Math.min(tick * 2, SCREEN_WIDTH);
      setBotX(newX);
      setRevealCol(Math.max(0, newX - 5));
      if (revealCol >= titleWidth && newX >= SCREEN_WIDTH) {
        setPhase('gradient');
      }
    } else if (phase === 'gradient') {
      // Animated gradient cycling
      setGradientOffset(prev => prev + 1);
      if (gradientOffset > 20) {
        setPhase('info');
        setShowInfo(true);
      }
    } else if (phase === 'info') {
      // Show info, then complete
      if (gradientOffset > 35) {
        setPhase('done');
        onComplete();
      } else {
        setGradientOffset(prev => prev + 1);
      }
    }
  }, [tick]);

  // Apply gradient with offset for animated effect
  const gradient = gradientString(...gradientColors.splash);
  const applyGradient = (text: string): string => {
    // Shift the gradient by rotating the text through the gradient
    try {
      return gradient.multiline(text);
    } catch {
      return text;
    }
  };

  // Reveal text column by column
  const revealedTitle = phase === 'run'
    ? titleLines.map(line => {
        const visible = line.slice(0, revealCol);
        const hidden = ' '.repeat(Math.max(0, line.length - revealCol));
        return visible + hidden;
      }).join('\n')
    : titleText;

  const coloredTitle = phase === 'run'
    ? revealedTitle
    : applyGradient(revealedTitle);

  const botFrame = tick % GROKBOT_FRAME_COUNT;

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* Stars top */}
      <Text color={colors.warning}>{'  ★    ✦       ★          ✦        ★       ✦      ★'}</Text>
      <Text> </Text>

      {/* GrokBot running (only during run phase) */}
      {phase === 'run' && (
        <Box>
          <Text>{' '.repeat(botX)}</Text>
          <GrokBotSprite frame={botFrame} color={colors.primary} />
        </Box>
      )}

      {/* Title */}
      <Box flexDirection="column">
        {coloredTitle.split('\n').map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      <Text> </Text>

      {/* Info lines */}
      {showInfo && (
        <Box flexDirection="column" alignItems="center">
          <Text color={colors.primary} bold>{brand.tagline}</Text>
          <Text> </Text>
          <Text dimColor>AI coding agent powered by xAI&apos;s Grok</Text>
          <Text> </Text>
          <Text color={colors.warning}>{'  ★    ✦       ★          ✦        ★       ✦      ★'}</Text>
          <Text> </Text>
          <Text>  <Text color={colors.text}>Model:</Text>   <Text color={colors.primary}>{model}</Text></Text>
          <Text>  <Text color={colors.text}>Version:</Text> <Text color={colors.primary}>v{brand.version}</Text></Text>
          <Text> </Text>
          <Text dimColor>{'  ' + '─'.repeat(50)}</Text>
        </Box>
      )}

      {/* Bottom stars */}
      <Text> </Text>
      <Text color={colors.warning}>{'     ✦          ★         ✦           ★             ✦'}</Text>
    </Box>
  );
}
