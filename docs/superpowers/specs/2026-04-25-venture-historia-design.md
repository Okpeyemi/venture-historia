# Venture Historia — Spec de design

> Statut : design validé en brainstorm le 2026-04-25. Prêt pour planification d'implémentation.

## 1. Vision

Venture Historia est un sim entrepreneurial narratif long format, jouable sur navigateur web, où le joueur dirige une entreprise sur 50-100 trimestres in-game (≈ 25 années) et construit son histoire à travers des décisions structurées et des événements générés par l'IA.

**Différenciation** vs jeux existants :
- vs *Capitalism / Game Dev Tycoon* : narration IA dynamique, événements imprévus, fins multiples
- vs *Pax Historia* : focus business plutôt que géopolitique, profondeur économique avancée (compta, RH, levée), mentor IA persistant (Phase 2)
- vs *AI Dungeon* : structure mécanique solide (état chiffré, validation, décisions cadrées) qui empêche l'incohérence narrative

**Satisfaction-cible** : narrative dominante (le joueur joue pour l'histoire qu'il construira) + métriques claires (les chiffres qui montent comme étoiles polaires).

## 2. Boucle de jeu

**Structure : hybride trimestres + événements.**

Un trimestre se déroule en 4 étapes :

1. **Ouverture** — l'IA (Market GM) génère une narration de contexte : où en est le marché, ce que font les concurrents scriptés, l'état du joueur. ≈ 1 appel IA.
2. **Planification** — le joueur ouvre le menu d'actions (5 catégories) et prend 1-N actions. Pas d'appel IA si actions structurées uniquement.
3. **Événement IA mid-trimestre** (potentiellement déclenché en étape 1) — situation présentée + 3-4 choix générés contextuellement. Le joueur choisit.
4. **Clôture** — l'IA résout l'ensemble (actions + événement), narre les conséquences, calcule le nouvel état, avance au trimestre suivant. ≈ 1 appel IA.

**Cadence IA** : ~2 appels garantis par trimestre, +0-2 si l'escape hatch NL est utilisée, +0-1 si l'Advisor est consulté.

**Session model** : longue partie sauvegardable, multi-session (modèle Crusader Kings / Civilization). 50-100 trimestres = 2-5h de jeu réel total, étalé sur plusieurs sessions de 30-60 min.

## 3. Système de décision

**Trois canaux d'interaction** :

1. **Menu structuré** — 5 catégories visibles en permanence pendant la planification :
   - 💰 **Finance** : lever des fonds (seed/A/B/C), prendre/rembourser de la dette, allouer budget marketing/R&D
   - 👥 **Équipe** : embaucher (junior/senior/exec), licencier, ajuster compensation, programmes culture
   - 🚀 **Produit** : lancer R&D, sortir une version, pivoter, killer une feature
   - 📈 **Marché** : campagnes marketing, ajustement pricing, expansion géographique, choix de positionnement
   - 🤝 **Stratégie** : entrer/sortir d'un marché, partenariats, tentative d'acquisition, M&A

2. **Choix contextuels** — lors des événements générés par l'IA, le joueur sélectionne parmi 3-4 options dynamiques (ex : "Sequoia veut mener ta Série A à $8M sur valo $35M avec 2 sièges au board" → Accepter / Négocier / Refuser / Chercher autre lead).

3. **Escape hatch en langage naturel** — pour les actions hors menu ("je veux débaucher le CTO d'AcmeCRM"), le joueur tape un texte libre. Le **Validator** (agent IA) vérifie la cohérence (cash dispo, action légale dans le scope), traduit en delta de state ou rejette avec une raison explicite.

**Granularité visée** : chunky, pas spreadsheet. Une action = une décision substantielle (pas de gestion paie nominale). 2-5 actions par trimestre est l'usage attendu.

## 4. Modèle d'état

**Métriques visibles au joueur :**

