"use strict";
const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
    {
        submissionId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        company: { type: String, required: true },
        website: { type: String, default: "" },
        score: { type: Number, required: true },
        band: { type: String, required: true },
        primary: { type: String, required: true },
        secondary: { type: String, default: "" },
        founderSignal: { type: Boolean, default: false },
        dims: { A: Number, B: Number, C: Number, D: Number, E: Number, F: Number },
        answers: { type: mongoose.Schema.Types.Mixed, required: true },
        emailSent: { type: Boolean, default: false },
        emailError: String,
    },
    { timestamps: true },
);

module.exports = { Submission: mongoose.model("Submission", submissionSchema) };
