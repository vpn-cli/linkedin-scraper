import fs from "fs";
import { parseRscResponse } from "../lib/linkedin/rsc";

const file = process.argv[2];
const searchStr = process.argv[3];

if (!file) {
  console.error("Usage: npx tsx scripts/generic-tracer.ts <file> [search-string]");
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
const parsed = parseRscResponse(raw);

function isRscTuple(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value[0] === "$" &&
    typeof value[1] === "string"
  );
}

function dumpNode(node: unknown, path: string[], indent = 0): void {
  const prefix = " ".repeat(indent);

  if (Array.isArray(node)) {
    // Only print the <li> boundaries if we are NOT filtering, or if debugging.
    // For focused string search, we just look for strings.

    node.forEach((value, index) => {
      const childPath = [...path, `[${index}]`];
      if (typeof value === "string") {
        if (!searchStr || value.includes(searchStr)) {
          console.log(`${prefix}${childPath.join("")} => ${JSON.stringify(value)}`);
        }
      } else if (typeof value === "number" || typeof value === "boolean") {
        if (!searchStr || String(value).includes(searchStr)) {
          console.log(`${prefix}${childPath.join("")} => ${JSON.stringify(value)}`);
        }
      } else {
        dumpNode(value, childPath, indent + 2);
      }
    });
    return;
  }

  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const childPath = [...path, `["${key}"]`];
      if (typeof value === "string") {
        if (!searchStr || value.includes(searchStr)) {
          console.log(`${prefix}${childPath.join("")} => ${JSON.stringify(value)}`);
        }
      } else if (typeof value === "number" || typeof value === "boolean") {
        if (!searchStr || String(value).includes(searchStr)) {
          console.log(`${prefix}${childPath.join("")} => ${JSON.stringify(value)}`);
        }
      } else {
        dumpNode(value, childPath, indent + 2);
      }
    }
  }
}

console.log(`Searching for parsing tuples in ${file} matching "${searchStr || '*'}"...`);
dumpNode(parsed, ["root"]);
console.log("\nDone.");
