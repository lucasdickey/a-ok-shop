// A small explicit-state model checker: it visits every state a model can reach
// (breadth first, so the first broken state found has the shortest path) and
// reports, for each rule, either "holds" or the step-by-step path that breaks it.
// No packages: run it with plain `node`.

/** Stable text key for a state, so equal states are visited once. */
function keyOf(value) {
  if (Array.isArray(value)) return `[${value.map(keyOf).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${k}:${keyOf(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * @param {{
 *   init: object[],
 *   next: (state: object) => { step: string, state: object }[],
 *   rules: Record<string, (state: object) => boolean>,
 *   maxStates?: number,
 * }} spec
 */
export function check(spec) {
  const maxStates = spec.maxStates ?? 2_000_000;
  const parent = new Map(); // key -> { from: key | null, step, state }
  const queue = [];
  const broken = {}; // rule -> key of first state that breaks it

  for (const state of spec.init) {
    const key = keyOf(state);
    if (!parent.has(key)) {
      parent.set(key, { from: null, step: "start", state });
      queue.push(key);
    }
  }

  let edges = 0;
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i];
    const { state } = parent.get(key);
    for (const [rule, holds] of Object.entries(spec.rules)) {
      if (!broken[rule] && !holds(state)) broken[rule] = key;
    }
    for (const move of spec.next(state)) {
      edges++;
      const nextKey = keyOf(move.state);
      if (parent.has(nextKey)) continue;
      if (parent.size >= maxStates) {
        throw new Error(`Stopped at ${maxStates} states; shrink the model's bounds.`);
      }
      parent.set(nextKey, { from: key, step: move.step, state: move.state });
      queue.push(nextKey);
    }
  }

  const results = {};
  for (const rule of Object.keys(spec.rules)) {
    if (!broken[rule]) {
      results[rule] = { holds: true };
      continue;
    }
    const path = [];
    for (let k = broken[rule]; k !== null; k = parent.get(k).from) {
      const { step, state } = parent.get(k);
      path.unshift({ step, state });
    }
    results[rule] = { holds: false, path };
  }
  return { states: parent.size, edges, results };
}
