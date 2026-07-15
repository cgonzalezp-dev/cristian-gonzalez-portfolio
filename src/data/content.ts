/**
 * Single source of truth for every piece of real copy on the site.
 * Components stay purely presentational — update your story here,
 * never inside a component file.
 */

export const person = {
  name: "Cristian González",
  role: "Senior Account Manager",
  tagline: "Building the leaders who build the business.",
  location: "Bogotá, Colombia",
  email: "cristhian.gonzalez2013@gmail.com",
  linkedin: "https://www.linkedin.com/in/cristian-gonzalez-94bbab174/",
  resumeUrl: "resume.pdf",
};

export const nav = [
  { label: "About", href: "#about" },
  { label: "Philosophy", href: "#philosophy" },
  { label: "Experience", href: "#experience" },
  { label: "Results", href: "#results" },
  { label: "Case Study", href: "#case-study" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
] as const;

export const hero = {
  eyebrow: "Operations Leader · BPO",
  headline: "I don't just run operations. I build the leaders who run them.",
  subhead:
    "8+ years scaling BPO operations from the ground up — 450+ FTE, 3.6x ROI, and a track record of promoting from within, not hiring around problems.",
  primaryCta: { label: "Let's talk", href: `mailto:${person.email}` },
  secondaryCta: { label: "Download résumé", href: person.resumeUrl },
};

export const about = {
  heading: "About",
  paragraphs: [
    "I started as a customer service rep in 2018. Every role since — Trainer, Supervisor, Account Executive, Senior Account Manager — was an internal promotion, not a lateral hire. That pattern isn't an accident; it's the result I optimize for.",
    "I manage 450+ FTE and strategic accounts across North America, LATAM, EMEA, APAC and Africa, but the number I actually track closest is how many of the people on my team move into more responsibility than they started with.",
  ],
};

export const personal = {
  heading: "Beyond the role",
  description: "The habits that keep me trained to lead — not a break from the work, the reason I can keep doing it.",
  items: [
    { label: "Family", detail: "Recently married; family time is non-negotiable." },
    { label: "Running", detail: "Recreational runner — how I carry pressure without carrying it home." },
    { label: "Languages", detail: "Native Spanish, professional English, learning Portuguese." },
  ],
};

export const philosophy = {
  heading: "How I lead",
  quote:
    "Good teams need leaders who keep growing. That's why I never stopped learning — and why I expect the same from everyone I work with.",
};

export type TimelineEntry = {
  role: string;
  org: string;
  period: string;
  bullets: string[];
};

export const experience: TimelineEntry[] = [
  {
    role: "Senior Account Manager",
    org: "Teleperformance — Bogotá, Colombia",
    period: "Jan 2024 – Present",
    bullets: [
      "Expand key accounts by identifying new revenue streams and strengthening long-term client partnerships.",
      "Achieved up to 3.6x ROI by redesigning sales flows and improving conversion through structured customer journeys.",
      "Oversee 450+ FTE operations, enhancing efficiency, service delivery, and KPI performance.",
      "Lowered attrition by up to 5% QoQ through employee engagement initiatives and early risk detection.",
    ],
  },
  {
    role: "Account Executive",
    org: "Teleperformance — Bogotá, Colombia",
    period: "Jan 2022 – Dec 2023",
    bullets: [
      "Reduced AHT by 23% by leading large-scale optimization initiatives presented to senior leadership.",
      "Improved CSAT and 1-Star metrics by up to 12% QoQ through performance-driven, KPI-focused programs.",
      "Led WBRs & MBRs, applying data analysis and Lean Six Sigma methodologies to drive continuous improvement.",
    ],
  },
  {
    role: "Supervisor",
    org: "Teleperformance — Bogotá, Colombia",
    period: "Jan 2019 – Dec 2021",
    bullets: [
      "Managed 20 FTE, driving team performance, SLA compliance, and operational efficiency.",
      "Led coaching and development programs, strengthening bilingual (EN/ES) customer interactions.",
    ],
  },
  {
    role: "Trainer Flex & Customer Service Representative",
    org: "Teleperformance — Bogotá, Colombia",
    period: "Feb 2018 – Jan 2019",
    bullets: [
      "Trained and onboarded new hires in CX workflows and call handling.",
      "Handled bilingual (EN/ES) customer interactions, building the foundation for everything after.",
    ],
  },
];

export type Stat = {
  value: string;
  label: string;
  direction: "up" | "down" | "neutral";
  detail?: { title: string; body: string };
};

export const results: Stat[] = [
  {
    value: "3.6x",
    label: "ROI on client investments",
    direction: "up",
    detail: {
      title: "Proactive onboarding, end-to-end",
      body: "This account's ROI started at 81%. Rather than patch individual complaints, I redesigned onboarding end-to-end: client profiling, rate/pricing structure, defined commitments, process improvements, and — at the close — new measures rolled out from supporting areas. ROI reached 360% (3.6x baseline).",
    },
  },
  {
    value: "-5%",
    label: "Attrition, QoQ",
    direction: "down",
    detail: {
      title: "Coffee talks and collective problem-solving",
      body: "Cut attrition 5% QoQ by opening regular 'coffee talk' spaces — working collectively with staff on what agents actually needed, then aligning that to client objectives. Started with emotional-salary initiatives, then layered in performance-based financial incentives, time off, immediate tangible rewards, and public recognition.",
    },
  },
  {
    value: "450+",
    label: "FTE managed",
    direction: "neutral",
    detail: {
      title: "From 3 agents to 60",
      body: "One sales account scaled from 3 agents to 60 under my leadership — part of the footprint that now totals 450+ FTE. Growth like that only holds if the team structure keeps pace with headcount, not the other way around.",
    },
  },
  {
    value: "9/25",
    label: "Team members promoted",
    direction: "up",
    detail: {
      title: "Weekly learning, real-time feedback",
      body: "9 of 25 were promoted because growth was built into the week, not saved for annual reviews. Weekly learning sessions and real-time feedback — delivered in the moment, not weeks later — helped people work from motivation toward their goals, not just toward a score.",
    },
  },
];

export const caseStudy = {
  heading: "Proof, not a pitch",
  title: "Turning a financial penalty into a peer-led recovery system",
  situation:
    "Our QA score dropped below 80%. If we didn't recover it within a month, the team would lose 5% of overall income — a penalty that was real, and already approved.",
  action:
    "I designed a peer incentive system, proposed the budget to fund it, and built a weekly ritual where every team showed the others what was actually working.",
  result: "QA went from under 80% to 90% in four weeks — and the system outlived the crisis that started it.",
};

export type SkillGroup = { category: string; items: string[] };

export const skills: SkillGroup[] = [
  {
    category: "Leadership",
    items: ["Team Development", "Coaching & Feedback", "Capability Building", "Change Management"],
  },
  {
    category: "Operations",
    items: ["KPI Tracking", "Process Optimization", "Lean Six Sigma (Yellow Belt)", "Workforce Planning"],
  },
  {
    category: "Commercial",
    items: ["Revenue Generation", "Account Management", "Negotiation", "Client Relationship Management"],
  },
  {
    category: "Analytical",
    items: ["Data Analysis", "WBR/MBR Reporting", "Budget Proposals", "Problem Solving"],
  },
];

export type LearningItem = { label: string; detail: string };

export const learning: LearningItem[] = [
  { label: "Portuguese", detail: "IBRACO — in progress" },
  { label: "Finance Specialization → MBA", detail: "Sequenced, deliberate — planned" },
  { label: "Lean Six Sigma — Yellow Belt", detail: "COPC, 2024" },
  { label: "360° Leadership Program", detail: "GIRA Consultoría, 2025" },
  { label: "Sales Strategy & Performance", detail: "LinkedIn Learning, 2026" },
];

export type Testimonial = { quote: string; name: string; title: string };

export const testimonials = {
  heading: "Recommendations",
  items: [
    {
      quote:
        "Cristian is the kind of leader who pushes you out of your comfort zone so you can show what you're actually capable of. He was the first step in a professional growth that hasn't stopped since.",
      name: "Sara Marcela Mesa Gómez",
      title: "HR Projects | Talent & Organizational Strategy | People Analytics",
    },
  ] as Testimonial[],
  emptyState: "More recommendations coming soon.",
};

export const finalCta = {
  heading: "If you're scaling a team, let's talk.",
  subhead: "Open to Director-level operations and account leadership roles.",
  cta: { label: "Get in touch", href: `mailto:${person.email}` },
};
