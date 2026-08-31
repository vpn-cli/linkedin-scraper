/**
 * Diagnostic script: Trace the RSC structure of profileCardsExperienceOnly
 * 
 * - Does NOT modify parser.ts, client.ts, requests.ts, or rsc.ts
 * - Does NOT use collectStrings()
 * - Does NOT implement extraction logic
 * - Does NOT infer positional mappings
 * 
 * Run: npx tsx scripts/diagnose-experience.ts
 */

import * as fs from "fs";
import * as path from "path";
import { parseRscResponse } from "../lib/linkedin/rsc";

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "debug-com.linkedin.sdui.generated.profile.dsl.impl.profileCardsExperienceOnly.json");

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isNoise(value: string): boolean {
  if (!value || value.length === 0) return true;
  if (value === "$" || value.startsWith("$L") || value.startsWith("$S")) return true;
  // CSS class tokens
  if (/^[_a-f0-9]{6,}(\s+[_a-f0-9]+)*$/.test(value)) return true;
  if (/^[a-f0-9]{8}-[a-f0-9]{4}/.test(value)) return true; // UUIDs
  // Component/tracking IDs
  if (value.startsWith("com.linkedin.")) return true;
  // CDN image URLs
  if (value.startsWith("https://media.licdn.com/")) return true;
  if (value.startsWith("https://static.licdn.com/")) return true;
  // Layout tokens
  if (["div","span","li","ul","ol","br","img","p","h1","h2","h3","section","button","a"].includes(value)) return true;
  if (value.startsWith("data-")) return true;
  // Single special chars
  if (value.length === 1 && /[^a-zA-Z0-9]/.test(value)) return true;
  // Binding keys
  if (value.startsWith("expandable_") || value.startsWith("auto-component")) return true;
  // Action URNs
  if (value.startsWith("urn:li:")) return true;
  // Encoded tracking tokens
  if (/^[A-Za-z0-9+/=]{20,}$/.test(value)) return true;

  return false;
}

function findByStringValue(node: unknown, target: string, depth = 0): unknown | null {
  if (depth > 50) return null;
  if (typeof node === "string") return node.includes(target) ? node : null;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item === "string" && item.includes(target)) return node;
      const found = findByStringValue(item, target, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (node !== null && typeof node === "object") {
    const record = node as Record<string, unknown>;
    for (const value of Object.values(record)) {
      if (typeof value === "string" && value.includes(target)) return node;
      const found = findByStringValue(value, target, depth + 1);
      if (found) return found;
    }
    return null;
  }
  return null;
}

/**
 * Find all <li> elements in the RSC tree.
 * RSC elements are arrays: ["$", "li", key, props]
 */
function findAllLiElements(node: unknown, depth = 0, results: unknown[] = []): unknown[] {
  if (depth > 50 || !node) return results;

  if (Array.isArray(node)) {
    // Check if this IS a ["$", "li", ...] tuple
    if (node[0] === "$" && node[1] === "li") {
      results.push(node);
    }
    // Recurse into children
    for (const item of node) {
      findAllLiElements(item, depth + 1, results);
    }
  } else if (typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      findAllLiElements(value, depth + 1, results);
    }
  }

  return results;
}

/**
 * Extract all meaningful strings from a subtree (non-noise only).
 * NOT collectStrings — this is a targeted diagnostic helper.
 */
function extractMeaningfulStrings(node: unknown, depth = 0, results: string[] = []): string[] {
  if (depth > 30) return results;

  if (typeof node === "string") {
    if (!isNoise(node)) results.push(node);
    return results;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      extractMeaningfulStrings(item, depth + 1, results);
    }
    return results;
  }

  if (node !== null && typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      extractMeaningfulStrings(value, depth + 1, results);
    }
  }

  return results;
}

/**
 * Get metadata from a node: componentKey, observabilityIdentifier
 */
function getNodeMeta(node: unknown): Record<string, string> {
  const meta: Record<string, string> = {};
  if (!node || typeof node !== "object") return meta;

  function walk(n: unknown, d = 0) {
    if (d > 5 || !n || typeof n !== "object") return;
    const r = n as Record<string, unknown>;
    if (typeof r.componentKey === "string") meta.componentKey = r.componentKey;
    if (typeof r.observabilityIdentifier === "string") meta.observabilityIdentifier = r.observabilityIdentifier;
    if (typeof r["data-testid"] === "string") meta["data-testid"] = r["data-testid"];
    for (const v of Object.values(r)) {
      if (typeof v === "object") walk(v, d + 1);
    }
  }
  walk(node);
  return meta;
}

/**
 * Truncate a JSON representation for readable printing.
 */
function truncate(obj: unknown, maxDepth = 4, maxArr = 3, d = 0): unknown {
  if (d >= maxDepth) return "[...]";
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj.length > 100 ? obj.slice(0, 100) + "..." : obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    const items = obj.slice(0, maxArr).map((i) => truncate(i, maxDepth, maxArr, d + 1));
    if (obj.length > maxArr) items.push(`... (${obj.length - maxArr} more)`);
    return items;
  }

  const result: Record<string, unknown> = {};
  const entries = Object.entries(obj as Record<string, unknown>);
  for (const [k, v] of entries.slice(0, 8)) {
    result[k] = truncate(v, maxDepth, maxArr, d + 1);
  }
  if (entries.length > 8) result["..."] = `${entries.length - 8} more keys`;
  return result;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

const raw = fs.readFileSync(FILE, "utf8");
const resolved = parseRscResponse(raw);

const output: string[] = [];
function log(...args: unknown[]) {
  const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2))).join(" ");
  output.push(line);
}

log("=== DIAGNOSTIC: profileCardsExperienceOnly ===");
log("Raw size:", raw.length, "bytes");
log("Resolved type:", Array.isArray(resolved) ? "array" : typeof resolved);

// Step 1: Find experienceTopLevelSection
log("\n--- Step 1: Locate experienceTopLevelSection ---");
const expSection = findByStringValue(resolved, "experienceTopLevelSection");
if (!expSection) {
  log("NOT FOUND");
} else {
  log("FOUND");
  const meta = getNodeMeta(expSection);
  log("Node metadata:", meta);
}

// Step 2: Find all <li> elements within the experience section
log("\n--- Step 2: Find all <li> elements ---");
const lis = findAllLiElements(expSection);
log("Total <li> elements found:", lis.length);

// Step 3: Print first 3 <li> items
for (let i = 0; i < Math.min(3, lis.length); i++) {
  log(`\n--- Experience <li> #${i} ---`);

  const li = lis[i];
  const liMeta = getNodeMeta(li);
  log("Metadata:", liMeta);

  const strings = extractMeaningfulStrings(li);
  log("Meaningful strings:", strings);

  log("Truncated structure:");
  log(JSON.stringify(truncate(li, 5, 4), null, 2));
}

// Write results
const outPath = path.join(ROOT, "diagnose-experience-output.txt");
fs.writeFileSync(outPath, output.join("\n"), "utf8");
console.log(`Output written to ${outPath} (${output.length} lines)`);
