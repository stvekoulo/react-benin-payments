/**
 * Checks if the current environment is a test environment.
 * Safe to use in browser and Node.js contexts.
 * 
 * @returns true if running in test mode
 */
export function isTestEnvironment(): boolean {
  // Safe check for Node.js environment
  if (typeof process === "undefined") {
    return false;
  }
  
  if (!process.env) {
    return false;
  }
  
  return process.env.NODE_ENV === "test";
}
