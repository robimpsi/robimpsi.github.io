import { build as viteBuild } from "vite";
import { rm } from "fs/promises";
import { execSync } from "child_process";

async function buildAll() {
  console.log("Cleaning dist...");
  await rm("dist", { recursive: true, force: true });

  console.log("Building client...");
  await viteBuild();

  console.log("Creating 404.html for SPA routing...");
  const fs = await import("fs/promises");
  await fs.copyFile("dist/index.html", "dist/404.html");
  
  console.log("Build complete!");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
