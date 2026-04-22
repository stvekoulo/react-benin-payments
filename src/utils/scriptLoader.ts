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
  // Guard for SSR environments (Next.js server components, Node.js)
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(id) as HTMLScriptElement | null;

    if (existingScript) {
      const scriptState = existingScript as HTMLScriptElement & {
        readyState?: string;
      };
      const isAlreadyLoaded =
        existingScript.dataset.loaded === "true" ||
        scriptState.readyState === "complete";

      if (isAlreadyLoaded) {
        resolve(true);
        return;
      }

      const handleLoad = () => {
        existingScript.dataset.loaded = "true";
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
        resolve(true);
      };

      const handleError = () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
        reject(new Error(`Failed to load script: ${src}`));
      };

      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(true);
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.body.appendChild(script);
  });
}
