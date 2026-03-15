import { ContractId } from '../enums';
import { clOverride } from './cl';
import { gcOverride } from './gc';
import { nqOverride } from './nq';
import { sixeOverride } from './sixe';
import { znOverride } from './zn';

export const contractOverrides = {
  [ContractId.NQ]: nqOverride,
  [ContractId.ZN]: znOverride,
  [ContractId.GC]: gcOverride,
  [ContractId.SIXE]: sixeOverride,
  [ContractId.CL]: clOverride
};