| Métrique | Type | Description |
|---|---|---|
| `cash` | int (USD) | Trésorerie disponible |
| `team_size` | int | Nombre d'employés |
| `mrr` | int (USD) | Revenus récurrents mensuels — métrique principale du scénario MVP (SaaS). D'autres scénarios pourront introduire des variantes (`revenue_quarter` pour secteurs non-récurrents). |
| `reputation` | int (0-100) | Notoriété / image de marque |
| `runway_months` | int (calculé) | Cash / burn rate mensuel |
| `founder_burnout` | int (0-100) | Bien-être du fondateur — fail state à 100 |

**État sérialisé complet** (injecté dans chaque prompt IA) :

```json
{
  "scenario": {
    "preset_id": "sf_2005_saas_solo",
    "era": 2005,
    "region": "Silicon Valley",
    "sector": "B2B SaaS",
    "starting_year": 2005,
    "current_quarter": "Q3",
    "current_year": 2005
  },
  "world_state": {
    "market_conditions": "post-dotcom recovery, B2B appetite high",
    "macro_events_active": ["sox_compliance_pressure"],
    "competitors": [
      {
        "id": "vertexcrm",
        "name": "VertexCRM",
        "scripted_persona": "aggressive, well-funded, marketing-heavy",
        "scripted_state": { "valuation": 80000000, "team_size": 45 }
      }
    ]
  },
  "player_state": {
    "company_name": "NimbusCRM",
    "cash": 320000,
    "team_size": 5,
    "mrr": 18000,
    "reputation": 72,
    "runway_months": 7,
    "founder_burnout": 34,
    "products": [{"name": "Nimbus v1", "stage": "shipped", "satisfaction": 68}],
    "investors": [],
    "board_seats_taken": 0
  },
  "history": {
    "trimesters_played": 7,
    "narrative_summary": "...condensé des 7 trimestres précédents...",
    "key_decisions": [...],
    "active_consequences": [...]
  }
}
```

**Compression d'historique** : pour limiter les coûts d'input, l'`history.narrative_summary` est un résumé condensé que le GM met à jour à chaque clôture de trimestre, plutôt que de réinjecter toute la narration.

## 5. NPCs et concurrents

**MVP — approche scriptée (B)** :
- 2-3 concurrents nommés par scénario, chacun avec persona fixe + état évolutif scripté
- 1-2 investisseurs récurrents disponibles, désignés par des **noms fictifs** (ex : "Northstar Capital", "Beacon Ventures") pour éviter tout enjeu IP
- Comportement déclenché par milestones du joueur (ex : "joueur dépasse 100k MRR" → VertexCRM réagit avec une campagne agressive)
- Le Market GM intègre ces NPCs dans la narration sans simuler leurs décisions

