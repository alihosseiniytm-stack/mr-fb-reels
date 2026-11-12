// v6c: the cron must only pick READY v6 topics (never an old-style type), weekday plan kept (D199), extra slot differs from main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pickTopic, READY } from "../v6-pick.mjs";
const schedule = JSON.parse(readFileSync(new URL("../schedule.json", import.meta.url), "utf8")), plan = JSON.parse(readFileSync(new URL("../topic-plan.json", import.meta.url), "utf8"));
test("every day of 10 weeks picks a ready v6 topic; extra != main", () => {
  for (let i = 0; i < 70; i++) {
    const date = new Date(Date.UTC(2026, 10, 13 + i, 12)).toISOString().slice(0, 10);
    const m = pickTopic({ date, schedule, plan }), x = pickTopic({ date, slot: "extra", schedule, plan });
    assert.ok(READY.has(m.topic), date + " " + m.topic); assert.ok(READY.has(x.topic)); assert.notEqual(m.topic, x.topic, date);
  }
});
test("saturday = the week's candle topic (weekday plan kept)", () => {
  assert.equal(pickTopic({ date: "2026-11-14", schedule, plan }).topic, "shooting_star");
});
test("a topic publicly uploaded in the last 8 weeks is skipped; test uploads do not count", () => {
  const log = [{ topic: "shooting_star", date: "2026-11-10T10:00:00Z", privacy: "public" }];
  assert.notEqual(pickTopic({ date: "2026-11-14", schedule, plan, log }).topic, "shooting_star");
  assert.equal(pickTopic({ date: "2026-11-14", schedule, plan, log: [{ ...log[0], privacy: "private", test: true }] }).topic, "shooting_star");
});
test("same-day upload does not change the day's topic (long + Short share it)", () => {
  const a = pickTopic({ date: "2026-11-13", schedule, plan }).topic;
  assert.equal(pickTopic({ date: "2026-11-13", schedule, plan, log: [{ topic: a, date: "2026-11-13T09:00:00Z", privacy: "public" }] }).topic, a);
});
