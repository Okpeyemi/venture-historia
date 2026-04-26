// lib/game/scenarios/sf-2005-saas.ts
import type { ScenarioPreset } from "./types";

export const SF_2005_SAAS: ScenarioPreset = {
  id: "sf_2005_saas_solo",
  name: "Silicon Valley 2005 — SaaS Solo Founder",
  loreSummary:
    "Post-dot-com recovery. The B2B SaaS thesis is gaining steam after Salesforce's 1B$ market cap. " +
    "You've quit your day job to build NimbusCRM, a lightweight CRM for SMBs. You have $50k of personal " +
    "savings, an idea, and a single laptop. The market is hot but crowded — VertexCRM has 45 employees " +
    "and a $80M valuation, BigCorp owns the enterprise tier, and a thousand wannabes are pivoting in and " +
    "out of the space.",

  era: 2005,
  region: "Silicon Valley",
  sector: "B2B SaaS",
  startingYear: 2005,
  startingQuarter: "Q1",

  companyName: "NimbusCRM",
  startingCash: 50_000,
  startingTeamSize: 1,
  startingProducts: [],

  competitors: [
    {
      id: "vertexcrm",
      name: "VertexCRM",
      scriptedPersona: "aggressive, well-funded, marketing-heavy",
      initialValuation: 80_000_000,
      initialTeamSize: 45,
      milestones: [
        {
          id: "vertexcrm_reacts_to_player_traction",
          trigger: { kind: "playerMrrAtLeast", mrr: 50_000 },
          reaction: {
            kind: "narration",
            text:
              "VertexCRM lance une campagne publicitaire agressive ciblant explicitement ton segment SMB. " +
              "Tu vois leurs annonces partout sur les sites tech. Pression réputationnelle réelle.",
          },
        },
        {
          id: "vertexcrm_doubles_down_after_player_raise",
          trigger: { kind: "playerCashAtLeast", cash: 5_000_000 },
          reaction: { kind: "competitorValuationDelta", competitorId: "vertexcrm", deltaPct: 25 },
        },
      ],
    },
    {
      id: "bigcorp",
      name: "BigCorp",
      scriptedPersona: "complacent enterprise incumbent",
      initialValuation: 2_000_000_000,
      initialTeamSize: 800,
      milestones: [
        {
          id: "bigcorp_acquisition_offer",
          trigger: { kind: "playerMrrAtLeast", mrr: 200_000 },
          reaction: {
            kind: "narration",
            text:
              "Un VP M&A de BigCorp t'a contacté discrètement par LinkedIn. Ils observent ta traction et " +
              "préparent une offre formelle pour le prochain trimestre.",
          },
        },
        {
          // After a big raise (>= $5M = Series A territory), board pressure
          // mounts as investors weigh selling vs scaling. Pushes
          // boardTension toward the ousting ending — currently the only
          // path to that ending in SF 2005. Plan #4 will add more
          // accelerators (missed milestones, founder/investor conflicts
          // during NL-driven turns).
          id: "bigcorp_post_raise_board_pressure",
          trigger: { kind: "playerCashAtLeast", cash: 5_000_000 },
          reaction: { kind: "boardTensionDelta", delta: 30 },
        },
      ],
    },
    {
      id: "startup_x",
      name: "PivotCo",
      scriptedPersona: "scrappy pivoter, never quite finds product-market fit",
      initialValuation: 12_000_000,
      initialTeamSize: 8,
      milestones: [
        {
          id: "startup_x_pivots_away",
          trigger: { kind: "atQuarter", year: 2006, quarter: "Q2" },
          reaction: {
            kind: "narration",
            text:
              "PivotCo annonce un pivot complet vers le marché de l'éducation. Ils ne sont plus un " +
              "concurrent direct — un de moins sur ton secteur.",
          },
        },
      ],
    },
  ],

  investors: [
    {
      name: "Northstar Capital",
      preferredRound: "seed",
      amount: 500_000,
      equityPct: 18,
      boardSeats: 1,
      hasVeto: false,
    },
    {
      name: "Beacon Ventures",
      preferredRound: "A",
      amount: 8_000_000,
      equityPct: 22,
      boardSeats: 2,
      hasVeto: true,
    },
  ],

  macroEvents: [
    {
      id: "sox_compliance_pressure",
      trigger: { year: 2006, quarter: "Q1" },
      narration:
        "La pression Sarbanes-Oxley s'intensifie pour les SaaS B2B vendant aux entreprises cotées. " +
        "Tes prospects enterprise commencent à exiger des certifications de sécurité et de traçabilité.",
      effect: { kind: "add_macro_flag", flag: "sox_pressure" },
    },
    {
      id: "ipo_window_opens",
      trigger: { year: 2007, quarter: "Q2" },
      narration:
        "Le marché des IPOs tech se réchauffe. Les comparables SaaS s'échangent à 8-12x ARR. " +
        "Si tu vises une sortie publique, c'est le moment de préparer ton dossier.",
      effect: { kind: "narration_only" },
    },
    {
      id: "financial_crisis_2008",
      trigger: { year: 2008, quarter: "Q3" },
      narration:
        "Lehman Brothers s'effondre. Les marchés financiers entrent en panique. Les budgets IT enterprise " +
        "sont gelés du jour au lendemain. Le secteur SaaS B2B est en danger immédiat.",
      effect: { kind: "trigger_industry_collapse" },
    },
  ],
};
