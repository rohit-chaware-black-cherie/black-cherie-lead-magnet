"use strict";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCALE_FIELDS = [
    "howDifferent",
    "customerChanged",
    "offerChanged",
    "ambitionChanged",
    "accuracy",
    "confidence",
    "clarityChoice",
    "teamAlignment",
    "easyExplain",
    "positionConfidence",
    "consistency",
    "touchpointConsistency",
    "orgConfidence",
    "perceptionMatch",
    "perceptionConfidence",
    "futureChange",
];

const str = (v, max) =>
    String(v ?? "")
        .trim()
        .slice(0, max);

function validateSubmission(body) {
    console.log("[validateSubmission] : validating form submission");
    const errors = [];
    if (!body || typeof body !== "object") return { ok: false, errors: ["Body must be a JSON object"] };

    const submissionId = str(body.submissionId, 80);
    if (!/^[\w-]{8,80}$/.test(submissionId)) errors.push("submissionId is missing or malformed");

    const raw = body.answers;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { ok: false, errors: [...errors, "answers must be an object"] };
    }

    const answers = {};
    for (const [k, v] of Object.entries(raw)) {
        if (!/^[a-zA-Z0-9_]{1,40}$/.test(k)) continue;
        if (typeof v === "string") answers[k] = v.slice(0, 2000);
        else if (typeof v === "number" && Number.isFinite(v)) answers[k] = v;
        else if (typeof v === "boolean") answers[k] = v;
        else if (Array.isArray(v)) answers[k] = v.slice(0, 30).map((x) => str(x, 200));
    }

    if (raw.newsletterOptIn !== undefined && typeof raw.newsletterOptIn !== "boolean") {
        errors.push("newsletterOptIn must be a boolean");
    }
    answers.newsletterOptIn = raw.newsletterOptIn === true;

    for (const f of ["name", "company", "email"]) {
        if (!str(answers[f], 300)) errors.push(`${f} is required`);
    }
    if (answers.email && !EMAIL_RE.test(str(answers.email, 254))) errors.push("email is invalid");

    for (const f of SCALE_FIELDS) {
        const n = answers[f];
        if (!Number.isInteger(n) || n < 1 || n > 5) errors.push(`${f} must be an integer 1–5`);
    }
    if (!Array.isArray(answers.changed) || answers.changed.length === 0) {
        errors.push("changed must be a non-empty list");
    }

    if (errors.length) {
        console.log("[validateSubmission] : execution finished");
        return { ok: false, errors };
    }

    answers.name = str(answers.name, 200);
    answers.company = str(answers.company, 200);
    answers.email = str(answers.email, 254).toLowerCase();
    answers.website = str(answers.website, 300);

    console.log("[validateSubmission] : execution finished");
    return { ok: true, value: { submissionId, answers } };
}

module.exports = { validateSubmission, SCALE_FIELDS };
