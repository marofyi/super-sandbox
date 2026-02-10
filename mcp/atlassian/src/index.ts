import { AtlassianClient } from "./jira-client.js";

const EMAIL = process.env.ATLASSIAN_EMAIL;
const API_TOKEN = process.env.ATLASSIAN_API_TOKEN;
const BASE_URL = process.env.ATLASSIAN_BASE_URL; // e.g., https://yourcompany.atlassian.net

if (!EMAIL || !API_TOKEN || !BASE_URL) {
  console.error("Missing required environment variables:");
  console.error("  ATLASSIAN_EMAIL      - Your Atlassian account email");
  console.error("  ATLASSIAN_API_TOKEN  - API token from https://id.atlassian.com/manage-profile/security/api-tokens");
  console.error("  ATLASSIAN_BASE_URL   - Your Atlassian URL (e.g., https://yourcompany.atlassian.net)");
  process.exit(1);
}

const client = new AtlassianClient({
  email: EMAIL,
  apiToken: API_TOKEN,
  baseUrl: BASE_URL,
});

async function main() {
  try {
    // Get current user
    console.log("Connecting to Atlassian...\n");
    const user = await client.getMyself();
    console.log(`Logged in as: ${user.displayName} (${user.emailAddress})\n`);

    // Get projects
    console.log("JIRA PROJECTS");
    console.log("─".repeat(50));
    const projects = await client.getProjects();
    projects.slice(0, 10).forEach((p) => {
      console.log(`  [${p.key}] ${p.name}`);
    });
    if (projects.length > 10) {
      console.log(`  ... and ${projects.length - 10} more`);
    }

    // Get my issues
    console.log("\n\nMY ASSIGNED ISSUES");
    console.log("─".repeat(60));
    const result = await client.getMyIssues(15);

    if (!result.issues || result.issues.length === 0) {
      console.log("  No issues assigned to you.");
    } else {
      result.issues.forEach((issue) => {
        const key = issue.key ?? "N/A";
        const status = issue.fields?.status?.name ?? "N/A";
        const type = issue.fields?.issuetype?.name ?? "";
        const summary = issue.fields?.summary ?? "No summary";
        console.log(`  ${key.padEnd(12)} ${type.padEnd(8)} [${status.padEnd(20)}] ${summary.substring(0, 35)}`);
      });
      console.log(`\n  Showing ${result.issues.length} of ${result.total} total`);
    }

    // Get Confluence spaces
    console.log("\n\nCONFLUENCE SPACES");
    console.log("─".repeat(50));
    try {
      const spaces = await client.getConfluenceSpaces();
      spaces.results.slice(0, 10).forEach((s) => {
        console.log(`  [${s.key}] ${s.name}`);
      });
      if (spaces.results.length > 10) {
        console.log(`  ... and ${spaces.results.length - 10} more`);
      }
    } catch (e) {
      console.log("  Could not fetch Confluence spaces (may not have access)");
    }

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
