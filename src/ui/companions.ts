// Pixel art colors
const C = {
  _: null,           // transparent
  G: '#2D8B4E',      // dark green (body)
  g: '#3DB86A',      // light green (face)
  P: '#E84393',      // pink (eyes/antenna)
  W: '#FFFFFF',      // white (eye shine)
  D: '#1A5632',      // darker green (shadow)
  C: '#00D4FF',      // cyan (robot)
  c: '#0099BB',      // dark cyan (robot shadow)
  B: '#7B61FF',      // purple (blob)
  b: '#5A3FCC',      // dark purple (blob shadow)
  Y: '#FFD700',      // yellow (cat)
  y: '#CC9900',      // dark yellow (cat shadow)
  O: '#FF8C00',      // orange
  K: '#333333',      // dark (outlines)
  w: '#CCCCCC',      // light gray
} as const;

type ColorKey = keyof typeof C;

// Each pixel grid is rows x cols of color keys
// Rendered using half-blocks for 2x vertical resolution
type PixelGrid = (ColorKey | null)[][];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r};${g};${b}`;
}

function renderPixelArt(grid: PixelGrid): string[] {
  const lines: string[] = [];
  // Process 2 rows at a time (upper half + lower half = 1 terminal line)
  for (let y = 0; y < grid.length; y += 2) {
    let line = '';
    const topRow = grid[y] || [];
    const botRow = grid[y + 1] || [];
    const width = Math.max(topRow.length, botRow.length);

    for (let x = 0; x < width; x++) {
      const top = topRow[x];
      const bot = botRow[x];
      const topColor = top ? C[top] : null;
      const botColor = bot ? C[bot] : null;

      if (topColor && botColor) {
        // Both pixels: top = foreground with upper half block, bottom = background
        line += `\x1b[38;2;${hexToRgb(topColor)}m\x1b[48;2;${hexToRgb(botColor)}m\u2580\x1b[0m`;
      } else if (topColor) {
        // Only top pixel
        line += `\x1b[38;2;${hexToRgb(topColor)}m\u2580\x1b[0m`;
      } else if (botColor) {
        // Only bottom pixel
        line += `\x1b[38;2;${hexToRgb(botColor)}m\u2584\x1b[0m`;
      } else {
        // Empty
        line += ' ';
      }
    }
    lines.push(line);
  }
  return lines;
}

// ── Character Pixel Grids ──

// Alien (based on Kevin's compAnIon - round green body, pink eyes, antenna)
const ALIEN_FRAMES: PixelGrid[] = [
  // Frame 0: normal - cute round alien with antenna
  [
    [null,null,null,null,'P',null,null,null,null],
    [null,null,null,'P','P','P',null,null,null],
    [null,null,'G','G','G','G','G',null,null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','P','g','g','g','P','G',null],
    [null,'G','P','W','g','W','P','G',null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','g','g','D','g','g','G',null],
    [null,null,'G','G','G','G','G',null,null],
    [null,null,null,'D','D','D',null,null,null],
  ],
  // Frame 1: blink
  [
    [null,null,null,null,'P',null,null,null,null],
    [null,null,null,'P','P','P',null,null,null],
    [null,null,'G','G','G','G','G',null,null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','D','D','g','D','D','G',null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','g','g','D','g','g','G',null],
    [null,null,'G','G','G','G','G',null,null],
    [null,null,null,'D','D','D',null,null,null],
  ],
  // Frame 2: looking left
  [
    [null,null,null,null,'P',null,null,null,null],
    [null,null,null,'P','P','P',null,null,null],
    [null,null,'G','G','G','G','G',null,null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','P','g','g','P','g','G',null],
    [null,'G','P','W','g','P','W','G',null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','g','g','D','g','g','G',null],
    [null,null,'G','G','G','G','G',null,null],
    [null,null,null,'D','D','D',null,null,null],
  ],
  // Frame 3: happy
  [
    [null,null,null,null,'P',null,null,null,null],
    [null,null,null,'P','P','P',null,null,null],
    [null,null,'G','G','G','G','G',null,null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','P','g','g','g','P','G',null],
    [null,'G','P','W','g','W','P','G',null],
    [null,'G','g','g','g','g','g','G',null],
    [null,'G','g','D','D','D','g','G',null],
    [null,null,'G','G','G','G','G',null,null],
    [null,null,null,'D','D','D',null,null,null],
  ],
];

// Robot (cyan, boxy, cute)
const ROBOT_FRAMES: PixelGrid[] = [
  [
    [null,null,null,'C','C','C',null,null,null],
    [null,null,'C','C','C','C','C',null,null],
    [null,'c','C','C','C','C','C','c',null],
    [null,'c','W','C','C','C','W','c',null],
    [null,'c','W','C','C','C','W','c',null],
    [null,'C','C','c','C','c','C','C',null],
    [null,null,'C','C','C','C','C',null,null],
    [null,null,'c','C','C','C','c',null,null],
    [null,null,null,'c',null,'c',null,null,null],
  ],
  [
    [null,null,null,'C','C','C',null,null,null],
    [null,null,'C','C','C','C','C',null,null],
    [null,'c','C','C','C','C','C','c',null],
    [null,'c','c','C','C','C','c','c',null],
    [null,'c','c','C','C','C','c','c',null],
    [null,'C','C','c','C','c','C','C',null],
    [null,null,'C','C','C','C','C',null,null],
    [null,null,'c','C','C','C','c',null,null],
    [null,null,null,'c',null,'c',null,null,null],
  ],
  [
    [null,null,null,'C','C','C',null,null,null],
    [null,null,'C','C','C','C','C',null,null],
    [null,'c','C','C','C','C','C','c',null],
    [null,'c','W','C','C','W','C','c',null],
    [null,'c','W','C','C','W','C','c',null],
    [null,'C','C','c','C','c','C','C',null],
    [null,null,'C','C','C','C','C',null,null],
    [null,null,'c','C','C','C','c',null,null],
    [null,null,null,'c',null,'c',null,null,null],
  ],
  [
    [null,null,null,'C','C','C',null,null,null],
    [null,null,'C','C','C','C','C',null,null],
    [null,'c','C','C','C','C','C','c',null],
    [null,'c','W','C','C','C','W','c',null],
    [null,'c','W','C','C','C','W','c',null],
    [null,'C','C','C','c','C','C','C',null],
    [null,null,'C','C','C','C','C',null,null],
    [null,null,'c','C','C','C','c',null,null],
    [null,null,null,'c',null,'c',null,null,null],
  ],
];

// Cat (yellow/gold, ears, whiskers)
const CAT_FRAMES: PixelGrid[] = [
  [
    [null,'Y',null,null,null,null,null,'Y',null],
    [null,'Y','Y',null,null,null,'Y','Y',null],
    [null,'Y','Y','Y','Y','Y','Y','Y',null],
    [null,'Y','P',null,'Y',null,'P','Y',null],
    [null,'Y','P','W','Y','W','P','Y',null],
    [null,'Y','Y','y','y','y','Y','Y',null],
    [null,null,'Y','Y','Y','Y','Y',null,null],
    [null,null,null,'y','y','y',null,null,null],
  ],
  [
    [null,'Y',null,null,null,null,null,'Y',null],
    [null,'Y','Y',null,null,null,'Y','Y',null],
    [null,'Y','Y','Y','Y','Y','Y','Y',null],
    [null,'Y','y',null,'Y',null,'y','Y',null],
    [null,'Y','y','y','Y','y','y','Y',null],
    [null,'Y','Y','y','y','y','Y','Y',null],
    [null,null,'Y','Y','Y','Y','Y',null,null],
    [null,null,null,'y','y','y',null,null,null],
  ],
  [
    [null,'Y',null,null,null,null,null,'Y',null],
    [null,'Y','Y',null,null,null,'Y','Y',null],
    [null,'Y','Y','Y','Y','Y','Y','Y',null],
    [null,'Y','P',null,'Y','P',null,'Y',null],
    [null,'Y','P','W','Y','P','W','Y',null],
    [null,'Y','Y','y','y','y','Y','Y',null],
    [null,null,'Y','Y','Y','Y','Y',null,null],
    [null,null,null,'y','y','y',null,null,null],
  ],
  [
    [null,'Y',null,null,null,null,null,'Y',null],
    [null,'Y','Y',null,null,null,'Y','Y',null],
    [null,'Y','Y','Y','Y','Y','Y','Y',null],
    [null,'Y','P',null,'Y',null,'P','Y',null],
    [null,'Y','P','W','Y','W','P','Y',null],
    [null,'Y','Y','Y','y','Y','Y','Y',null],
    [null,null,'Y','Y','Y','Y','Y',null,null],
    [null,null,null,'y','y','y',null,null,null],
  ],
];

// Blob (purple, amorphous, cute face)
const BLOB_FRAMES: PixelGrid[] = [
  [
    [null,null,'B','B','B','B','B',null,null],
    [null,'B','B','B','B','B','B','B',null],
    [null,'B','W',null,'B',null,'W','B',null],
    [null,'B','W',null,'B',null,'W','B',null],
    [null,'B','B','B','b','B','B','B',null],
    [null,null,'B','B','B','B','B',null,null],
    [null,null,null,'b','b','b',null,null,null],
  ],
  [
    [null,null,null,'B','B','B',null,null,null],
    [null,null,'B','B','B','B','B',null,null],
    [null,'B','B','B','B','B','B','B',null],
    [null,'B','W',null,'B',null,'W','B',null],
    [null,'B','B','B','b','B','B','B',null],
    [null,null,'B','B','B','B','B',null,null],
    [null,null,null,'b','b',null,null,null,null],
  ],
  [
    [null,'B','B','B','B','B','B','B',null],
    [null,'B','B','B','B','B','B','B',null],
    [null,'B',null,'W','B','W',null,'B',null],
    [null,'B',null,'W','B','W',null,'B',null],
    [null,'B','B','b','b','b','B','B',null],
    [null,null,'B','B','B','B','B',null,null],
    [null,null,null,'b','b','b',null,null,null],
  ],
  [
    [null,null,'B','B','B','B','B',null,null],
    [null,'B','B','B','B','B','B','B',null],
    [null,'B','W',null,'B',null,'W','B',null],
    [null,'B','W',null,'B',null,'W','B',null],
    [null,'B','B','b','B','b','B','B',null],
    [null,null,'B','B','B','B','B',null,null],
    [null,null,null,null,'b','b','b',null,null],
  ],
];

// Pre-render all frames for performance
function prerenderFrames(grids: PixelGrid[]): string[][] {
  return grids.map(grid => renderPixelArt(grid));
}

export interface CompanionCharacter {
  id: string;
  name: string;
  description: string;
  color: string;
  frames: string[][];
  quips: {
    idle: string[];
    toolStart: string[];
    toolDone: string[];
    error: string[];
    thinking: string[];
    greeting: string[];
  };
}

export const COMPANIONS: Record<string, CompanionCharacter> = {
  alien: {
    id: 'alien',
    name: 'Zyx',
    description: 'A curious alien observer',
    color: '#3DB86A',
    frames: prerenderFrames(ALIEN_FRAMES),
    quips: {
      idle: ['Fascinating species...', '*adjusts antennae*', 'Your code is... alien to me', '*scribbles notes about humans*', 'Is this what you call "debugging"?', '*vibes*'],
      toolStart: ['Ooh running something!', '*leans in curiously*', 'Interesting...', 'Scanning...'],
      toolDone: ['Specimen collected!', 'Data logged.', '*nods approvingly*', 'Nice.'],
      error: ['That was... not optimal', '*concerned alien noises*', 'Even on my planet that fails', 'Oof.'],
      thinking: ['*processing earth logic*', 'Computing...', '*telepathy intensifies*'],
      greeting: ['Greetings, human coder!', 'Take me to your codebase!'],
    },
  },
  robot: {
    id: 'robot',
    name: 'Bolt',
    description: 'A trusty robot sidekick',
    color: '#00D4FF',
    frames: prerenderFrames(ROBOT_FRAMES),
    quips: {
      idle: ['*whirrs contentedly*', 'Systems nominal.', 'Awaiting instructions.', 'Working hard or hardly working?', '*oil can noises*', 'Ready to compute!'],
      toolStart: ['Executing...', '*gears spinning*', 'On it, boss!', 'Processing...'],
      toolDone: ['Task complete!', '*triumphant beep*', 'Another one down.', 'Efficiency: 100%'],
      error: ['ERROR 404: success not found', '*sparks fly*', 'That did NOT compute', 'Rebooting confidence...'],
      thinking: ['*thinking noises*', 'Calculating...', '*CPU go brrr*'],
      greeting: ['Bolt online! Ready to build!', 'Hey! Let\'s crush some code!'],
    },
  },
  cat: {
    id: 'cat',
    name: 'Meni',
    description: 'A clever coding cat',
    color: '#FFD700',
    frames: prerenderFrames(CAT_FRAMES),
    quips: {
      idle: ['*purrs*', '*knocks something off desk*', '*sits on keyboard*', 'Meow.', '*stares at cursor*', '*chases a bug... literally*'],
      toolStart: ['*ears perk up*', '*watches intently*', 'Pouncing...', '*tail swish*'],
      toolDone: ['*satisfied purr*', 'Caught it!', '*licks paw*', 'Nyaa~ done!'],
      error: ['*hisses at the error*', 'Not my fault.', '*pushes error off table*', '*judges silently*'],
      thinking: ['*contemplates existence*', '*stares into void*', 'Hmm... *tail flick*'],
      greeting: ['*stretches* Oh, you\'re coding?', 'Meni reporting for duty... eventually.'],
    },
  },
  blob: {
    id: 'blob',
    name: 'Goop',
    description: 'A friendly amorphous blob',
    color: '#7B61FF',
    frames: prerenderFrames(BLOB_FRAMES),
    quips: {
      idle: ['*jiggles happily*', '*absorbs knowledge*', 'Bloop!', '*wobbles*', '*oozes enthusiasm*', '*vibes*'],
      toolStart: ['Ooh ooh!', '*bounces excitedly*', 'Blooping on it!', '*stretches toward screen*'],
      toolDone: ['*happy wobble*', 'Bloop bloop!', '*jiggles with pride*', 'Nailed it!'],
      error: ['*deflates slightly*', 'Oof...', '*sad bloop*', '*squishes nervously*'],
      thinking: ['*pulsates thoughtfully*', '*morphs into thinking pose*', 'Hmm bloop...'],
      greeting: ['*bounces in* Hey there!', 'Goop is ready to goop!'],
    },
  },
};

export const COMPANION_IDS = Object.keys(COMPANIONS);
export const DEFAULT_COMPANION = 'alien';

export function getRandomQuip(companion: CompanionCharacter, category: keyof CompanionCharacter['quips']): string {
  const quips = companion.quips[category];
  return quips[Math.floor(Math.random() * quips.length)];
}
