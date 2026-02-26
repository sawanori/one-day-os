/**
 * One Day OS - Delay Utility
 * Promise-based delay for async sequencing
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
