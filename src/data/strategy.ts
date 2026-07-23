/**
 * Executive business case — single source of truth for the /strategy view.
 *
 * Framing rules baked into this copy:
 *  - The client is anonymized ("a Tier-1 auto-insurance program").
 *  - Sensitive moves (role exits, named competitors) are stated in
 *    professional, non-attributable terms.
 *  - No invented numbers. Account targets (20/30/40%, 100/day) come from the
 *    briefing; proof metrics come from a real, prior turnaround and are
 *    labeled as track record, never as results already delivered here.
 */

export const strategyNav = [
  { label: "Summary", href: "#exec-summary" },
  { label: "Diagnosis", href: "#current-state" },
  { label: "SWOT", href: "#swot" },
  { label: "Framework", href: "#framework" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Proof", href: "#proof" },
] as const;

export const strategyHero = {
  eyebrow: "Commercial Transformation · Enterprise BPO",
  headline: "When a support operation is asked to sell, execution — not intent — becomes the constraint.",
  subhead:
    "A Tier-1 auto-insurance program shifted from customer experience to commercial delivery in six months. Conversion sits at 20% against a 30% target. This is the operating system to close that gap — and to earn the mandate to scale.",
  positioning:
    "Presented not as a rescue, but as a facilitator: a repeatable method to identify, prioritize, execute, and measure — so the number moves through the system, not firefighting.",
  metrics: [
    { value: "20%", label: "Current conversion", tone: "down" as const },
    { value: "30%", label: "Client target", tone: "neutral" as const },
    { value: "40%", label: "Internal stretch", tone: "up" as const },
  ],
};

export const execSummary = {
  eyebrow: "Executive Summary",
  heading: "One page for a reader with five minutes.",
  blocks: [
    {
      tag: "Context",
      text: "One year in; the last six re-engineered from CX to commercial. We hold ~100% of the program's market — a rare data advantage.",
    },
    {
      tag: "Problem",
      text: "Conversion sits below the 30% floor. Occupancy is low, daily minimums slip, and the team was hired to support — not to sell. Commercial confidence has dropped.",
    },
    {
      tag: "Impact",
      text: "Below target, volume and renewal are at risk and rival vendors get an opening. Every week without measurable results widens the gap.",
    },
    {
      tag: "Opportunity",
      text: "Hit the scorecard and complex Tier-2 work can migrate to us — more scope, more revenue, higher switching costs.",
    },
  ],
};

export type PainCard = {
  dimension: string;
  painPoint: string;
  businessImpact: string;
  risk: string;
};

export const currentState = {
  eyebrow: "Current State Assessment",
  heading: "Three pressures, read the way an operator reads them.",
  description:
    "Not a complaint list — a diagnosis across the three levers a commercial operation actually turns: the customer relationship, the company's delivery, and the people doing the work.",
  cards: [
    {
      dimension: "Customer",
      painPoint:
        "Low occupancy pushes agents into outbound when inbound is idle; daily interaction minimums (100/day) slip on disposition and follow-through. Conversion holds at 20% vs. a 30% target.",
      businessImpact: "Client doubts our commercial fit at scale.",
      risk: "Lost trust → reduced volume.",
    },
    {
      dimension: "Company",
      painPoint:
        "Team leaders hold limited positioning with the client's volume decision-maker; boundaries on scope and timelines aren't set. Process definition and results tracking are thin, and weekly/monthly business reviews lack structure.",
      businessImpact: "No measurement backbone; wins can't be proven.",
      risk: "Decisions made about us, not with us.",
    },
    {
      dimension: "People",
      painPoint:
        "Agents were hired for experience delivery, not selling. Change-readiness is low, commercial bonus schemes are unclear, and there is no real-time visibility into contactability, conversion, or service level.",
      businessImpact: "Effort isn't aimed at the number; supervision-dependent.",
      risk: "Top talent is the easiest to poach.",
    },
  ] satisfies PainCard[],
};

export type SwotQuadrant = {
  key: "strengths" | "weaknesses" | "opportunities" | "threats";
  title: string;
  insight: string;
  implication: string;
  move: string;
};

export const swot = {
  eyebrow: "SWOT",
  heading: "The board, and the move each square demands.",
  description: "Every quadrant carries an insight, a consequence, and the action it calls for — no square is just for show.",
  quadrants: [
    {
      key: "strengths",
      title: "Strengths",
      insight:
        "A year of account-specific know-how puts us ahead of any incoming vendor, and holding the full market gives us reliable data for Voice of Customer and NPS analysis.",
      implication: "Our head start + data = a real edge, if we prove it.",
      move: "Turn data into a weekly client narrative.",
    },
    {
      key: "weaknesses",
      title: "Weaknesses",
      insight:
        "Staff and agents were originally profiled for CX, not commercial delivery, and may not meet the criteria the client now expects after the six-month shift.",
      implication: "Capability is the gap — buildable or hireable.",
      move: "Rubric: separate develop-in-place from re-profile.",
    },
    {
      key: "opportunities",
      title: "Opportunities",
      insight:
        "Two departments exist — the client's direct team and our outsourced team. Complex Tier-2 work handled in-house today could migrate to us as a client cost-saving, provided we hit targets.",
      implication: "Performance unlocks scope and switching costs.",
      move: "Green scorecard → earn complex pilots.",
    },
    {
      key: "threats",
      title: "Threats",
      insight:
        "Alternative vendors may hold comparable know-how or capacity, and some can outpay us to move experienced talent elsewhere.",
      implication: "Our edge is time-boxed; results + retention defend it.",
      move: "Emotional salary + results incentives to hold talent.",
    },
  ] satisfies SwotQuadrant[],
};

export type FrameworkPhase = {
  step: string;
  name: string;
  question: string;
  detail: string;
};

export const framework = {
  eyebrow: "Transformation Framework",
  heading: "A method, not an opinion.",
  description:
    "A Lean Six Sigma backbone (DMAIC) adapted to a commercial contact-center turnaround. Each stage answers one question and hands the next stage a decision, not a document.",
  phases: [
    {
      step: "01",
      name: "Define",
      question: "What does success actually equal?",
      detail: "Success = 30 booked appointments per 100 interactions. Set the floor, the internal stretch (40%), and the guardrails with the client.",
    },
    {
      step: "02",
      name: "Measure",
      question: "What is really happening?",
      detail: "Track contactability, conversion, occupancy, and service level in real time — visible to the agent, not just the report.",
    },
    {
      step: "03",
      name: "Analyze",
      question: "Where does conversion leak?",
      detail: "Rubric-score the interaction; separate skill gaps from will gaps; find the defect points in the Agent Success Path.",
    },
    {
      step: "04",
      name: "Improve",
      question: "What changes the number?",
      detail: "Agent Success Path, aligned incentives, cross-training, and staff commercial enablement — deployed in a deliberate sequence.",
    },
    {
      step: "05",
      name: "Control",
      question: "How does it stay fixed?",
      detail: "Standard work, tier meetings, daily huddles, control plans, and a weekly client scorecard that makes results measurable.",
    },
  ] satisfies FrameworkPhase[],
};

export type RoadmapPhase = {
  phase: string;
  horizon: string;
  title: string;
  objective: string;
  actions: string[];
  quickWins: string[];
  kpis: string[];
  risks: string[];
  deliverables: string[];
};

export const roadmap = {
  eyebrow: "Execution Roadmap",
  heading: "Three phases. Frontline first, then the system around it.",
  description:
    "Sequenced so early wins fund credibility for the harder structural moves. Nothing here waits on everything else.",
  phases: [
    {
      phase: "Phase 1",
      horizon: "Frontline activation",
      title: "Make the interaction win",
      objective:
        "Give every agent a clear line to conversion and a reason to run it — profile the team, guide the interaction, and align the incentive to the new rubric.",
      actions: [
        "Build a commercial profiling rubric for agents and staff — decide who continues, who develops in place, who is re-profiled.",
        "Ship the Agent Success Path: objective-by-objective guidance for each inbound and outbound interaction, ending in a booking.",
        "Negotiate a temporary daily-quota reduction with the client to open room for cross-training without breaching commitments.",
        "Launch a rubric-aligned incentive — financial and emotional — that recognizes and, where warranted, penalizes.",
      ],
      quickWins: [
        "Real-time leaderboard drives healthy, self-directed competition.",
        "Near-reach 'booster' targets surface best practices from top performers.",
      ],
      kpis: ["Conversion 20% → 30%", "≥100 interactions/agent/day", "Occupancy & SLA visibility"],
      risks: ["Quota renegotiation stalls", "Incentive cost exceeds benchmark"],
      deliverables: ["Commercial rubric v1", "Agent Success Path", "Live performance visual", "Incentive & bonus model"],
    },
    {
      phase: "Phase 2",
      horizon: "System enablement",
      title: "Make the organization sell",
      objective:
        "Equip Quality, Training, and Operations to develop teams commercially, tie staff incentives to collective conversion, and turn client reviews into a control system.",
      actions: [
        "Deliver sales-enablement modules to staff so coaching is built on commercial fundamentals.",
        "Restructure staff incentives around collective conversion — one goal, shared accountability.",
        "Stand up recurring control points to anticipate client-impact breaches and pre-empt them with action plans.",
        "Formalize client hand-off for procedures still living in the client's direct team but not yet transferred to us.",
      ],
      quickWins: [
        "Structured weekly business review replaces ad-hoc updates.",
        "Emotional salary lifts morale and reduces supervision drag.",
      ],
      kpis: ["Training effectiveness", "Staff-to-conversion alignment", "Early-warning lead time"],
      risks: ["Staff bandwidth during transition", "Hand-off gaps create blind spots"],
      deliverables: ["Staff sales curriculum", "Collective incentive design", "Client scorecard & review cadence"],
    },
    {
      phase: "Phase 3",
      horizon: "Scale & sustain",
      title: "Earn the next mandate",
      objective:
        "Review the team for fit, tighten the training rubric, and use a green scorecard to negotiate complex Tier-2 pilots — expanding scope through consulting and Six Sigma rigor.",
      actions: [
        "Run a structured role-fit review: transition out where fit and will are both absent, recruiting willing talent in parallel so coverage never dips.",
        "Tighten the Training rubric to reinforce the gaps surfaced in the Agent Success Path.",
        "Meet the green scorecard, then negotiate small pilots to absorb complex Tier-2 responsibilities currently routed away from us.",
        "Apply Voice of Customer and Six Sigma methods to reduce defects per million and improve decisions in-flight.",
      ],
      quickWins: [
        "First complex pilot lands as proof of expanded capability.",
        "Best-practice library compounds from booster winners.",
      ],
      kpis: ["Green scorecard sustained", "DPMO reduction", "Scope migrated from Tier-2"],
      risks: ["Client pushback on scope transfer", "Talent poaching during the review"],
      deliverables: ["Role-fit review plan", "Tightened training rubric", "Tier-2 pilot proposal"],
    },
  ] satisfies RoadmapPhase[],
};

export type CommercialPillar = {
  name: string;
  description: string;
};

export const commercial = {
  eyebrow: "Commercial Transformation",
  heading: "From answering to converting.",
  description:
    "Seven components that move an operation from customer support to commercial excellence — each one a system, not a slogan.",
  pillars: [
    { name: "Agent Success Path", description: "Objective-driven guidance for every interaction, ending in a booked appointment." },
    { name: "Commercial Rubric", description: "A shared standard that separates skill gaps from will gaps — for agents and staff alike." },
    { name: "Coaching Framework", description: "Real-time feedback and weekly learning, built on commercial fundamentals." },
    { name: "Incentives", description: "Financial and emotional, aligned to the rubric — with boosters and last-minute bonuses to lift intent." },
    { name: "Leader Enablement", description: "Positioning leaders to set boundaries and shape volume decisions with the client." },
    { name: "Performance Visibility", description: "Live visuals of contactability, conversion, and service level — for the agent, not just the report." },
    { name: "Benchmarking", description: "A financial benchmark that costs incentives without exceeding company expectations." },
  ] satisfies CommercialPillar[],
};

export type Metric = {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
  note: string;
  group: "account" | "track-record";
};

export type MetricGroup = {
  key: "account" | "track-record";
  title: string;
  summary: string;
  items: Metric[];
};

export const metrics = {
  eyebrow: "Metrics",
  heading: "What I manage — and what I've already moved.",
  description: "The account's targets, and proof from a prior turnaround. Expand a set for the detail.",
  groups: [
    {
      key: "account",
      title: "The account's numbers",
      summary: "30% floor · 40% internal stretch · 100 interactions/day · 100% market held",
      items: [
        { value: 30, suffix: "%", label: "Conversion floor", note: "30 booked per 100 interactions", group: "account" },
        { value: 40, suffix: "%", label: "Internal stretch", note: "Above target, so the floor is easy", group: "account" },
        { value: 100, suffix: "/day", label: "Interaction min.", note: "Per agent, protected in cross-training", group: "account" },
        { value: 100, suffix: "%", label: "Market held", note: "Full share — a rare data advantage", group: "account" },
      ],
    },
    {
      key: "track-record",
      title: "My track record",
      summary: "Quality <80% → 90% in 4 weeks · 3.6x ROI · −5% attrition QoQ · 450+ FTE led",
      items: [
        { value: 90, suffix: "%", label: "Quality, from <80%", note: "In 4 weeks, under a real penalty clause", group: "track-record" },
        { value: 3.6, suffix: "x", decimals: 1, label: "ROI", note: "Redesigned sales flows & journeys", group: "track-record" },
        { value: 5, suffix: "%", prefix: "−", label: "Attrition, QoQ", note: "Engagement + early risk detection", group: "track-record" },
        { value: 450, suffix: "+", label: "FTE led", note: "Multi-region strategic accounts", group: "track-record" },
      ],
    },
  ] satisfies MetricGroup[],
};

export type VocBlock = {
  key: string;
  title: string;
  summary: string;
  items: string[];
};

export const voc = {
  eyebrow: "Voice of Customer & Continuous Improvement",
  heading: "The engine that keeps the number honest.",
  description: "Full market share means our data is the market's data. Expand a block for how it's read and sustained.",
  blocks: [
    {
      key: "voc",
      title: "Voice of Customer",
      summary: "Read the market continuously — lead indicators in, closed-loop out.",
      items: [
        "Leading — contactability, disposition quality, booking intent",
        "Lagging — conversion, NPS, renewal signals",
        "Closed-loop: interaction → coaching → standard work",
        "Insights routed weekly into the client scorecard",
      ],
    },
    {
      key: "ci",
      title: "Continuous Improvement",
      summary: "Improvement as a system, not a campaign.",
      items: [
        "DMAIC & PDCA on the conversion defect",
        "Kaizen + Leader Standard Work in the daily flow",
        "Visual management: tier meetings, huddles, scorecards",
        "Control plans & action logs make gains stick",
      ],
    },
  ] satisfies VocBlock[],
};

export type ImpactRow = {
  lever: string;
  current: string;
  future: string;
};

export const businessImpact = {
  eyebrow: "Business Impact",
  heading: "Current state → transformation → future state.",
  description: "The same five levers, before and after the operating system is in place.",
  rows: [
    { lever: "People", current: "Hired for CX, low change-readiness", future: "Profiled, coached, and self-driven to the number" },
    { lever: "Process", current: "Thin definition, weak tracking", future: "Standard work with a measurement backbone" },
    { lever: "Customer", current: "Eroded confidence in commercial fit", future: "Structured weekly proof of results" },
    { lever: "Financial", current: "Conversion at 20%, volume at risk", future: "30%+ floor, scope-expansion upside" },
    { lever: "Operational", current: "Supervision-dependent, reactive", future: "Visible, benchmarked, and controlled" },
  ] satisfies ImpactRow[],
};

export const proof = {
  eyebrow: "Proof",
  heading: "I've run this exact play — under a harder penalty.",
  lede:
    "A commercial account I managed sat under a financial penalty clause: quality below 80% cost 5% of monthly revenue. The pressure was real, and the fix wasn't a pep talk.",
  steps: [
    {
      tag: "Diagnose",
      text: "Rubric-scored the interaction to separate skill gaps from will gaps, and instrumented performance so agents could see their own number in real time.",
    },
    {
      tag: "Align",
      text: "Built an incentive that paired financial reward with emotional recognition — leaderboards, boosters, and best-practice sharing from top performers.",
    },
    {
      tag: "Execute",
      text: "Ran daily coaching and real-time feedback against the rubric, with the standard reinforced through the team's own daily management.",
    },
    {
      tag: "Result",
      text: "Quality moved from below 80% to 90% in four weeks. The penalty came off. The same operating system — rubric, visibility, aligned incentives, coaching cadence — is what closes a 20%-to-30% conversion gap.",
    },
  ],
  footnote:
    "Alongside this: 3.6x ROI from redesigned sales flows, up to 5% QoQ attrition reduction, one account scaled from 3 to 60 agents, and 9 of 25 team members promoted into greater responsibility.",
};

export const strategyCta = {
  heading: "The mandate I'm asking for.",
  text: "Not a title to defend — a system to run. Give me the account, the rubric, and ninety days, and the scorecard turns green in a way the client can see every week.",
  primary: { label: "Let's discuss the plan", href: "mailto:cristhian.gonzalez2013@gmail.com" },
  secondary: { label: "Back to profile", href: "#/" },
};