**Phase 2 — approche dynamique (D)** :
- Le Market GM "joue" les NPCs au moment de composer le trimestre (génère leurs actions selon leur persona + l'état du marché)
- Le joueur peut **négocier en NL** avec eux (offres d'acquisition, partenariats, débauche)
- Toujours nommés et persistants à travers la partie

## 6. Conditions de fin

**4 success endings :**
- 🎉 **IPO** — passage en bourse, cash-out fondateur, presse positive
- 🤝 **Acquisition stratégique** — racheté par un acteur majeur (avec tensions : perte de contrôle, talent flight)
- 🏡 **Lifestyle business** — entreprise indépendante, profitable, humaine maintenue plusieurs années
- 👑 **Conglomérat** — empire multi-verticales construit par M&A successifs

**4 fail endings :**
- 💀 **Faillite** — `cash` atteint 0 sans levée possible
- 🪑 **Ousting** — board te vire (peut survenir après levée avec siège + véto si tensions accumulées)
- 🔥 **Burnout** — `founder_burnout` atteint 100, le fondateur se retire
- 🌪️ **Industry collapse** — événement macro destructeur du secteur (dot-com bust, crise 2008…)

**Time-out implicite** : les parties peuvent durer indéfiniment, mais après ~100 trimestres, le GM commence à proposer des "exit ramps" narratifs pour pousser vers une fin.

## 7. Architecture IA

Trois agents Claude, avec des rôles distincts et appelés à des moments précis :

### 🎭 Market GM
- **Modèle par défaut** : Claude Sonnet 4.6
- **Quand** : ouverture et clôture de chaque trimestre
- **Inputs** : state complet + scénario + historique condensé
- **Outputs** : narration (texte) + structured event JSON (situation + 3-4 choix) + delta de state proposé

### 🛡️ Validator
- **Modèle par défaut** : Claude Haiku 4.5 (cheap, rapide)
- **Quand** : uniquement si le joueur utilise l'escape hatch NL
- **Inputs** : état actuel + texte de l'action proposée + règles métier de base
- **Outputs** : `accepted: true/false` + delta de state si accepté + raison de rejet si refusé

### 🧙 Advisor
- **Modèle par défaut** : Claude Sonnet 4.6
- **Quand (MVP)** : on-demand uniquement, sur clic du joueur
- **Quand (Phase 2)** : chat persistant accessible en panneau latéral toute la partie
- **Inputs** : state + historique récent + question éventuelle
- **Outputs** : recommandation argumentée (texte)

### Optimisations cost transverses
- **Prompt caching Anthropic** (TTL 5 min) : system prompt + lore du scénario + historique condensé sont en cache → divise par 3-10 le coût d'input
- **Modèle adaptatif** : Haiku pour Validator et narrations routine, Sonnet par défaut, Opus uniquement pour endings et pivots majeurs
- **Compression historique** : le GM met à jour un résumé condensé à chaque clôture

## 8. Architecture scénarios

**MVP** : 1 preset poli unique
- ID : `sf_2005_saas_solo`
- Setup : Silicon Valley 2005, secteur B2B SaaS, fondateur solo, $50k de seed personnel, idée de CRM léger
- Lore enrichi (concurrents nommés, contexte macro 2005-2010, événements scriptés saillants)

**Phase 2** : créateur de scénarios complet
- **Mode formulaire** : champs structurés (époque, région, secteur, taille starting team, cash de départ, etc.)
- **Mode brief texte** : le joueur écrit un brief court ("Chicago 1923, Prohibition, je tiens un speakeasy"), l'IA génère l'état initial et la lore
- **Mode hybride** : formulaire + champs texte libres pour affiner
- **Presets supplémentaires** : 3-5 nouveaux dont au moins 1 africain (ex : `lagos_2030_fintech`) — angle différenciant explicite du concept

**Phase 3** : partage communautaire
- Publier ses scénarios (modération légère)
- Catalogue + recherche
- Scénarios premium curatés par l'éditeur (monétisation supplémentaire)

## 9. Monétisation

**Modèle : crédits par appel IA, avec $1 offert au signup.**

- Pas d'abonnement — le joueur achète des packs de crédits qui ne périment pas
- Chaque appel IA consomme un nombre de crédits proportionnel au modèle utilisé et à la complexité
- Coût prédictif **affiché AVANT chaque action coûteuse** (ex : "Demander conseil à l'Advisor coûtera ~3 crédits")
- Le joueur peut choisir son tier de modèle par feature (ex : "Pour les narrations, Haiku ; pour les endings, Opus")

**Pricing illustratif** (à calibrer en alpha — voir section 13) :

Le crédit est l'unité de pricing exposée au joueur. Le **coût en crédits par appel IA** dépend du modèle choisi :

| Modèle | Coût IA réel estimé | Prix en crédits |
|---|---|---|
| Haiku 4.5 | ~$0.01 / appel | **1 crédit** |
| Sonnet 4.6 (défaut) | ~$0.08-0.12 / appel | **6 crédits** |
| Opus 4.7 | ~$0.30-0.50 / appel | **25 crédits** |

**Packs de crédits indicatifs** (1 crédit ≈ $0.025) :

- 🎁 **$1 offert au signup** = 30 crédits (≈ 2-3 trimestres de découverte avec Sonnet)
- 💵 **$5** = 200 crédits (≈ 10-15 trimestres)
- 💵 **$15** = 700 crédits (≈ 1 partie complète de ~50 trimestres) — volume discount actif
- 💵 **$40** = 2200 crédits (≈ 2-3 parties complètes)

**Marge brute estimée** : 30-60% selon mix de modèles utilisé par le joueur (plus le joueur utilise Haiku, plus la marge est haute pour nous mais aussi pour lui en termes de volume jouable). Marge plus modeste qu'un SaaS classique parce que le coût IA est variable et indexé sur l'usage. **Ces chiffres sont à recalibrer après mesure des coûts IA réels et A/B test du pricing en alpha.**

**Mitigations design contre l'anxiété "compteur qui tourne"** :
- Coûts toujours prévisibles, jamais surprenants
- Solde et "trimestres restants estimés" affichés ensemble (pas le solde brut seul)
- Volume discount qui récompense l'investissement
- Indicateur du modèle IA utilisé pour chaque appel (transparence sur le rapport qualité/prix)

## 10. Phasage de shipping

### MVP — Shipping v1

- 1 preset jouable de bout en bout : `sf_2005_saas_solo`
- Boucle hybride complète (ouverture → planification → événement → clôture)
- Menu structuré 5 catégories
- Choix contextuels lors des événements
- Escape hatch NL avec Validator
- Toutes les métriques d'état (incluant `founder_burnout`)
- 2-3 concurrents scriptés + 1-2 investisseurs récurrents
- 8 endings (4 success + 4 fail)
- Save/resume (essentiel pour partie longue multi-session)
- Advisor on-demand
- Système de crédits par appel IA + paiement
- Auth (email + Google)
- Tier modèle : Sonnet par défaut, Haiku pour Validator

### Phase 2 — Élargissement

- Créateur de scénarios complet (formulaire + brief texte + hybride)
- 3-5 presets supplémentaires (incluant au moins 1 scénario africain : `lagos_2030_fintech`)
- NPCs IA-driven (D) avec négociation NL
- Mentor IA persistant (chat latéral, mémoire conversationnelle)
- Choix de tier de modèle exposé au joueur par feature

### Phase 3 — Communauté & monétisation avancée

- Partage public de scénarios créés (avec modération légère)
- Scénarios premium curatés par l'éditeur (monétisation supplémentaire)
- Stats publiques, leaderboards, endings rares
- Volume discounts agressifs sur packs de crédits

## 11. Stack technique

- **Frontend + API routes** : Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Base de données** : PostgreSQL (avec Drizzle ou Prisma comme ORM)
- **Cache** : Redis (Upstash en serverless ou self-hosted)
- **IA** : Anthropic SDK direct (pas via OpenRouter au MVP — accès au prompt caching natif et latence réduite)
- **Auth** : NextAuth.js (email magic link + Google OAuth)
- **Paiement** : Stripe (Checkout + webhooks pour crédits)
- **Hosting** : Vercel pour le MVP (Next.js natif, scale automatique). Migration possible vers Fly.io / Railway / self-host plus tard

**Pas de backend séparé au MVP** : les API routes Next.js suffisent. Un service worker dédié (Express, FastAPI, etc.) sera évalué uniquement si un besoin spécifique apparaît (worker async lourd, simulation déterministe en Rust/Go pour la perf, etc.).

## 12. Hors scope explicite

Pour éviter le scope creep, ces éléments sont **explicitement hors scope du MVP** :

- Multijoueur / coop / PvP
- Application mobile native (le web responsive suffit)
- Visualisations graphiques avancées (charts complexes, dashboards animés) — métriques affichées en plain numbers + tendances simples
- Mode hors-ligne
- Internationalisation (anglais + français au mieux ; le scénario `sf_2005_saas_solo` peut être anglais natif si plus naturel)
- Édition collaborative de scénarios
- Voice / TTS pour la narration

## 13. Questions ouvertes à trancher en planning

- **Schéma exact des actions du menu** : combien d'actions par catégorie, paramétrage exact ? À détailler en phase de plan.
- **Détail du calcul de `founder_burnout`** : quelles actions le font monter/descendre, à quelle vitesse ?
- **Format précis du prompt système Market GM** : à itérer empiriquement avec evals.
- **Politique de sauvegarde** : autosave à chaque clôture ? slot manuels ? Une seule partie active à la fois (au MVP) ?
- **Onboarding tutoriel** : interactif (tour guidé) ou narratif (premier trimestre scripté) ?
- **Pricing exact des packs de crédits** : à calibrer après mesure des coûts IA réels en alpha.

Ces questions seront tranchées au moment de l'écriture du plan d'implémentation.
