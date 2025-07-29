export const DEBUG = import.meta.env.VITE_DEBUG_LOG === 'true';
export function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}
