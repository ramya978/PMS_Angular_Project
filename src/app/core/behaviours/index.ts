import { mountFd07 } from './fd-07';

// Screen behaviours, keyed by the name given in the route data. Each one wires up a screen's
// filters and search after its HTML has been inserted.
export const BEHAVIOURS: Record<string, (root: HTMLElement) => void> = {
  'fd-07': mountFd07,
};
