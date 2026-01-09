/**
 * Loads an external JavaScript script dynamically.
 * 
 * Checks if a script with the given ID already exists to prevent duplicates.
 * Scripts are loaded asynchronously to avoid blocking page rendering.
 * 
 * @param src - The URL of the script to load
 * @param id - Unique ID for the script element (used for deduplication)
 * @returns Promise that resolves to `true` when loaded, or rejects on error
 * 
 * @example
 * ```ts
 * await loadScript("https://cdn.example.com/sdk.js", "example-sdk");
 * // SDK is now available on window
 * ```
 */
export function loadScript(src: string, id: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(id) as HTMLScriptElement | null;

    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.body.appendChild(script);
  });
}
