export type TutorialStepId =
  | "topbar-overall"
  | "metric-runway"
  | "narration"
  | "tabs"
  | "decisions"
  | "advance";

export type TutorialStep = {
  id: TutorialStepId;
  target: string;          // CSS selector matching a [data-tutorial-target="..."] node
  title: string;
  body: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "topbar-overall",
    target: "[data-tutorial-target='topbar']",
    title: "Ton tableau de bord",
    body: "Voici ta société, le trimestre courant et tes 7 indicateurs.",
  },
  {
    id: "metric-runway",
    target: "[data-tutorial-target='metric-runway']",
    title: 'La métrique "Piste"',
    body: "Compte à rebours avant la faillite. Surveille-la.",
  },
  {
    id: "narration",
    target: "[data-tutorial-target='narration']",
    title: "Le récit du trimestre",
    body: "Ce que le GM raconte. Le marché, les concurrents, les opportunités.",
  },
  {
    id: "tabs",
    target: "[data-tutorial-target='tabs']",
    title: "Les actions",
    body: "7 catégories d'actions. Choisis-en une, remplis le formulaire, ajoute au trimestre.",
  },
  {
    id: "decisions",
    target: "[data-tutorial-target='decisions']",
    title: "Tes décisions",
    body: "Tes choix s'accumulent ici jusqu'à ce que tu avances.",
  },
  {
    id: "advance",
    target: "[data-tutorial-target='advance']",
    title: "Avancer le trimestre",
    body: "Quand prêt, avance. Le GM applique tes décisions et raconte la suite.",
  },
];

export const TUTORIAL_FLAG_KEY = "vh_tutorial_seen_v1";
