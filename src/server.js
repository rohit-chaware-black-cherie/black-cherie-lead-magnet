"use strict";
const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const config = require("./config");
const { validateSubmission } = require("./validate");
const { computeResult } = require("./scoring");
const { Submission } = require("./models");
const mailer = require("./mailer");

function createApp() {
    console.log("[createApp] : building express app");
    const app = express();
    app.disable("x-powered-by");
    app.use(express.json({ limit: "100kb" }));

    const formHtml = fs
        .readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8")
        .replace("__SCHEDULE_URL__", config.scheduleUrl.replace(/"/g, ""));

    app.get("/", (_req, res) => {
        res.type("html").set("Cache-Control", "no-cache").send(formHtml);
    });

    app.get("/health", (_req, res) => res.json({ status: "ok" }));

    app.post("/api/submissions", async (req, res) => {
        console.log("[POST /api/submissions] : handling form submission");
        try {
            const v = validateSubmission(req.body);
            if (!v.ok) return res.status(400).json({ status: "error", errors: v.errors });

            const { submissionId, answers } = v.value;
            const r = computeResult(answers);

            let doc;
            try {
                doc = await Submission.create({
                    submissionId,
                    name: answers.name,
                    email: answers.email,
                    company: answers.company,
                    website: answers.website,
                    score: r.score,
                    band: r.band.label,
                    primary: r.primary,
                    secondary: r.secondary || "",
                    founderSignal: r.founderSignal,
                    dims: r.dims,
                    answers,
                });
            } catch (err) {
                // Same submissionId again (client retry) — treat as success, don't re-email
                if (err && err.code === 11000) {
                    console.log("[POST /api/submissions] : execution finished");
                    return res.status(200).json({ status: "ok" });
                }
                throw err;
            }

            res.status(201).json({ status: "ok", id: doc._id });

            // Email in the background after the response is sent
            mailer
                .sendScorecard(doc)
                .then(async () => {
                    await Submission.updateOne({ _id: doc._id }, { $set: { emailSent: true, emailError: null } });
                })
                .catch(async (err) => {
                    console.error("[mail]", err.message);
                    await Submission.updateOne({ _id: doc._id }, { $set: { emailError: String(err.message).slice(0, 500) } });
                });

            console.log("[POST /api/submissions] : execution finished");
        } catch (err) {
            console.error("[error]", err);
            res.status(500).json({ status: "error", message: "Something went wrong" });
        }
    });

    console.log("[createApp] : execution finished");
    return app;
}

async function main() {
  console.log("[main] : starting server");
  await mongoose.connect(config.mongoUri);
  console.log("[db] connected");
  const app = createApp();
  app.listen(config.port, () => console.log(`[http] listening on http://localhost:${config.port}`));
  console.log("[main] : execution finished");
}

if (require.main === module) {
    main().catch((err) => {
        console.error("Fatal startup error:", err);
        process.exit(1);
    });
}

module.exports = { createApp };
