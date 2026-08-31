export type RscRecordMap = Record<string, unknown>;

export function parseRscResponse(response: string): unknown {
  const records: RscRecordMap = {};

  /*
   * RSC flight responses are newline-delimited records:
   *
   * 0:[...]
   * 1:I[...]
   * 2:null
   * 6:[...]
   */
  for (const line of response.split(/\r?\n/)) {
    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const id = line.slice(0, separator);
    const payload = line.slice(separator + 1);

    try {
      records[id] = JSON.parse(payload);
    } catch {
      /*
       * Not every RSC line is guaranteed to be a
       * standalone JSON value. Ignore malformed records.
       */
    }
  }

  return resolveRscReferences(records["0"], records);
}

export function resolveRscReferences(
  value: unknown,
  records: RscRecordMap,
  resolving = new Set<string>(),
): unknown {
  if (typeof value === "string") {
    /*
     * RSC references look like "$L6".
     */
    if (value.startsWith("$L") && records[value.slice(2)] !== undefined) {
      const id = value.slice(2);

      if (resolving.has(id)) {
        return value;
      }

      const next = new Set(resolving);
      next.add(id);

      return resolveRscReferences(records[id], records, next);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveRscReferences(item, records, resolving));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = resolveRscReferences(child, records, resolving);
    }

    return result;
  }

  return value;
}
