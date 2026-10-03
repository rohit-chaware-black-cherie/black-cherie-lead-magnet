"use strict";
require("dotenv").config();
const path = require("path");

const bool = (v, d = false) =>
  v === undefined ? d : ["1", "true", "yes"].includes(String(v).toLowerCase());

const senderEmail = process.env.SENDER_EMAIL || "";

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/blackcherie",
  mail: {
    fromName: process.env.MAIL_FROM_NAME || "Black*Cherie",
    fromAddress: senderEmail,
    replyTo: process.env.MAIL_REPLY_TO || senderEmail,
    apiKey: process.env.BREVO_API_KEY || "",
    dryRun: bool(process.env.EMAIL_DRY_RUN, false),
  },
  scheduleUrl: process.env.SCHEDULE_URL || "",
  guidePdfPath:
    process.env.GUIDE_PDF_PATH ||
    path.join(__dirname, "..", "assets", "The Business–Brand Alignment Guide BlackCherie.pdf"),
};
