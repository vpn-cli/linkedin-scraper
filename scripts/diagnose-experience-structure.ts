/**
 * Diagnostic: Trace entity-collection-item structure in Experience RSC
 * 
 * Does NOT modify parser.ts, client.ts, requests.ts, or rsc.ts.
 * Does NOT use collectStrings().
 * Does NOT flatten strings.
 * Does NOT infer field mappings.
 * 
 * Run: npx tsx scripts/diagnose-experience-structure.ts
 */

import * as fs from "fs";
import * as path from "path";
import { parseRscResponse } from "../lib/linkedin/rsc";

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "debug-com.linkedin.sdui.generated.profile.dsl.impl.profileCardsExperienceOnly.json");

const output: string[] = [];
function log(line: string) { output.push(line); }
function indent(depth: number): string { return "  ".repeat(depth); }

/* -------------------------------------------------------------------------- */
/* Finders                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Find all nodes that contain a componentKey matching a pattern.
 */
function findByComponentKeyPrefix(
  node: unknown,
  prefix: string,
  depth = 0,
  results: { key: string; node: unknown }[] = [],
): { key: string; node: unknown }[] {
  if (depth > 60 || !node) return results;

  if (Array.isArray(node)) {
    for (const item of node) {
      findByComponentKeyPrefix(item, prefix, depth + 1, results);
    }
    return results;
  }

  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.componentKey === "string" && record.componentKey.startsWith(prefix)) {
      results.push({ key: record.componentKey, node });
    }
    for (const value of Object.values(record)) {
      findByComponentKeyPrefix(value, prefix, depth + 1, results);
    }
  }

  return results;
}

/**
 * Find the experienceTopLevelSection node by searching for the string.
 */
