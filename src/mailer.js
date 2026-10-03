"use strict";
const fs = require("fs");
const path = require("path");
const config = require("./config");
const { buildScorecard } = require("./emailTemplate");

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
    attachments.push({
      filename: path.basename(p),
      content: fs.readFileSync(p).toString("base64"),
    });
    }
  }

  if (config.mail.dryRun) {
    console.log(`[mail:dry-run] would send "${subject}" to ${submission.email}`);
    return "dry-run";
  }
  if (!config.mail.apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!config.mail.fromAddress) {
    throw new Error("SENDER_EMAIL is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
    Authorization: `Bearer ${config.mail.apiKey}`,
    "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
    from: `${config.mail.fromName} <${config.mail.fromAddress}>`,
    to: [submission.email],
    reply_to: config.mail.replyTo,
    subject,
    html,
    text,
    attachments,
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`Resend API request failed (${response.status}): ${responseBody || response.statusText}`);
  }

  let result;
  try {
    result = JSON.parse(responseBody);
  } catch (err) {
    throw new Error(`Resend API returned invalid JSON: ${err.message}`);
  }
  if (!result.id) {
    throw new Error("Resend API response did not include an email ID");
  }

  console.log("[sendScorecard] : execution finished");
  return result.id;
}

module.exports = { sendScorecard };
