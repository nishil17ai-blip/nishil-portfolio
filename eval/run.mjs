#!/usr/bin/env node
/**
 * Regression test for the assistant.
 *
 *   node eval/run.mjs                          # against http://localhost:3000
 *   node eval/run.mjs https://your-site.app     # against a deployment
 *
 * Exits non-zero on failure, so it can gate a deploy.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const cases = JSON.parse(await readFile(join(here, "questions.json"), "utf8"));

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

let passed = 0;
const failures = [];

for (const [i, testCase] of cases.entries()) {
  const label = `${String(i + 1).padStart(2, "0")}. ${testCase.q}`;
  let result;

  try {
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: testCase.q }),
    });
    result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
  } catch (err) {
    failures.push({ label, problems: [`request failed: ${err.message}`] });
    console.log(`${RED}FAIL${OFF} ${label}`);
    continue;
  }

  const problems = [];
  const answer = (result.answer || "").toLowerCase();
  const { expect } = testCase;

  if (typeof expect.grounded === "boolean" && result.grounded !== expect.grounded) {
    problems.push(`grounded was ${result.grounded}, expected ${expect.grounded}`);
  }
  if (expect.reason && result.refusal_reason !== expect.reason) {
    problems.push(`refusal_reason was ${result.refusal_reason}, expected ${expect.reason}`);
  }
  for (const needle of expect.mustInclude || []) {
    if (!answer.includes(needle.toLowerCase())) problems.push(`missing "${needle}"`);
  }
  for (const needle of expect.mustNotInclude || []) {
    if (answer.includes(needle.toLowerCase())) problems.push(`should not contain "${needle}"`);
  }

  if (problems.length === 0) {
    passed += 1;
    console.log(`${GREEN}PASS${OFF} ${label}`);
  } else {
    failures.push({ label, problems, answer: result.answer });
    console.log(`${RED}FAIL${OFF} ${label}`);
    for (const p of problems) console.log(`     ${DIM}${p}${OFF}`);
  }

  // Groq's free tier is per-minute; pace the run so the suite doesn't
  // fail for reasons that have nothing to do with the prompt.
  await new Promise((r) => setTimeout(r, 900));
}

console.log(`\n${passed}/${cases.length} passed`);

if (failures.length) {
  console.log(`\n${RED}Failures${OFF}`);
  for (const f of failures) {
    console.log(`\n  ${f.label}`);
    if (f.answer) console.log(`  ${DIM}answer:${OFF} ${f.answer}`);
    for (const p of f.problems) console.log(`  ${RED}·${OFF} ${p}`);
  }
  process.exit(1);
}
