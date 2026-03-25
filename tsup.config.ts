import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const addUseClient = () => {
  const files = ["dist/index.js", "dist/index.mjs"];
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
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    external: ["react", "react-dom"],
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
