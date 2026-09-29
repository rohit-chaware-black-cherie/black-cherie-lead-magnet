"use strict";
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const config = require("./config");
const { buildScorecard } = require("./emailTemplate");

function createTransport() {
  console.log("[createTransport] : creating nodemailer Gmail transport");
  if (config.mail.dryRun || !config.mail.user || !config.mail.pass) {
    const t = nodemailer.createTransport({ jsonTransport: true });
    t.isDryRun = true;
    console.log("[createTransport] : execution finished");
    return t;
  }
  const t = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
  });
  console.log("[createTransport] : execution finished");
  return t;
}

let transport;

async function sendScorecard(submission) {
  console.log("[sendScorecard] : sending HTML scorecard email");
  const { subject, html, text } = buildScorecard(submission, {
    scheduleUrl: config.scheduleUrl,
    brandEvolutionTestUrl: config.brandEvolutionTestUrl,
  });

  const attachments = [];
  if (config.guidePdfPath) {
    const p = path.resolve(config.guidePdfPath);
    if (fs.existsSync(p)) {
      attachments.push({ filename: path.basename(p), path: p, contentType: "application/pdf" });
    }
  }

  if (!transport) transport = createTransport();
  const info = await transport.sendMail({
    from: { name: config.mail.fromName, address: config.mail.fromAddress },
    to: submission.email,
    replyTo: config.mail.replyTo,
    subject,
    html,
    text,
    attachments,
  });

  if (transport.isDryRun) {
    console.log(`[mail:dry-run] would send "${subject}" to ${submission.email}`);
  }
  console.log("[sendScorecard] : execution finished");
  return info.messageId || "dry-run";
}

module.exports = { sendScorecard };
