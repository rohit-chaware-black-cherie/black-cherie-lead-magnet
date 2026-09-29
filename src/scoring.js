"use strict";
/* Scoring engine — extracted verbatim from the assessment page so server-side results match the on-screen result. */
function scaleScore(val, reverse){ const base = val - 1; return reverse ? (4 - base) : base; }
function reverseMapScore(val, options){ const idx = options.indexOf(val); return 4 - idx; }

const PROFILE_NAMES = {
  A:"Business Evolution Gap", B:"Brand Representation Gap", C:"Positioning Gap",
  D:"Internal Alignment Gap", E:"Perception Gap", F:"Future Alignment Gap"
};

const PROFILE_DETAILS = {
  "Business Evolution Gap": "The business has changed substantially — new customers, offers, or ambitions — but the brand still communicates an earlier version of it. Worth investigating which specific changes have outpaced the brand.",
  "Brand Representation Gap": "The brand doesn't yet reflect the level of business you've built. This is rarely a visual problem alone — usually the message inside the brand hasn't caught up to what the business can now do.",
  "Positioning Gap": "The core issue may be what the business owns in the market, not how the brand looks. If the team can't consistently explain what makes you different, a visual refresh won't fix that on its own.",
  "Internal Alignment Gap": "There isn't a single, consistently understood version of what the business stands for inside the company itself — and that inconsistency shows up externally before anyone touches the brand.",
  "Perception Gap": "The business may be stronger than the market currently perceives it to be. Usually a communication and proof problem rather than a visual one — worth investigating before any redesign.",
  "Future Alignment Gap": "The brand may work today, but it isn't clearly built to carry the business toward where it's headed. Not broken yet — but a constraint that's building."
};

const FOUNDER_SIGNAL_TEXT = "Too much of the business's meaning may still live inside you personally rather than inside the organisation and brand. This is a signal worth watching, not a definitive diagnosis.";

