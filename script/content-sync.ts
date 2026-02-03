import { execSync } from "child_process";

async function sync() {
  console.log("Checking for content changes...");
  
  // 1. Run the generation script
  console.log("Generating static content...");
  try {
    execSync("npx tsx script/generate-content.ts", { stdio: "inherit" });
  } catch (err) {
    console.error("Failed to generate content:", err);
    process.exit(1);
  }

  // 2. Check if there are changes in the public directory (including api and images)
  const status = execSync("git status --porcelain client/public/").toString();
  
  if (status) {
    console.log("Changes detected in static content and assets. Committing...");

    try {
      execSync("git config --local user.email \"action@github.com\"", { stdio: "inherit" });
      execSync("git config --local user.name \"GitHub Action\"", { stdio: "inherit" });

      execSync("git add client/public/", { stdio: "inherit" });
      execSync("git commit -m \"chore: update static content and assets from markdown/CMS\"", { stdio: "inherit" });

      console.log("Attempting to push changes...");
      // Use rebase to handle potential conflicts from concurrent CMS edits
      // We use --autostash to be safe, although there should be no local changes besides what we just committed
      execSync("git pull --rebase --autostash", { stdio: "inherit" });
      execSync("git push", { stdio: "inherit" });

      console.log("Changes pushed successfully.");
    } catch (error) {
      console.error("Failed to commit and push changes:", error);
      process.exit(1);
    }
  } else {
    console.log("No content or asset changes detected.");
  }
}

sync().catch((err) => {
  console.error("FATAL ERROR during content sync:", err);
  process.exit(1);
});
