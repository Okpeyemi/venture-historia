# Venture Historia

Sim entrepreneurial narratif long format, propulsé par Claude.

## Stack

- **Frontend & API** : Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS 4
- **Database** : PostgreSQL 16 (Drizzle ORM)
- **Auth** : Auth.js v5 (Google OAuth — pinned to `next-auth@5.0.0-beta.31`)
- **Tests** : Vitest (unit/integration), Playwright (E2E)

Voir le design détaillé : [docs/superpowers/specs/2026-04-25-venture-historia-design.md](docs/superpowers/specs/2026-04-25-venture-historia-design.md)

Et le plan d'implémentation Foundation : [docs/superpowers/plans/2026-04-25-foundation.md](docs/superpowers/plans/2026-04-25-foundation.md)

## Setup local

### 1. Prérequis

- Node.js 20+
- Docker + Docker Compose
- npm

### 2. Installer les dépendances

```bash
npm install
```

### 3. Démarrer Postgres

```bash
docker compose up -d
```

Le conteneur expose Postgres sur **le port hôte 5433** (5432 est souvent pris par un Postgres système — on évite le conflit). Le port interne du conteneur reste 5432.

### 4. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Puis, dans `.env.local` :

- `AUTH_SECRET` : générer avec `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` : créer des credentials OAuth sur https://console.cloud.google.com/apis/credentials
  - Type : Web application
  - Redirect URI : `http://localhost:3000/api/auth/callback/google`
- `DATABASE_URL` : déjà préconfiguré pour pointer sur `localhost:5433`

### 5. Appliquer les migrations DB

```bash
set -a && source .env.local && set +a
npm run db:migrate
```

### 6. Lancer l'app

```bash
npm run dev
```

Ouvrir http://localhost:3000.

## Scripts utiles

```bash
npm run dev              # serveur de dev
npm run build            # build prod
npm run start            # serveur prod (après build)
npm test                 # tests unitaires (Vitest)
npm run test:watch       # tests unitaires en watch
npm run test:e2e         # tests E2E (Playwright)
npm run db:generate      # générer une nouvelle migration depuis le schéma
npm run db:migrate       # appliquer les migrations
npm run db:studio        # ouvrir Drizzle Studio (UI DB)
```

## Troubleshooting

### Google OAuth : "fetch failed" / `ETIMEDOUT` au callback

Symptôme : tu cliques "Continuer avec Google", tu choisis ton compte, Google te redirige vers `/api/auth/callback/google?code=...` puis tu atterris sur `/api/auth/error?error=Configuration` (HTTP 500). Les logs Next contiennent :

```
[auth][cause]: TypeError: fetch failed
[auth][details]: { "code": "ETIMEDOUT", "provider": "google" }
```

Cause : Auth.js essaie d'échanger le `code` contre un token en POSTant sur `https://oauth2.googleapis.com/token`. Sur certains réseaux (FAI, VPN, IPv6 cassé), Node n'arrive pas à atteindre cet endpoint malgré des A records DNS valides.

Workarounds, du moins intrusif au plus intrusif :

1. **Forcer IPv4 dans Node** :
   ```bash
   NODE_OPTIONS=--dns-result-order=ipv4first npm run dev
   ```

2. **Changer de réseau** : mobile hotspot, autre Wi-Fi, etc. C'est typiquement un problème de routage IP local — sur un autre réseau ça passe immédiatement.

3. **Modifier `/etc/gai.conf`** pour préférer IPv4 globalement (Linux, requiert sudo) — derniers recours.

Une fois le réseau OK, tu dois voir : sign-in → choix Google → consent → retour sur `/dashboard` avec ton nom affiché, et une ligne dans la table `user` (vérif : `docker compose exec postgres psql -U venture -d venture_historia -c 'SELECT id, email, name FROM "user";'`).

### Postgres : "address already in use" sur 5432

Le port hôte 5432 est probablement déjà occupé par un Postgres système (`systemctl status postgresql`). Ce projet utilise délibérément le port hôte 5433 (mapping Docker 5433:5432). Si tu vois cette erreur, vérifie que `docker-compose.yml` mappe bien `"5433:5432"` et que ton `DATABASE_URL` pointe sur `localhost:5433`.

## Plans d'implémentation

Voir [docs/superpowers/plans/](docs/superpowers/plans/) pour la suite des plans (game engine, scenario preset, IA integration, UI, save/resume, credits).
