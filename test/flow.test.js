"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { computeResult } = require("../src/scoring");
const { validateSubmission, SCALE_FIELDS } = require("../src/validate");
const { buildScorecard } = require("../src/emailTemplate");

const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

function loadClientScorer() {
  const cut = script.slice(0, script.lastIndexOf("render();"));
  const ctx = {
    crypto: {},
    document: { getElementById() { return {}; } },
    window: { scrollTo() {}, crypto: {} },
    location: { search: "" },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(cut + "\n;this.__c = computeResult;", ctx);
  return ctx.__c;
}

const CHANGED = ["New customers", "New offers", "Bigger ambitions", "Very little has changed"];
function randomAnswers(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const a = {
    name: "Test Founder", company: "Acme", email: "T@Example.com", website: "", role: "Founder",
    changed: [pick(CHANGED), pick(CHANGED)],
    competitionChanged: pick(["Not meaningfully", "Slightly", "Moderately", "Significantly", "Dramatically", "I'm not sure"]),
    futureRep: pick(["Definitely not", "Probably not", "Unsure", "Mostly", "Definitely"]),
    brandStatement: pick(["It represents us extremely well.", "It represents us reasonably well but has some gaps.", "I'm not sure."]),
    differentiation: pick(["Customers immediately understand why we're different.", "I'm not sure."]),
    explainFreq: pick(["Almost every time", "Often", "Sometimes", "Rarely", "Almost never"]),
    perceptionStatement: pick(["We are perceived exactly as we want.", "We don't really know."]),
    misunderstandFreq: pick(["Almost never", "Rarely", "Sometimes", "Often", "Very often"]),
    futureCapable: pick(["Definitely not", "Probably not", "Unsure", "Probably", "Definitely"]),
  };
  SCALE_FIELDS.forEach((f) => (a[f] = 1 + Math.floor(rnd() * 5)));
  return a;
}

test("server scoring matches on-page scoring", () => {
  const client = loadClientScorer();
  for (let i = 1; i <= 300; i++) {
    const a = randomAnswers(i * 7919);
    const c = client(a), s = computeResult(a);
    assert.strictEqual(s.score, c.score);
    assert.strictEqual(s.band.label, c.band.label);
    assert.strictEqual(s.primary, c.primary);
    assert.strictEqual(s.secondary, c.secondary);
    assert.strictEqual(s.founderSignal, c.founderSignal);
  }
});

test("validation accepts a complete payload and normalises email", () => {
  const v = validateSubmission({ submissionId: "abc12345-uuid", answers: randomAnswers(1) });
  assert.ok(v.ok, JSON.stringify(v.errors));
  assert.strictEqual(v.value.answers.email, "t@example.com");
});

test("validation rejects bad email, out-of-range scale and missing id", () => {
  const a = randomAnswers(2);
  a.email = "nope";
  a.accuracy = 9;
  const v = validateSubmission({ submissionId: "x", answers: a });
  assert.ok(!v.ok);
  assert.ok(v.errors.some((e) => /email/.test(e)));
  assert.ok(v.errors.some((e) => /accuracy/.test(e)));
  assert.ok(v.errors.some((e) => /submissionId/.test(e)));
});

test("scorecard email renders full HTML report and escapes", () => {
  const base = {
    name: "<b>Eve</b>", score: 41, band: "Perception Gap",
    primary: "Brand Representation Gap", secondary: "Positioning Gap",
    founderSignal: true, dims: { A: 55, B: 62, C: 48, D: 40, E: 45, F: 50 },
  };
  const m = buildScorecard(base, { scheduleUrl: "https://cal.com/x", brandEvolutionTestUrl: "https://t.co" });
  assert.match(m.subject, /41\/100/);
  assert.ok(!m.html.includes("<b>Eve</b>") && m.html.includes("&lt;b&gt;Eve"));
  assert.ok(m.html.includes("Where the pressure is coming from"));
  assert.ok(m.html.includes("Schedule a conversation"));
  assert.ok(m.html.includes("Founder Dependency Signal"));
  const aligned = buildScorecard({ ...base, band: "Aligned", score: 90 }, { scheduleUrl: "https://cal.com/x" });
  assert.ok(!aligned.html.includes("Schedule a conversation"));
});

test("form confirms by email instead of showing on-page score", () => {
  assert.ok(html.includes("Your report is on its way"));
  assert.ok(!html.includes("function renderResult"));
});

test("mailer sends scorecard using the Resend HTTPS API", async () => {
  const config = require("../src/config");
  const { sendScorecard } = require("../src/mailer");
  const oldMail = { ...config.mail };
  const oldFetch = global.fetch;
  let request;

  config.mail.apiKey = "test-api-key";
  config.mail.fromAddress = "reports@example.com";
  config.mail.replyTo = "hello@example.com";
  config.mail.dryRun = false;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: "email-id" }), { status: 200 });
  };

  try {
    const result = await sendScorecard({
      name: "Test Founder", email: "founder@example.net", score: 41, band: "Perception Gap",
      primary: "Brand Representation Gap", secondary: "", founderSignal: false,
      dims: { A: 55, B: 62, C: 48, D: 40, E: 45, F: 50 },
    });
    assert.strictEqual(result, "email-id");
    assert.strictEqual(request.url, "https://api.resend.com/emails");
    assert.strictEqual(request.options.headers.Authorization, "Bearer test-api-key");
    const body = JSON.parse(request.options.body);
    assert.strictEqual(body.from, "Black*Cherie <reports@example.com>");
    assert.deepStrictEqual(body.to, ["founder@example.net"]);
    assert.strictEqual(body.reply_to, "hello@example.com");
    assert.ok(body.html && body.text);
  } finally {
    config.mail = oldMail;
    global.fetch = oldFetch;
  }
});

test("HTTP: serves form and accepts submissions", async () => {
  const { Submission } = require("../src/models");
  const mailer = require("../src/mailer");
  const created = [];
  const sent = [];

  Submission.create = async (doc) => {
    created.push(doc);
    return { _id: "id1", ...doc };
  };
  Submission.updateOne = async () => {};
  mailer.sendScorecard = async (doc) => { sent.push(doc.email); return "mid"; };

  const { createApp } = require("../src/server");
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base + "/");
    assert.strictEqual(page.status, 200);
    const body = await page.text();
    assert.ok(body.includes("/api/submissions") && !body.includes("__SCHEDULE_URL__"));

    const bad = await fetch(base + "/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: {} }),
    });
    assert.strictEqual(bad.status, 400);

    const ok = await fetch(base + "/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ submissionId: "uuid-1234-5678", answers: randomAnswers(5) }),
    });
    assert.strictEqual(ok.status, 201);
    assert.strictEqual(created.length, 1);
    assert.deepStrictEqual(sent, ["t@example.com"]);
  } finally {
    server.close();
  }
});
