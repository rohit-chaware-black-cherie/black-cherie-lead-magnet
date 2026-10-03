"use strict";
const { DIM_LABELS, PROFILE_DETAILS, FOUNDER_SIGNAL_TEXT } = require("./scoring");

const BAND_COLORS = { Aligned: "#1E7D5C", Evolving: "#3D68F0", "Perception Gap": "#B4791F", Misaligned: "#C4432B" };

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const dimBarColor = (p) => (p >= 65 ? "#C4432B" : p >= 45 ? "#B4791F" : p >= 25 ? "#3D68F0" : "#1E7D5C");

function interpretation(band) {
  return (
    {
      Aligned: "Your answers suggest the business has changed, but the current brand is broadly keeping pace with it.",
      Evolving: "Your answers suggest meaningful changes have happened in the business, and parts of the current brand may no longer fully represent it.",
      "Perception Gap": "The issue may not be how the brand looks — there may be a gap between what the business has become and what the market currently understands it to be.",
      Misaligned: "Your answers suggest significant differences between the business you're building and the brand currently representing it.",
    }[band] || ""
  );
}

function nextStep(band) {
  return (
    {
      Aligned: "Protect the alignment — keep monitoring customer evolution, offer changes, and competitive pressure.",
      Evolving: "Identify what has changed, and whether the brand has kept pace with it.",
      "Perception Gap": "Investigate positioning and perception before changing anything visual.",
      Misaligned: "Investigate the underlying business, positioning, and perception gaps before deciding what kind of intervention is required.",
    }[band] || ""
  );
}

function headline(band) {
  return (
    {
      Aligned: "Your business and brand appear to be evolving together.",
      Evolving: "Your business is evolving faster than parts of your brand.",
      "Perception Gap": "There appears to be a meaningful gap between the business you've built and how it's represented.",
      Misaligned: "Your business appears to have materially outgrown the brand representing it.",
    }[band] || ""
  );
}

