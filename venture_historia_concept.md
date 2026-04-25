# 🎮 Venture Historia — Concept de Jeu

> Un jeu de stratégie entrepreneuriale propulsé par l'IA, sur navigateur web.

---

## 🧭 Concept général

Tu joues un entrepreneur à n'importe quelle époque ou contexte (1800s, Silicon Valley 2000s, Afrique 2030, etc.) et tu dois construire un empire économique en prenant des décisions réalistes — avec une IA qui simule le marché, les concurrents et les événements.

---

## 🏗️ Architecture technique recommandée

### Frontend
- **React + TypeScript** — pour l'interface de jeu
- **Tailwind CSS** — UI rapide et propre
- **Canvas ou SVG** — pour les cartes / graphiques de marché

### Backend
- **Node.js + Express** ou **Python + FastAPI**
- **PostgreSQL** — stocker l'état des parties, utilisateurs, scénarios
- **Redis** — cache de l'état du monde en temps réel

### IA
- **Claude API (Anthropic)** — comme Game Master narratif
- **OpenRouter** — pour router vers plusieurs modèles selon le coût/besoin
- **Prompt engineering structuré** — l'état de ta partie (finances, employés, marché) injecté dans chaque requête

---

## 🧠 Les 3 agents IA clés

| Agent | Rôle |
|---|---|
| **Market GM** | Simule la concurrence, les crises, les opportunités |
| **Advisor** | Conseille le joueur selon son profil |
| **Validator** | Vérifie la cohérence des décisions |

---

## 🗂️ Structure des données du jeu

L'état du monde est sérialisé et injecté dans chaque prompt envoyé à l'IA — exactement comme Pax Historia.

```json
{
  "world_state": {
    "year": 2005,
    "sector": "tech",
    "market_conditions": "bull market",
    "competitors": [],
    "events": []
  },
  "player_state": {
    "cash": 50000,
    "employees": 3,
    "products": [],
    "reputation": 72
  },
  "history": []
}
```

---

## 🚀 Roadmap suggérée

### Phase 1 — MVP
- Choisir une époque / secteur
- Prendre des décisions textuelles (lever des fonds, recruter, lancer un produit)
- L'IA narre les conséquences

### Phase 2 — Enrichissement
- Carte / dashboard visuel des finances
- Scénarios communautaires (comme les 4 000 scénarios de Pax Historia)
- Concurrents contrôlés par l'IA avec qui on peut négocier en langage naturel

### Phase 3 — Monétisation
- Modèle à tokens (payer par tour selon le modèle IA choisi)
- Scénarios premium
- Abonnement mensuel pour les joueurs intensifs

---

## 💡 Ce qui différencie ce jeu de Pax Historia

| Aspect | Pax Historia | Venture Historia |
|---|---|---|
| **Focus** | Géopolitique / Histoire | Business / Entrepreneuriat |
| **Profondeur économique** | Basique | Avancée (compta, RH, levée de fonds) |
| **Angle unique** | Mondial | Contexte africain optionnel |
| **Personnage IA** | Game Master général | Mentor IA persistant |

---

## 🔮 Fonctionnalités différenciantes

- **Focus business** — plus de profondeur économique (comptabilité, levée de fonds, RH)
- **Contexte africain optionnel** — un angle unique, peu exploité dans ce genre de jeu
- **Mentor IA** — un personnage persistant qui accompagne le joueur toute la partie
- **Scénarios communautaires** — les joueurs peuvent créer et partager leurs propres scénarios

---

## 📌 Prochaines étapes

1. Définir le scénario de départ (époque, secteur, région)
2. Construire le prompt système du Game Master
3. Créer le schéma de base de données
4. Développer le MVP frontend (interface de décision textuelle)
5. Connecter l'API Claude pour la narration IA
