import { execSync } from "child_process";
import { existsSync } from "fs";

async function sync() {
  console.log("Checking for content changes...");
  
  // 1. Run the generation script
  console.log("Generating static content...");
  execSync("npx tsx script/generate-content.ts", { stdio: "inherit" });

  // 2. Check if there are changes in the public/api directory
  const status = execSync("git status --porcelain client/public/api/").toString();
  
  if (status) {
    console.log("Changes detected in static content. Committing...");
    execSync("git config --local user.email \"action@github.com\"", { stdio: "inherit" });
    execSync("git config --local user.name \"GitHub Action\"", { stdio: "inherit" });
    execSync("git add client/public/api/", { stdio: "inherit" });
    execSync("git commit -m \"chore: update static content from markdown\"", { stdio: "inherit" });
    execSync("git push", { stdio: "inherit" });
    console.log("Changes pushed successfully.");
  } else {
    console.log("No content changes detected.");
  }
}

sync().catch(console.error);