function computeResult(a){
  // Dimension A — Business Evolution (20%): Q5(count) + Q6 + Q7 + Q8 + Q9 + Q10
  const changed = (a.changed || []).filter(v=>v!=="Very little has changed");
  const n = changed.length;
  let changeScore;
  if(n===0) changeScore=0; else if(n<=3) changeScore=1; else if(n<=6) changeScore=2; else if(n<=9) changeScore=3; else changeScore=4;

  const competitionMap = {"Not meaningfully":0,"Slightly":1,"Moderately":2,"Significantly":3,"Dramatically":4,"I'm not sure":1};
  const A = avg([
    changeScore,
    a.howDifferent!==undefined ? scaleScore(a.howDifferent,false) : 0,
    a.customerChanged!==undefined ? scaleScore(a.customerChanged,false) : 0,
    a.offerChanged!==undefined ? scaleScore(a.offerChanged,false) : 0,
    a.ambitionChanged!==undefined ? scaleScore(a.ambitionChanged,false) : 0,
    a.competitionChanged ? (competitionMap[a.competitionChanged] ?? 0) : 0
  ]);

  // Dimension B — Brand Representation (25%): Q11-Q15
  const brandStatementMap = {"It represents us extremely well.":0,"It represents us reasonably well but has some gaps.":1,"It represents where we used to be more than where we are.":3,"It looks fine but doesn't communicate the business properly.":3,"It actively makes the business appear less capable/differentiated than it is.":4,"I'm not sure.":2};
  const B = avg([
    a.accuracy!==undefined ? scaleScore(a.accuracy,true) : 0,
    a.confidence!==undefined ? scaleScore(a.confidence,true) : 0,
    a.clarityChoice!==undefined ? scaleScore(a.clarityChoice,true) : 0,
    a.futureRep ? reverseMapScore(a.futureRep, ["Definitely not","Probably not","Unsure","Mostly","Definitely"]) : 0,
    a.brandStatement!==undefined ? (brandStatementMap[a.brandStatement] ?? 0) : 0
  ]);

  // Dimension C — Strategic Clarity / Positioning (15%): Q16-Q19
  const diffMap = {"Customers immediately understand why we're different.":0,"Customers understand us after some explanation.":1,"We are different, but it's difficult to communicate.":2,"We have meaningful capabilities but look similar to competitors.":3,"We're still figuring out what we should own in the market.":4,"I'm not sure.":2};
  const C = avg([
    a.teamAlignment!==undefined ? scaleScore(a.teamAlignment,true) : 0,
    a.easyExplain!==undefined ? scaleScore(a.easyExplain,true) : 0,
    a.positionConfidence!==undefined ? scaleScore(a.positionConfidence,true) : 0,
    a.differentiation!==undefined ? (diffMap[a.differentiation] ?? 0) : 0
  ]);

  // Dimension D — Internal Alignment (15%): Q20-Q23
  const explainMap = {"Almost every time":4,"Often":3,"Sometimes":2,"Rarely":1,"Almost never":0};
  const explainScore = a.explainFreq ? (explainMap[a.explainFreq] ?? 0) : 0;
  const orgScore = a.orgConfidence!==undefined ? scaleScore(a.orgConfidence,true) : 0;
  const D = avg([
    a.consistency!==undefined ? scaleScore(a.consistency,true) : 0,
    explainScore,
    a.touchpointConsistency!==undefined ? scaleScore(a.touchpointConsistency,true) : 0,
    orgScore
  ]);
  const founderSignal = (explainScore>=3) && (orgScore>=3);

  // Dimension E — Market Perception (15%): Q24-Q27
  const percMap = {"We are perceived exactly as we want.":0,"Mostly right, with some gaps.":1,"Customers understand what we do but not our value.":2,"Customers see us as more generic than we are.":3,"Customers perceive us as smaller/less capable than we are.":3,"Customers perceive us differently from how we want to be positioned.":4,"We don't really know.":2};
  const misunderstandMap = {"Almost never":0,"Rarely":1,"Sometimes":2,"Often":3,"Very often":4};
  const E = avg([
    a.perceptionMatch!==undefined ? scaleScore(a.perceptionMatch,true) : 0,
    a.perceptionConfidence!==undefined ? scaleScore(a.perceptionConfidence,true) : 0,
    a.perceptionStatement ? (percMap[a.perceptionStatement] ?? 0) : 0,
    a.misunderstandFreq ? (misunderstandMap[a.misunderstandFreq] ?? 0) : 0
  ]);

  // Dimension F — Future Alignment (10%): Q28-Q29 only (Q30 is classification, not scored)
  const F = avg([
    a.futureChange!==undefined ? scaleScore(a.futureChange,false) : 0,
    a.futureCapable ? reverseMapScore(a.futureCapable, ["Definitely not","Probably not","Unsure","Probably","Definitely"]) : 0
  ]);

  const dims = { A: A/4*100, B: B/4*100, C: C/4*100, D: D/4*100, E: E/4*100, F: F/4*100 };
  const pressure = dims.A*0.20 + dims.B*0.25 + dims.C*0.15 + dims.D*0.15 + dims.E*0.15 + dims.F*0.10;
  const score = Math.round(Math.max(0, Math.min(100, 100 - pressure)));

  const ranked = Object.entries(dims).sort((x,y)=>y[1]-x[1]);
  const primary = PROFILE_NAMES[ranked[0][0]];
  const secondary = ranked[1][1] > 25 ? PROFILE_NAMES[ranked[1][0]] : null;

  let band, headline, interpretation, nextStep;
  if(score>=80){
    band = {label:"Aligned", color:"#1E7D5C"};
    headline = "Your business and brand appear to be evolving together.";
    interpretation = "The business may have changed, but the current brand appears capable of representing it. The key question now isn't whether you need a rebrand — it's what could create misalignment next.";
    nextStep = "Protect the alignment: keep monitoring customer evolution, offer changes, and competitive pressure.";
  } else if(score>=60){
    band = {label:"Evolving", color:"#3D68F0"};
    headline = "Your business is evolving faster than parts of your brand.";
    interpretation = "There are signs of evolutionary pressure. The brand may not be fundamentally broken, but some aspects may no longer represent the business as accurately as they once did.";
    nextStep = "Identify which parts of the business have changed, and whether that requires a corresponding shift in positioning, perception, or brand expression.";
  } else if(score>=40){
    band = {label:"Perception Gap", color:"#B4791F"};
    headline = "There appears to be a meaningful gap between the business you've built and how it's represented.";
    interpretation = "The issue may not primarily be visual. The stronger signal is that the business's capabilities, positioning, or ambitions aren't being translated into market perception.";
    nextStep = "Investigate positioning and perception before deciding what should change visually.";
  } else {
    band = {label:"Misaligned", color:"#C4432B"};
    headline = "Your business appears to have materially outgrown the brand representing it.";
    interpretation = "There's substantial evidence of business evolution combined with brand, market, or internal misalignment. This doesn't automatically mean you need a rebrand — the real question is what actually needs to change.";
    nextStep = "Investigate the underlying business, positioning, and perception gaps before deciding what kind of intervention is required.";
  }

  return { score, band, headline, interpretation, nextStep, primary, secondary, founderSignal, dims };
}

function avg(arr){ return arr.reduce((x,y)=>x+y,0)/arr.length; }

function dimColor(pct){
  if(pct>=65) return "#C4432B";
  if(pct>=45) return "#B4791F";
  if(pct>=25) return "#3D68F0";
  return "#1E7D5C";
}

const DIM_LABELS = { A:"Business Evolution", B:"Brand Representation", C:"Positioning & Clarity", D:"Internal Alignment", E:"Market Perception", F:"Future Alignment" };

module.exports = { computeResult, DIM_LABELS, PROFILE_NAMES, PROFILE_DETAILS, FOUNDER_SIGNAL_TEXT };
