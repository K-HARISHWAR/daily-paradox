# Daily Paradox — Game Design & Product Specification

## 1. Game Concept & Core Hook

**Daily Paradox** is a daily arithmetic deduction puzzle designed for Reddit (built on Devvit). 

Every day, players are given:
- A **Starting Number**
- A **Target Number**
- A **Move Limit** (number of allowed operations per run)
- A set of 3 to 4 **Operation Buttons** (e.g. `+4`, `*2`, `-3`)

### The Paradox Mechanic
Exactly **one** operation button is a "Paradox" — its actual behavior secretly differs from its button label. 

The player must experiment, inspect the resulting arithmetic history, deduce the secret rule behind the paradox button, and find the shortest path to hit the target number exactly.

---

## 2. Core Game Rules

1. **Daily Uniformity:**
   - Every player across Reddit receives the exact same puzzle for a given UTC calendar date (`YYYY-MM-DD`).
2. **Exactly One Paradox:**
   - In each puzzle, exactly one operation is altered. All other operations execute normal standard arithmetic as labeled.
3. **Move Consumption:**
   - Each operation button press consumes 1 move from the run's move allowance.
4. **Exact Target Condition:**
   - The current value must equal the target value **exactly**.
   - Reaching past the target (overshooting or undershooting) when moves run out counts as a loss for that run.
5. **No Penalty for Experimentation & Reset:**
   - Players have unlimited resets. Tapping **Reset** restores the starting number and resets the current run's move counter to 0.
   - Experimentation is an intended core loop to discover the paradox behavior.
6. **Integer-Only Arithmetic:**
   - All values remain integers. If division operations are included, they are only enabled when the current number is evenly divisible by the divisor (`current % divisor === 0`).
   - Value safety bounds: numbers are bounded between `-9,999` and `99,999` to prevent arithmetic overflow.

---

## 3. Paradox Discovery & Deduction Mechanism

The game **never** automatically reveals "Button X is altered!" upon clicking it. Instead:

1. **Arithmetic History Feed:**
   - Every move appends an entry to the Move History log showing:
     `Previous Value` -> `[Tapped Action]` -> `Resulting Value`
   - Example:
     `Start: 3` -> Player clicks `[+4]` -> `Result: 9`
   - The player immediately notices: $3 + 4 = 7 \ne 9$. The equation reveals that adding 4 actually produced an increase of 6!
2. **Consistent Determinism:**
   - The altered behavior is 100% deterministic throughout the puzzle. If `+4` adds `6`, it will add `6` every single time it is pressed.
3. **Player Deduction Annotation (Optional UI aid):**
   - Players can optionally flag or tag a button as the suspected Paradox to help their mental planning.

---

## 4. Progressive Hint System

Hints are tiered to provide gentle guidance without giving away the answer immediately:

| Tier | Name | Description | Score Penalty |
| :--- | :--- | :--- | :--- |
| **Tier 1** | *Observation Nudge* | Suggests where to look (e.g., *"One of the addition operations seems to yield a larger number than expected."*) | -100 pts |
| **Tier 2** | *Suspect Revealed* | Reveals which specific button is the Paradox (e.g., *"The [+4] button is the paradox."*) | -250 pts |
| **Tier 3** | *Full Twist Reveal* | Explicitly reveals the hidden behavior (e.g., *"The [+4] button actually adds 6."*) | -500 pts |

### Hint Rules:
- Hints are unlocked progressively (Tier 1 -> Tier 2 -> Tier 3).
- Hints do not mutate the puzzle state or advance move counts.
- Unlocked hints persist across resets for the current day.
- Using hints reduces the final score, but score cannot drop below 100 points for a winning completion.

---

## 5. Scoring Model

The scoring formula is transparent and rewards efficiency and pure deduction:

$$\text{Final Score} = \max\Big(100, \, \text{Base} + \text{Move Bonus/Penalty} + \text{Deduction Bonus} - \text{Hint Penalties}\Big)$$

- **Base Score:** 1,000 pts
- **Par Moves:** Each puzzle defines a known minimum solution move count (e.g., $\text{Par} = 3$).
  - Solving in $\le \text{Par}$ moves: **+200 pts bonus**
  - Solving in $> \text{Par}$ moves: **-50 pts** per extra move taken on the winning run
- **Pure Deduction Bonus:** **+150 pts** if solved without unlocking Tier 2 or Tier 3 hints.
- **Hint Penalties:**
  - Tier 1 used: -100 pts
  - Tier 2 used: -250 pts
  - Tier 3 used: -500 pts
- **Score Floor:** 100 pts on win (completing always awards at least 100 points).

---

## 6. Game State Definitions

```typescript
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export type OperationType = 'add' | 'subtract' | 'multiply' | 'divide';

export type Operation = {
  id: string;             // e.g. 'op_1'
  label: string;          // e.g. '+4'
  type: OperationType;
  value: number;          // displayed parameter, e.g. 4
  isParadox?: boolean;    // internal flag (never sent to client UI directly)
};

export type MoveHistoryItem = {
  moveNumber: number;
  operationId: string;
  operationLabel: string;
  beforeValue: number;
  afterValue: number;
};

export type GameState = {
  puzzleId: string;
  date: string;           // 'YYYY-MM-DD'
  startValue: number;
  targetValue: number;
  currentValue: number;
  moveLimit: number;
  movesRemaining: number;
  movesTaken: number;
  status: GameStatus;
  history: MoveHistoryItem[];
  unlockedHintLevel: 0 | 1 | 2 | 3;
  score: number | null;
};
```

