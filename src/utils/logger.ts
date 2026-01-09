const PREFIX = "[react-benin-payments]";

const STYLES = {
  info: "color: #4E6BFF; font-weight: bold;",
  success: "color: #0AB67A; font-weight: bold;",
  error: "color: #EF4444; font-weight: bold;",
  warn: "color: #F59E0B; font-weight: bold;",
};

/**
 * Creates a styled logger for debug mode.
 * 
 * When enabled, logs are color-coded by level:
 * - Info: Blue (#4E6BFF)
 * - Success: Green (#0AB67A)
 * - Error: Red (#EF4444)
 * - Warn: Orange (#F59E0B)
 * 
 * @param enabled - Whether logging is enabled
 * @returns Logger object with info, success, error, and warn methods
 * 
 * @example
 * ```ts
 * const log = createLogger(true);
 * log.info("Loading SDK...");
 * log.success("SDK loaded!");
 * log.error("Failed to load", error);
 * ```
 */
export function createLogger(enabled: boolean): Logger {
  return {
    info: (message: string, ...args: unknown[]) => {
      if (enabled) {
        console.log(`%c${PREFIX} ${message}`, STYLES.info, ...args);
      }
    },
    success: (message: string, ...args: unknown[]) => {
      if (enabled) {
        console.log(`%c${PREFIX} ${message}`, STYLES.success, ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (enabled) {
        console.error(`%c${PREFIX} ${message}`, STYLES.error, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (enabled) {
        console.warn(`%c${PREFIX} ${message}`, STYLES.warn, ...args);
      }
    },
  };
}

/**
 * Logger interface with color-coded methods.
 */
export interface Logger {
  /** Log informational message (blue) */
  info: (message: string, ...args: unknown[]) => void;
  /** Log success message (green) */
  success: (message: string, ...args: unknown[]) => void;
  /** Log error message (red) */
  error: (message: string, ...args: unknown[]) => void;
  /** Log warning message (orange) */
  warn: (message: string, ...args: unknown[]) => void;
}
