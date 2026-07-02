/**
 * Converts a Blob to a base64 data URL (e.g. `"data:application/pdf;base64,..."`).
 * Relies on `FileReader`, so this only runs in a browser (or jsdom) environment.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Triggers a browser download for a Blob via a temporary `<a download>` link.
 * No-op outside the browser (SSR).
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
