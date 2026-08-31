import * as fs from "fs";
import { parseRscResponse } from "../lib/linkedin/rsc";

const raw = fs.readFileSync("debug-com.linkedin.sdui.generated.profile.dsl.impl.profileCardsExperienceOnly.json", "utf8");
const parsed = parseRscResponse(raw);

const output: string[] = [];

function walk(node: unknown, path: string) {
  if (!node) return;
  if (typeof node === "string") {
    if (node.includes("Co-Founder") || node.includes("Advisor") || node.includes("Apr 2026 - Aug 2026")) {
      output.push(`${path} => ${JSON.stringify(node)}`);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`);
  } else if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      walk(v, `${path}["${k}"]`);
    }
  }
}

walk(parsed, "root");

fs.writeFileSync("found-paths.txt", output.join("\n"));
console.log(`Found ${output.length} paths.`);
