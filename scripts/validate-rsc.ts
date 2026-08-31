import * as fs from "fs";
import * as path from "path";
import { parseRscResponse } from "../lib/linkedin/rsc";

const ROOT = path.resolve(__dirname, "..");

function find(node: unknown, marker: string, d = 0): unknown | null {
  if (d > 40) return null;
  if (typeof node === "string") return node.includes(marker) ? node : null;
  if (Array.isArray(node)) {
    for (const i of node) {
      if (typeof i === "string" && i.includes(marker)) return node;
      const f = find(i, marker, d + 1);
      if (f) return f;
    }
    return null;
  }
  if (node && typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) {
      if (typeof v === "string" && (v as string).includes(marker)) return node;
      const f = find(v, marker, d + 1);
      if (f) return f;
    }
    return null;
  }
  return null;
}

function has(node: unknown, target: string, d = 0): boolean {
  if (d > 40) return false;
  if (typeof node === "string") return node.includes(target);
  if (Array.isArray(node)) return node.some((i) => has(i, target, d + 1));
  if (node && typeof node === "object")
    return Object.values(node as Record<string, unknown>).some((v) => has(v, target, d + 1));
  return false;
}

// --- Experience ---
const expRaw = fs.readFileSync(path.join(ROOT, "debug-com.linkedin.sdui.generated.profile.dsl.impl.profileCardsExperienceOnly.json"), "utf8");
const expResolved = parseRscResponse(expRaw);
const expSub = find(expResolved, "experienceTopLevelSection");

const expReport = {
  resolved_type: Array.isArray(expResolved) ? "array" : typeof expResolved,
  marker_found: !!expSub,
  subtree_snippet: expSub ? JSON.stringify(expSub).slice(0, 5000) : null,
  field_checks: {
    title: has(expResolved, "title"),
    companyName: has(expResolved, "companyName"),
    description: has(expResolved, "description"),
    startDate: has(expResolved, "startDate"),
    endDate: has(expResolved, "endDate"),
  },
};

// --- AboveActivity ---
const aboveRaw = fs.readFileSync(path.join(ROOT, "debug-com.linkedin.sdui.generated.profile.dsl.impl.profileCardsAboveActivity.json"), "utf8");
const aboveResolved = parseRscResponse(aboveRaw);
const aboutSub = find(aboveResolved, "aboutSection");

const aboveReport = {
  resolved_type: Array.isArray(aboveResolved) ? "array" : typeof aboveResolved,
  about_marker_found: !!aboutSub,
  about_subtree_snippet: aboutSub ? JSON.stringify(aboutSub).slice(0, 5000) : null,
  field_checks: {
    name: has(aboveResolved, "name"),
    headline: has(aboveResolved, "headline"),
    location: has(aboveResolved, "location"),
    profileImage: has(aboveResolved, "profileImage"),
    backgroundImage: has(aboveResolved, "backgroundImage"),
  },
};

const report = { experience: expReport, aboveActivity: aboveReport };

fs.writeFileSync(path.join(ROOT, "validate-report.json"), JSON.stringify(report, null, 2), "utf8");
console.log("Report written to validate-report.json");
