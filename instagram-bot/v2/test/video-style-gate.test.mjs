// node --test v2/test/*.test.mjs (R65, D195): a posting workflow without the v6 shot-list gate before the post line FAILS.
import test from "node:test";
import assert from "node:assert/strict";
import { checkWorkflow } from "../video-style-gate.mjs";
test("no post = pass", () => assert.equal(checkWorkflow("run: node v2/v6-make.mjs").ok, true));
test("post without gate FAILS", () => assert.match(checkWorkflow("run: node scripts/run.mjs --mode=data").why, /never runs/));
test("gate after post FAILS", () => assert.match(checkWorkflow("run: node v2/upload.mjs\nrun: node v2/shotlist-gate.mjs m").why, /AFTER/));
test("gate before post passes", () => assert.equal(checkWorkflow("run: node v2/shotlist-gate.mjs m\nrun: node v2/upload.mjs").ok, true));
test("gate only in a comment FAILS", () => assert.equal(checkWorkflow("# node v2/shotlist-gate.mjs\nrun: node v2/upload.mjs").ok, false));
