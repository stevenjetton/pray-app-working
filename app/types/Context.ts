// types/Context.ts
import { Encounter } from './Encounter';
export type RecordingContextType = {
  recordings: Encounter[];
  // ...other context values
};