/** @param s a Submission (or plain object) with score, band, primary, secondary, founderSignal, dims, name */
function buildScorecard(s, { scheduleUrl } = {}) {
  console.log("[buildScorecard] : building HTML scorecard email");
  const bandColor = BAND_COLORS[s.band] || "#1E4FE0";
  const dims = s.dims || {};

  const dimRows = Object.keys(DIM_LABELS)
    .map((k) => ({ label: DIM_LABELS[k], val: Math.round(dims[k] || 0) }))
    .sort((a, b) => b.val - a.val)
    .map(
      (d) => `
      <tr>
        <td style="padding:6px 0;font-size:12.5px;color:#0A1F44;font-weight:bold;">${escapeHtml(d.label)}</td>
        <td style="padding:6px 0;text-align:right;font-size:12.5px;color:#57607A;">${d.val}% pressure</td>
      </tr>
      <tr><td colspan="2" style="padding:0 0 12px;">
        <div style="background:#DCE6FD;border-radius:6px;height:8px;overflow:hidden;">
          <div style="background:${dimBarColor(d.val)};height:8px;width:${d.val}%;"></div>
        </div>
      </td></tr>`
    )
    .join("");

  const gapBox = (label, name, bg = "#F7F9FE", border = "#D9E2F7", labelColor = "#0A1F44", text) => `
    <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:14px 16px;margin-bottom:10px;">
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;color:${labelColor};font-weight:bold;margin-bottom:5px;">${escapeHtml(label)}${name ? " — " + escapeHtml(name) : ""}</div>
      <div style="font-size:12.5px;color:#12162B;line-height:1.55;">${escapeHtml(text)}</div>
    </div>`;

  const gapBlocks =
    gapBox("Primary", s.primary, undefined, undefined, undefined, PROFILE_DETAILS[s.primary] || "") +
    (s.secondary ? gapBox("Secondary", s.secondary, undefined, undefined, undefined, PROFILE_DETAILS[s.secondary] || "") : "") +
    (s.founderSignal
      ? gapBox("Also flagged — Founder Dependency Signal", "", "#FCF4E8", "#E8D5B0", "#B4791F", FOUNDER_SIGNAL_TEXT)
      : "");

  const scheduleBlock =
    s.band !== "Aligned" && scheduleUrl
      ? `
    <div style="background:#0A1F44;border-radius:12px;padding:22px;text-align:center;margin-top:20px;">
      <div style="color:#fff;font-size:16px;font-weight:bold;margin-bottom:8px;">Want a second pair of eyes on this?</div>
      <div style="color:#C6D3F5;font-size:12px;margin-bottom:16px;line-height:1.6;">Your result suggests there's enough signal here to talk it through. This is a strategic conversation, not a sales pitch.</div>
      <a href="${escapeHtml(scheduleUrl)}" style="display:inline-block;background:#fff;color:#0A1F44;text-decoration:none;font-size:13px;font-weight:bold;padding:12px 24px;border-radius:30px;">Schedule a conversation →</a>
    </div>`
      : "";

  const markerLeft = Math.min(100, Math.max(0, Number(s.score) || 0));

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;">
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#12162B;">
    <div style="background:#0A1F44;padding:28px 30px;border-radius:12px 12px 0 0;">
      <div style="color:#93AEFF;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;margin-bottom:10px;">Black*Cherie — Alignment Report</div>
      <div style="color:#fff;font-size:22px;font-weight:bold;line-height:1.3;">Hi ${escapeHtml(s.name || "there")}, here's your result.</div>
    </div>
    <div style="background:#EEF2FE;padding:30px;">
      <div style="text-align:center;margin-bottom:22px;">
        <div style="font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#1E4FE0;margin-bottom:10px;">Your Business–Brand Alignment Score</div>
        <div style="font-size:50px;font-weight:900;color:#0A1F44;">${s.score}</div>
        <div style="font-size:12px;color:#57607A;margin-bottom:10px;">out of 100</div>
        <div style="display:inline-block;background:${bandColor};color:#fff;font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;padding:6px 16px;border-radius:20px;">${escapeHtml(s.band)}</div>
        <div style="margin:16px auto 0;max-width:320px;">
          <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;">
            <div style="flex:1;background:#C4432B;"></div>
            <div style="flex:1;background:#B4791F;"></div>
            <div style="flex:1;background:#3D68F0;"></div>
            <div style="flex:1;background:#1E7D5C;"></div>
          </div>
          <div style="position:relative;height:14px;">
            <div style="position:absolute;left:${markerLeft}%;transform:translateX(-50%);color:#0A1F44;font-size:10px;line-height:14px;">▲</div>
          </div>
        </div>
      </div>
      <p style="font-size:14px;line-height:1.55;color:#0A1F44;font-weight:bold;margin:0 0 8px;">${escapeHtml(headline(s.band))}</p>
      <p style="font-size:13.5px;line-height:1.6;margin:0 0 16px;">${escapeHtml(interpretation(s.band))}</p>
      <p style="font-size:12px;line-height:1.6;color:#57607A;margin:0 0 16px;">The Business–Brand Alignment Guide PDF is attached to this email.</p>

      <div style="margin-bottom:18px;">
        <span style="display:inline-block;background:#0A1F44;color:#fff;font-size:10px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;padding:6px 12px;border-radius:16px;margin:0 6px 6px 0;">Primary — ${escapeHtml(s.primary)}</span>
        ${s.secondary ? `<span style="display:inline-block;background:#EEF2FE;color:#1E4FE0;font-size:10px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;padding:6px 12px;border-radius:16px;margin:0 6px 6px 0;">Secondary — ${escapeHtml(s.secondary)}</span>` : ""}
        ${s.founderSignal ? `<span style="display:inline-block;background:#FCF4E8;color:#B4791F;font-size:10px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;padding:6px 12px;border-radius:16px;margin:0 6px 6px 0;">Founder Dependency Signal</span>` : ""}
      </div>

      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#1E4FE0;font-weight:bold;margin:20px 0 8px;">Where the pressure is coming from</div>
      <table style="width:100%;border-collapse:collapse;">${dimRows}</table>

      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#1E4FE0;font-weight:bold;margin:16px 0 8px;">What each gap means</div>
      ${gapBlocks}

      <div style="background:#fff;border-radius:10px;padding:16px 18px;margin:16px 0 0;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#1E4FE0;font-weight:bold;margin-bottom:6px;">What to investigate next</div>
        <div style="font-size:13px;color:#0A1F44;">${escapeHtml(nextStep(s.band))}</div>
      </div>

      <p style="font-size:12px;color:#57607A;line-height:1.6;margin-top:16px;">This score doesn't mean you need a rebrand — it means there's enough signal to investigate further.</p>
      ${scheduleBlock}
    </div>
    <p style="font-size:11px;color:#9AA6C4;text-align:center;margin-top:16px;">Black*Cherie · This is a proprietary strategic diagnostic, not a scientifically validated measurement.</p>
  </div></body></html>`;

  const text = [
    `Hi ${s.name || "there"}, here's your Business–Brand Alignment Score.`,
    ``,
    `The Business–Brand Alignment Guide PDF is attached to this email.`,
    ``,
    `Score: ${s.score}/100 — ${s.band}`,
    headline(s.band),
    interpretation(s.band),
    ``,
    `Where the pressure is coming from:`,
    ...Object.keys(DIM_LABELS)
      .map((k) => ({ l: DIM_LABELS[k], v: Math.round(dims[k] || 0) }))
      .sort((a, b) => b.v - a.v)
      .map((d) => ` - ${d.l}: ${d.v}% pressure`),
    ``,
    `Primary gap: ${s.primary}`,
    s.secondary ? `Secondary gap: ${s.secondary}` : "",
    ``,
    `What to investigate next: ${nextStep(s.band)}`,
    s.band !== "Aligned" && scheduleUrl ? `\nSchedule a conversation: ${scheduleUrl}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  console.log("[buildScorecard] : execution finished");
  return { subject: `Your Business–Brand Alignment Score: ${s.score}/100`, html, text };
}

module.exports = { buildScorecard, escapeHtml };
