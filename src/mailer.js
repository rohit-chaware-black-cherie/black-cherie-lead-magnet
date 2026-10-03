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
    const filePath = path.resolve(config.guidePdfPath);
    if (fs.existsSync(filePath)) {
      attachments.push({
        name: path.basename(filePath),
        content: fs.readFileSync(filePath).toString("base64"),
      });
    }
  }

  if (config.mail.dryRun) {
    console.log(`[mail:dry-run] would send "${subject}" to ${submission.email}`);
    return "dry-run";
  }
  if (!config.mail.apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }
  if (!config.mail.fromAddress) {
    throw new Error("SENDER_EMAIL is not configured");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": config.mail.apiKey,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      sender: { name: config.mail.fromName, email: config.mail.fromAddress },
      to: [{ email: submission.email }],
      ...(config.mail.replyTo ? { replyTo: { email: config.mail.replyTo } } : {}),
      subject,
      htmlContent: html,
      textContent: text,
      ...(attachments.length ? { attachment: attachments } : {}),
    }),
  });

  const responseBody = await response.text();

  console.log(`Brevo Response: ${responseBody}`);
  
  if (!response.ok) {
    throw new Error(`Brevo ${response.status}: ${responseBody || response.statusText}`);
  }

  let result;
  try {
    result = JSON.parse(responseBody);
  } catch (err) {
    throw new Error(`Brevo returned invalid JSON: ${err.message}`);
  }
  if (!result.messageId) {
    throw new Error("Brevo response did not include a message ID");
  }

  console.log("[sendScorecard] : execution finished");
  return result.messageId;
}

module.exports = { sendScorecard };
