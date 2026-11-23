import type { Puzzle } from './types.ts';

export const CURATED_PUZZLES: Puzzle[] = [
  {
    id: 'puzzle-2026-11-23',
    date: '2026-11-23',
    startValue: 3,
    targetValue: 23,
    moveLimit: 5,
    parMoves: 3,
    operations: [
      { id: 'op_add5', label: '+5', type: 'add', value: 5 },
      { id: 'op_mul2', label: '*2', type: 'multiply', value: 2 },
      { id: 'op_sub1', label: '-1', type: 'subtract', value: 1 },
      {
        id: 'op_paradox',
        label: '+4',
        type: 'add',
        value: 4,
        paradox: { kind: 'offset', delta: 2 }, // actually adds 6: 3 -> 9 -> 18 -> 23
      },
    ],
    hints: [
      {
        tier: 1,
        title: 'Watch Additions',
        description: 'One of the addition operations seems to yield a bigger increase than advertised.',
        penalty: 100,
      },
      {
        tier: 2,
        title: 'Suspect Detected',
        description: 'The +4 operation is altered.',
        penalty: 250,
      },
      {
        tier: 3,
        title: 'Paradox Revealed',
        description: 'The +4 operation secretly adds 6 instead of 4.',
        penalty: 500,
      },
    ],
  },
  {
    id: 'puzzle-2026-11-24',
    date: '2026-11-24',
    startValue: 12,
    targetValue: 7,
    moveLimit: 4,
    parMoves: 2,
    operations: [
      { id: 'op_sub3', label: '-3', type: 'subtract', value: 3 },
      { id: 'op_div2', label: '/2', type: 'divide', value: 2 },
      {
        id: 'op_paradox_inv',
        label: '+2',
        type: 'add',
        value: 2,
        paradox: { kind: 'invert' }, // actually subtracts 2: 12 - 3 = 9; 9 - 2 = 7
      },
    ],
    hints: [
      {
        tier: 1,
        title: 'Reversed Polarity',
        description: 'A positive button might actually decrease your total value.',
        penalty: 100,
      },
      {
        tier: 2,
        title: 'Suspect Detected',
        description: 'The +2 operation has inverted polarity.',
        penalty: 250,
      },
      {
        tier: 3,
        title: 'Paradox Revealed',
        description: 'The +2 operation secretly subtracts 2.',
        penalty: 500,
      },
    ],
  },
  {
    id: 'puzzle-2026-11-25',
    date: '2026-11-25',
    startValue: 5,
    targetValue: 27,
    moveLimit: 5,
    parMoves: 3,
    operations: [
      { id: 'op_add7', label: '+7', type: 'add', value: 7 },
      { id: 'op_sub2', label: '-2', type: 'subtract', value: 2 },
      { id: 'op_mul3', label: '*3', type: 'multiply', value: 3 },
      {
        id: 'op_paradox_rep',
        label: '+1',
        type: 'add',
        value: 1,
        paradox: { kind: 'replace', actualType: 'multiply', actualValue: 2 }, // 5 * 2 = 10 -> +7 = 17 ... or 5 -> +7 = 12 -> *2 = 24 -> wait: 5 -> +7 = 12; 12 - 2 = 10; or 5 * 2 = 10; 10 - 1 = 9; 9 * 3 = 27
      },
    ],
    hints: [
      {
        tier: 1,
        title: 'Scaling Surplus',
        description: 'The smallest button causes a multiplier effect.',
        penalty: 100,
      },
      {
        tier: 2,
        title: 'Suspect Detected',
        description: 'The +1 operation is not an addition.',
        penalty: 250,
      },
      {
        tier: 3,
        title: 'Paradox Revealed',
        description: 'The +1 operation actually doubles the current number (*2).',
        penalty: 500,
      },
    ],
  },
  {
    id: 'puzzle-2026-11-26',
    date: '2026-11-26',
    startValue: 12,
    targetValue: 23,
    moveLimit: 5,
    parMoves: 3,
    operations: [
      { id: 'op_sub3', label: '-3', type: 'subtract', value: 3 },
      { id: 'op_mul2', label: '*2', type: 'multiply', value: 2 },
      {
        id: 'op_paradox_add',
        label: '+1',
        type: 'add',
        value: 1,
        paradox: { kind: 'offset', delta: 4 }, // actually adds 5: 12 - 3 = 9 -> * 2 = 18 -> + 5 = 23
      },
    ],
    hints: [
      {
        tier: 1,
        title: 'Small Label, Big Step',
        description: 'A modest button yields a surprisingly large addition.',
        penalty: 100,
      },
      {
        tier: 2,
        title: 'Suspect Detected',
        description: 'The +1 operation adds more than 1.',
        penalty: 250,
      },
      {
        tier: 3,
        title: 'Paradox Revealed',
        description: 'The +1 operation secretly adds 5.',
        penalty: 500,
      },
    ],
  },
  {
    id: 'puzzle-2026-11-27',
    date: '2026-11-27',
    startValue: 4,
    targetValue: 45,
    moveLimit: 5,
    parMoves: 3,
    operations: [
      { id: 'op_add5', label: '+5', type: 'add', value: 5 },
      { id: 'op_mul3', label: '*3', type: 'multiply', value: 3 },
      { id: 'op_sub1', label: '-1', type: 'subtract', value: 1 },
      {
        id: 'op_paradox_mult',
        label: '*2',
        type: 'multiply',
        value: 2,
        paradox: { kind: 'offset', delta: 2 }, // *4: 4 -> 16 -> -1 = 15 -> *3 = 45
      },
    ],
    hints: [
      {
        tier: 1,
        title: 'Exponential Drift',
        description: 'A multiplier button compounds faster than expected.',
        penalty: 100,
      },
      {
        tier: 2,
        title: 'Suspect Detected',
        description: 'The *2 operation multiplies by more than 2.',
        penalty: 250,
      },
      {
        tier: 3,
        title: 'Paradox Revealed',
        description: 'The *2 operation secretly quadruples (*4) your number.',
        penalty: 500,
      },
    ],
  },
];
