/* The UI's own state. Everything about the run itself lives in S.run and is changed only through the engine. */
import type { Battle, BattleReport, FactionId, PlayerFaction, Run } from '../engine/index.ts';

export type Screen = 'pick' | 'leader' | 'shop' | 'encounter' | 'battle' | 'summary' | 'end';

export interface Summary {
  rep: BattleReport;
  res: 'win' | 'loss' | 'draw';
  title: string;
  bits: string[];
  foe: string;
  go: string;
  round: string;
}

export interface UiState {
  pickF: PlayerFaction | null;
  campFight: boolean;
  foeTitle: string;
  screen: Screen;
  run: Run | null;
  /** uid of the selected owned thing */
  sel: number | null;
  /** what the pointer is inspecting, e.g. "own:12", "shop:3", "def:knight:2" */
  insp: string | null;
  B: Battle | null;
  speed: number;
  msg: string;
  result: object | null;
  foe: FactionId;
  quitArm: boolean;
  save: string;
  aims?: Record<number, string> | null;
  foeLead?: string | null;
  helpOpen?: boolean;
  dlmsg?: string;
  dling?: boolean;
  loading?: boolean;
  touch?: boolean;
  /** board slot the held unit is over */
  hover?: number | null;
  drag?: boolean;
  sum?: Summary | null;
}

export const S: UiState = {
  pickF: null,
  campFight: false,
  foeTitle: '',
  screen: 'pick',
  run: null,
  sel: null,
  insp: null,
  B: null,
  speed: 1,
  msg: '',
  result: null,
  foe: 'H',
  quitArm: false,
  save: '',
};

export const root = document.getElementById('app')!;
