# Lyricscape Creations

Monorepo React/NestJS pour une plateforme musicale orientee paroles, artistes et contenu editorial.

## Structure

```text
lyricscape-creations/
├── frontend/  # React + Vite + TypeScript
├── backend/   # NestJS + Prisma + PostgreSQL
└── README.md
```

## Backend

Stack cible:

- NestJS
- Prisma
- PostgreSQL local
- JWT maison
- bcrypt pour les mots de passe

Variables d'environnement dans `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lyricscape?schema=public"
JWT_SECRET="change-me-in-local-env"
JWT_EXPIRES_IN="7d"
PORT=3000
```

Commandes:

```bash
cd backend
npm install
npm run start:dev
```

Prisma:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

Modules actuellement crees:

- `AuthModule`: register, login, JWT strategy, JWT guard, roles guard.
- `UsersModule`: `GET /api/users/me`, `PUT /api/users/me`.
- `ArtistsModule`: CRUD de base sur `/api/artists`.

## Frontend

Stack:

- React
- Vite
- TypeScript

Variables d'environnement dans `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Commandes:

```bash
cd frontend
npm install
npm run dev
```

Le serveur Vite tourne sur `5173` et proxifie `/api` vers `http://localhost:3000`.