function findExpSection(node: unknown, depth = 0): unknown | null {
  if (depth > 50 || !node) return null;
  if (typeof node === "string") {
    return node.includes("experienceTopLevelSection") ? node : null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item === "string" && item.includes("experienceTopLevelSection")) return node;
      const f = findExpSection(item, depth + 1);
      if (f) return f;
    }
    return null;
  }
  if (typeof node === "object") {
    const r = node as Record<string, unknown>;
    for (const v of Object.values(r)) {
      if (typeof v === "string" && v.includes("experienceTopLevelSection")) return node;
      const f = findExpSection(v, depth + 1);
      if (f) return f;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Tree printer                                                               */
/* -------------------------------------------------------------------------- */

function isNoise(value: string): boolean {
  if (!value || value.length === 0) return true;
  if (value === "$") return true;
  // CSS class tokens
  if (/^[_a-f0-9]{6,}(\s+[_a-f0-9]+)*$/.test(value)) return true;
  if (/^[a-f0-9]{8}-[a-f0-9]{4}/.test(value)) return true;
  // HTML tag names used in RSC tuples
  if (["div", "span", "li", "ul", "ol", "br", "img", "p", "h1", "h2", "h3", "section", "button", "a"].includes(value)) return true;
  return false;
}

/**
 * Walk a subtree and print its structure preserving nesting.
 * Shows: componentKey, observabilityIdentifier, textProps.children, 
 * human-readable strings, URLs, dates.
 */
function printTree(node: unknown, depth: number, maxDepth: number): void {
  if (depth > maxDepth || !node) return;

  if (typeof node === "string") {
    if (!isNoise(node)) {
      log(`${indent(depth)}STRING: "${node.length > 200 ? node.slice(0, 200) + "..." : node}"`);
    }
    return;
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return;
  }

  if (Array.isArray(node)) {
    // Check if this is an RSC element tuple: ["$", tagName, key, props]
    if (node[0] === "$" && typeof node[1] === "string" && node.length >= 3) {
      const tag = node[1];
      const key = node[2];

      // Only print non-noise tags or tags with interesting props
      if (tag === "br") {
        log(`${indent(depth)}<br/>`);
        return;
      }

      log(`${indent(depth)}<${tag}${key !== null ? ` key="${key}"` : ""}>`);

      // Props are in node[3]
      if (node[3] && typeof node[3] === "object") {
        const props = node[3] as Record<string, unknown>;

        if (typeof props.componentKey === "string") {
          log(`${indent(depth + 1)}componentKey: "${props.componentKey}"`);
        }
        if (typeof props.observabilityIdentifier === "string") {
          log(`${indent(depth + 1)}observabilityIdentifier: "${props.observabilityIdentifier}"`);
        }
        if (typeof props["data-testid"] === "string") {
          log(`${indent(depth + 1)}data-testid: "${props["data-testid"]}"`);
        }

        // If it has textProps, print them specially
        if (props.textProps && typeof props.textProps === "object") {
          log(`${indent(depth + 1)}textProps:`);
          printTextProps(props.textProps as Record<string, unknown>, depth + 2);
        }

        // Recurse into children
        if (props.children !== undefined) {
          printTree(props.children, depth + 1, maxDepth);
        }

        // Check for other non-standard props with string values
        for (const [k, v] of Object.entries(props)) {
          if (["className", "children", "componentKey", "observabilityIdentifier", "data-testid", "textProps", "style"].includes(k)) continue;
          if (typeof v === "string" && !isNoise(v)) {
            log(`${indent(depth + 1)}${k}: "${v.length > 150 ? v.slice(0, 150) + "..." : v}"`);
          }
        }
      }

      // Also check remaining array items beyond [0..3]
      for (let i = 4; i < node.length; i++) {
        printTree(node[i], depth + 1, maxDepth);
      }
      return;
    }

    // Not an RSC tuple, just a regular array
    for (const item of node) {
      printTree(item, depth, maxDepth);
    }
    return;
  }

  if (typeof node === "object") {
    const record = node as Record<string, unknown>;

    if (typeof record.componentKey === "string") {
      log(`${indent(depth)}componentKey: "${record.componentKey}"`);
    }
    if (typeof record.observabilityIdentifier === "string") {
      log(`${indent(depth)}observabilityIdentifier: "${record.observabilityIdentifier}"`);
    }
    if (record.textProps && typeof record.textProps === "object") {
      log(`${indent(depth)}textProps:`);
      printTextProps(record.textProps as Record<string, unknown>, depth + 1);
    }

    for (const [key, value] of Object.entries(record)) {
      if (["componentKey", "observabilityIdentifier", "textProps", "className", "style"].includes(key)) continue;
      if (typeof value === "string" && !isNoise(value)) {
        log(`${indent(depth)}${key}: "${value.length > 150 ? value.slice(0, 150) + "..." : value}"`);
      } else if (typeof value === "object" || Array.isArray(value)) {
        printTree(value, depth, maxDepth);
      }
    }
  }
}

function printTextProps(tp: Record<string, unknown>, depth: number): void {
  // Print font metadata compactly
  const fontInfo: string[] = [];
  for (const k of ["fontFamily", "fontSize", "fontWeight", "fontStyle"]) {
    if (typeof tp[k] === "string") fontInfo.push(`${k}=${tp[k]}`);
  }
  if (fontInfo.length > 0) {
    log(`${indent(depth)}[${fontInfo.join(", ")}]`);
  }

  // Print children (the actual text content)
  if (tp.children !== undefined) {
    log(`${indent(depth)}children:`);
    printTextChildren(tp.children, depth + 1);
  }
}

function printTextChildren(children: unknown, depth: number): void {
  if (typeof children === "string") {
    if (!isNoise(children)) {
      log(`${indent(depth)}"${children}"`);
    }
    return;
  }

  if (Array.isArray(children)) {
    for (const child of children) {
      if (typeof child === "string") {
        if (!isNoise(child)) {
          log(`${indent(depth)}"${child}"`);
        }
      } else if (Array.isArray(child)) {
        if (child[0] === "$" && child[1] === "br") {
          log(`${indent(depth)}<br/>`);
        } else {
          printTextChildren(child, depth);
        }
      } else if (child && typeof child === "object") {
        const r = child as Record<string, unknown>;
        if (r.children !== undefined) {
          printTextChildren(r.children, depth);
        }
      }
    }
    return;
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

const raw = fs.readFileSync(FILE, "utf8");
const resolved = parseRscResponse(raw);

log("=== DIAGNOSTIC: Entity Collection Items in Experience ===");
log(`Raw size: ${raw.length} bytes`);

// Step 1: Verify experienceTopLevelSection exists
const expSection = findExpSection(resolved);
log(`experienceTopLevelSection: ${expSection ? "FOUND" : "NOT FOUND"}`);

// Step 2: Find all entity-collection-item-* nodes
const entityItems = findByComponentKeyPrefix(resolved, "entity-collection-item-");
log(`Total entity-collection-item nodes: ${entityItems.length}`);

// Step 3: Print first 3 with full resolved subtree
const limit = Math.min(3, entityItems.length);
for (let i = 0; i < limit; i++) {
  log(`\n${"=".repeat(70)}`);
  log(`ENTITY COLLECTION ITEM #${i}`);
  log(`componentKey: "${entityItems[i].key}"`);
  log(`${"=".repeat(70)}`);

  printTree(entityItems[i].node, 0, 15);
}

// Write output
const outPath = path.join(ROOT, "diagnose-experience-structure.txt");
fs.writeFileSync(outPath, output.join("\n"), "utf8");
console.log(`Written to ${outPath} (${output.length} lines)`);