### State Transitions:
1. **Init (`idle`):** `currentValue = startValue`, `movesRemaining = moveLimit`, `history = []`.
2. **Apply Operation (`idle` or `playing` -> `playing`):**
   - Consume 1 move (`movesRemaining -= 1`, `movesTaken += 1`).
   - Compute `afterValue` using actual operation logic.
   - If `afterValue === targetValue` -> Transition to `won`.
   - Else if `movesRemaining === 0` -> Transition to `lost`.
   - Else -> `status = 'playing'`.
3. **Reset (`any` -> `idle`):**
   - Reset `currentValue = startValue`, `movesRemaining = moveLimit`, `movesTaken = 0`, `history = []`.
   - `unlockedHintLevel` remains unlocked.
4. **Completed (`won`):**
   - Board locks. Results modal appears with score breakdown, move count, and Reddit share card button.

---

## 7. Sample Puzzles (Walkthroughs)

### Sample Puzzle 1: "The Secret Surplus"
- **Puzzle ID:** `puzzle-2026-11-23`
- **Start Value:** `3`
- **Target Value:** `23`
- **Move Limit:** `5`
- **Par:** `3` moves
- **Operations:**
  - `op_1`: `+5` (Normal: adds 5)
  - `op_2`: `*2` (Normal: multiplies by 2)
  - `op_3`: `-1` (Normal: subtracts 1)
  - `op_4`: `+4` (**PARADOX:** actually adds `6`)
- **Hints:**
  - Tier 1: *"One of the addition operations seems to yield a bigger increase than advertised."*
  - Tier 2: *"The `+4` button is altered."*
  - Tier 3: *"The `+4` button actually adds 6 instead of 4."*
- **Solution Walkthrough:**
  1. `3` -> tap `op_4` (`[+4]`, paradox $+6$) -> value becomes `9`
  2. `9` -> tap `op_2` (`[*2]`, normal $\times 2$) -> value becomes `18`
  3. `18` -> tap `op_1` (`[+5]`, normal $+5$) -> value becomes `23` (**TARGET REACHED!**)

---

### Sample Puzzle 2: "The Reversed Polarity"
- **Puzzle ID:** `puzzle-2026-11-24`
- **Start Value:** `12`
- **Target Value:** `7`
- **Move Limit:** `4`
- **Par:** `3` moves
- **Operations:**
  - `op_1`: `-3` (Normal: subtracts 3)
  - `op_2`: `/2` (Normal: divides by 2 if even)
  - `op_3`: `+2` (**PARADOX:** actually subtracts 2, i.e. $-2$)
- **Hints:**
  - Tier 1: *"A positive operation might actually decrease your total."*
  - Tier 2: *"The `+2` button has inverted polarity."*
  - Tier 3: *"The `+2` button actually subtracts 2."*
- **Solution Walkthrough:**
  1. `12` -> tap `op_2` (`[/2]`) -> value becomes `6`
  2. `6` -> tap `op_3` (`[+2]`, paradox $-2$) -> value becomes `4`
  3. `4` -> tap `op_1` (`[-3]`, wait: $4 - 3 = 1 \ne 7$; Alternative path: $12 \xrightarrow{+2 (\text{act } -2)} 10 \xrightarrow{/2} 5 \xrightarrow{+2 (\text{act } -2)} 3$)
  - Or directly: $12 \xrightarrow{-3} 9 \xrightarrow{-3} 6 \xrightarrow{+2 (\text{act } -2)} 4$, etc.

---

## 8. Potential Pitfalls, Player Confusion & Guardrails

| Risk / Pitfall | Why It Causes Failure | Required Engine Guardrail |
| :--- | :--- | :--- |
| **Indistinguishable Paradox** | If an altered operation produces the exact same output as its label on the starting value (e.g. `*1` vs `+0` on 0), the player cannot deduce it. | Puzzle validator requires that applying the paradox operation to the starting value (or reachable immediate states) produces a divergent output: $\text{actual}(s) \ne \text{nominal}(s)$. |
| **Unsolvable Target** | If target is unreachable in $\le \text{moveLimit}$, players get permanently stuck. | Every puzzle must pass an automated Breadth-First Search (BFS) solver ensuring at least one valid path within $\le \text{moveLimit}$. |
| **Division by Zero / Fractions** | Fractions break integer mental math; zero division crashes. | Division is only permitted when $a \pmod b = 0$. If not evenly divisible, the button is temporarily disabled for that turn with clear visual feedback. |
| **Runaway Exponents** | Repeated multiplication could produce arbitrarily large numbers. | Hard cap current value within $[-9,999, +99,999]$. If an operation would exceed bounds, disable it for that turn. |
| **Accidental Spoiling** | Inspecting network payloads or client state reveals which operation is paradox. | The client receives only nominal labels (`+4`, `*2`, etc.) and sends operation IDs (`op_1`, `op_2`). In offline mode, the paradox logic is obfuscated/minified; for server validation, the server holds the true ground truth. |

---

## 9. Onboarding Screen Copy

```
┌────────────────────────────────────────────────────────┐
│                   HOW TO PLAY                          │
│                                                        │
│ 1. HIT THE TARGET                                      │
│    Use the math buttons to transform the START number  │
│    into the TARGET number before running out of moves. │
│                                                        │
│ 2. SPOT THE PARADOX                                    │
│    One button is lying! Its label says one thing, but  │
│    it secretly does another. Watch the math history!   │
│                                                        │
│ 3. DEDUCE & WIN                                        │
│    Figure out the hidden rule, reach the target, and   │
│    compete for the best score of the day!              │
│                                                        │
│           [ PLAY TODAY'S PARADOX ]                     │
└────────────────────────────────────────────────────────┘
```
