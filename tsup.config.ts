import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const addUseClient = () => {
  const files = [
    "dist/index.js",
    "dist/index.mjs",
    "dist/fedapay.js",
    "dist/fedapay.mjs",
    "dist/kkiapay.js",
    "dist/kkiapay.mjs",
    "dist/core.js",
    "dist/core.mjs",
  ];
  files.forEach((file) => {
    const filePath = resolve(file);
    try {
      const content = readFileSync(filePath, "utf-8");
      if (!content.startsWith('"use client"')) {
        writeFileSync(filePath, `"use client";\n${content}`);
      }
    } catch {
      // File may not exist yet
    }
  });
};

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      fedapay: "src/fedapay.ts",
      kkiapay: "src/kkiapay.ts",
      core: "src/core/index.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    external: ["react", "react-dom", "jspdf"],
    onSuccess: async () => {
      addUseClient();
      console.log("Added 'use client' directive to output files");
    },
  },
  {
    entry: { "cli/init": "src/cli/init.ts" },
    format: ["cjs"],
    platform: "node",
    target: "node18",
    dts: false,
    sourcemap: false,
    clean: false,
    minify: false,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
