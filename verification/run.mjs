// Runs every order-flow model and prints which rules hold and, for each broken rule,
// the shortest sequence of steps that breaks it.
//
//   node verification/run.mjs                      all models, as the code is today
//   node verification/run.mjs fulfillment          one model
//   node verification/run.mjs --variant <name>     a deliberately broken or fixed variant
//   node verification/run.mjs --paths              print the steps for known findings too
//   node verification/run.mjs --stale              list covered files changed since the sync commit
//
// Exit code 0 means: every rule holds except the known findings listed in
// verification/FINDINGS.md, and every known finding still shows up. Anything else exits 1.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { check } from "./check.mjs";
import * as fulfillment from "./models/fulfillment.mjs";
import * as checkout from "./models/checkout.mjs";
import * as cart from "./models/cart.mjs";

const models = { fulfillment, checkout, cart };

// Rules the current code breaks, each written up in FINDINGS.md. Key: "model / config / rule".
const KNOWN = new Map([
  ["fulfillment / checkout, Redis on / The customer gets one Stripe receipt", "E1"],
  ["fulfillment / checkout, no Redis / The customer gets one Stripe receipt", "E1"],
  ["fulfillment / agent (MPP), Redis on / The agent's customer gets one confirmation email", "B5"],
  ["fulfillment / agent (MPP), no Redis / The agent's customer gets one confirmation email", "B5"],
  ["checkout / agent purchase, Redis on / An agent order is charged at most once", "B2"],
  ["checkout / agent purchase, Redis on / The shop never tells an agent 'failed' after charging it", "B2"],
  ["checkout / agent purchase, no Redis / An agent order is charged at most once", "B2"],
  ["checkout / agent purchase charges / Every paid garment is in a size its blank comes in", "B4"],
  ["checkout / monthly deals checkout charges / Every line is charged its catalog price", "B1"],
  ["checkout / monthly deals checkout charges / Orders under $50 pay shipping", "B1"],
  ["checkout / monthly deals checkout charges / Every paid garment is in a size its blank comes in", "B1"],
  ["cart / editing lines / Each item and size is on one cart line", "M1"],
  ["cart / editing lines / No item and size goes over the per-line cap", "M1"],
  ["cart / editing lines / Checkout takes every line, or the drawer shows how to fix it", "M2"],
  ["cart / after paying / After a paid order the cart is empty", "B6"],
]);

const args = process.argv.slice(2);
const variantName = args.includes("--variant") ? args[args.indexOf("--variant") + 1] : null;
const showAllPaths = args.includes("--paths");
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--variant");

// The commit at which the models were last confirmed to match the code lives in the skill.
const SKILL = new URL("../.claude/skills/verify-order-flow/SKILL.md", import.meta.url);
if (args.includes("--stale")) {
  const sync = readFileSync(SKILL, "utf8").match(/Sync commit: `([0-9a-f]{40})`/)?.[1];
  if (!sync) throw new Error("No sync commit found in .claude/skills/verify-order-flow/SKILL.md");
  const files = [...new Set(Object.values(models).flatMap((m) => m.covers.map((c) => c.split(":")[0])))];
  const changed = execFileSync("git", ["diff", "--name-only", sync, "--", ...files], { encoding: "utf8" }).trim();
  if (changed) {
    console.log(`Covered code changed since ${sync.slice(0, 7)}; check the models still describe it:\n${changed}`);
    process.exit(1);
  }
  console.log(`No covered file changed since ${sync.slice(0, 7)}.`);
  process.exit(0);
}

let ok = true;
const seenKnown = new Set();

for (const [name, model] of Object.entries(models)) {
  if (only.length && !only.includes(name)) continue;
  const variant = variantName ? model.variants?.[variantName] : {};
  if (variantName && !variant) continue;

  for (const config of model.configs) {
    const result = check(model.spec({ ...config, variant }));
    console.log(`\n${name} / ${config.label}  (${result.states} states)`);
    for (const [rule, outcome] of Object.entries(result.results)) {
      const id = `${name} / ${config.label} / ${rule}`;
      const known = !variantName && KNOWN.get(id);
      if (outcome.holds) {
        console.log(`  holds   ${rule}`);
        continue;
      }
      if (known) seenKnown.add(id);
      else ok = false;
      console.log(`  BROKEN  ${rule}${known ? `  [known finding ${known}]` : "  [NEW]"}`);
      if (!known || showAllPaths) {
        outcome.path.forEach((p, i) => console.log(`          ${String(i).padStart(2)}. ${p.step}`));
      }
    }
  }
}

if (!variantName && only.length === 0) {
  for (const id of KNOWN.keys()) {
    if (!seenKnown.has(id)) {
      ok = false;
      console.log(`\nKnown finding no longer reproduces: ${id}\nIf the code was fixed, update FINDINGS.md and KNOWN in run.mjs.`);
    }
  }
}
process.exit(ok ? 0 : 1);
