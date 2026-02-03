import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import matter from "gray-matter";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "markdown-loader",
      transform(code, id) {
        if (id.endsWith(".md")) {
          const { data, content } = matter(code);
          return {
            code: `export const data = ${JSON.stringify(data)};
export const body = ${JSON.stringify(content)};
export default { data, body };`,
            map: null,
          };
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: "/",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
});
