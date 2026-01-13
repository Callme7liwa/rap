# Migration de seed.json vers DynamoDB

Ce document explique comment migrer complètement de `seed.json` vers DynamoDB pour que toutes les données soient servies par le backend API.

## Vue d'ensemble

La migration consiste à :
1. Créer les tables DynamoDB nécessaires (Artists, Songs, Albums)
2. Migrer les données de `seed.json` vers ces tables
3. Utiliser uniquement le backend API dans le frontend (plus de dépendance à `seed.json`)

## Prérequis

- AWS CLI configuré avec les bonnes credentials
- Node.js installé
- Variables d'environnement configurées dans `backend-api/.env`

## Variables d'environnement requises

Créez ou mettez à jour `backend-api/.env` :

```env
# AWS Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key

# Table Names
ARTISTS_TABLE_NAME=lyricscape-artists
SONGS_TABLE_NAME=lyricscape-songs
ALBUMS_TABLE_NAME=lyricscape-albums

# Autres variables...
S3_BUCKET_NAME=votre_bucket
DYNAMODB_TABLE_NAME=votre_table_uploads
```

## Étapes de migration

### 1. Créer les tables DynamoDB

```bash
cd backend-api

# Créer la table Artists
node scripts/create-artists-table.js

# Créer la table Songs (si le script existe)
node scripts/create-songs-table.js

# Créer la table Albums (si le script existe)
node scripts/create-albums-table.js
```

**Note**: Vérifiez que les scripts de création de tables existent. Sinon, ils doivent être créés en suivant le modèle de `create-artists-table.js`.

### 2. Migrer les données

Une fois les tables créées, exécutez le script de migration :

```bash
node scripts/migrate-seed-to-dynamodb.js
```

Ce script va :
- Lire le fichier `src/data/seed.json`
- Insérer tous les artistes dans la table Artists
- Insérer toutes les chansons dans la table Songs
- Insérer tous les albums dans la table Albums

### 3. Démarrer le backend

```bash
npm start
```

Le backend devrait maintenant être disponible sur `http://localhost:3000`.

### 4. Tester les routes API

Testez les nouvelles routes :

```bash
# Liste des artistes
curl http://localhost:3000/api/artists?limit=10

# Un artiste spécifique
curl http://localhost:3000/api/artists/1073333

# Chansons d'un artiste
curl http://localhost:3000/api/artists/1073333/songs

# Albums d'un artiste
curl http://localhost:3000/api/artists/1073333/albums

# Liste des chansons
curl http://localhost:3000/api/songs?limit=10

# Une chanson spécifique
curl http://localhost:3000/api/songs/5886204

# Liste des albums
curl http://localhost:3000/api/albums?limit=10

# Un album spécifique
curl http://localhost:3000/api/albums/123456

# Recherche globale
curl "http://localhost:3000/api/search?q=toto"
```

### 5. Démarrer le frontend

Dans un autre terminal :

```bash
cd ..  # Retour à la racine du projet
npm run dev
```

Le frontend devrait maintenant utiliser uniquement le backend API.

## Routes API disponibles

### Artists

- `GET /api/artists` - Liste paginée des artistes
  - Query params: `query`, `page`, `limit`
- `GET /api/artists/:id` - Un artiste par ID
- `GET /api/artists/slug/:slug` - Un artiste par slug
- `GET /api/artists/:id/songs` - Toutes les chansons d'un artiste
- `GET /api/artists/:id/albums` - Tous les albums d'un artiste

### Songs

- `GET /api/songs` - Liste des chansons
  - Query params: `q` (search), `artistId`, `albumId`, `limit`
- `GET /api/songs/:id` - Une chanson par ID

### Albums

- `GET /api/albums` - Liste des albums
  - Query params: `artistId`, `year`, `page`, `limit`
- `GET /api/albums/:id` - Un album par ID

### Search

- `GET /api/search?q=query` - Recherche globale dans artists, albums et songs

## Structure des données

### Artist

```json
{
  "id": 1073333,
  "name": "ElGrandeToto",
  "slug": "elgrandetoto",
  "url": "https://genius.com/artists/Elgrandetoto",
  "image_url": "...",
  "header_image_url": "...",
  "is_verified": true,
  "followers_count": 314,
  "iq": 719,
  "alternate_names": ["Taha Fahssi", "..."],
  "description_html": null,
  "instagram_name": "ElGrandeToto",
  "twitter_name": "ElGrandeToto",
  "facebook_name": "ElGrandeToto.off",
  "normalized_name": "elgrandetoto",
  "has_arabic": false,
  "likely_moroccan": false,
  "songs_count": 10,
  "created_at": "2025-11-01T...",
  "updated_at": "2025-11-01T..."
}
```

### Song

```json
{
  "id": 5886204,
  "title": "Love Nwantiti (North African Remix)",
  "full_title": "...",
  "url": "...",
  "path": "/Ckay-love-nwantiti-north-african-remix-lyrics",
  "release_date_for_display": "August 21, 2020",
  "release_date_components": "{\"year\": 2020, \"month\": 8, \"day\": 21}",
  "song_art_image_url": "...",
  "lyrics_state": "complete",
  "instrumental": false,
  "annotation_count": 4,
  "pyongs_count": 6,
  "pageviews": 351628,
  "primary_artist_id": 821992,
  "primary_artist_name": "CKay",
  "album_id": null,
  "lyrics": "...",
  "created_at": "2025-11-01T...",
  "updated_at": "2025-11-01T..."
}
```

### Album

```json
{
  "id": 123456,
  "name": "Album Name",
  "full_title": "Album Name by Artist",
  "url": "...",
  "cover_art_url": "...",
  "release_date_for_display": "January 1, 2023",
  "release_date_components": "{\"year\": 2023, \"month\": 1, \"day\": 1}",
  "artist_id": 1073333,
  "artist_name": "Artist Name",
  "songs": [...],
  "created_at": "2025-11-01T...",
  "updated_at": "2025-11-01T..."
}
```

## Dépannage

### Les tables n'existent pas

Si vous obtenez une erreur "Table does not exist", assurez-vous d'avoir créé les tables avec les scripts appropriés.

### Erreur AWS Credentials

Vérifiez que vos credentials AWS sont correctement configurés dans `.env` ou via AWS CLI.

### Le frontend ne reçoit pas de données

1. Vérifiez que le backend est bien démarré
2. Vérifiez les logs du backend pour voir les erreurs
3. Vérifiez que `VITE_API_BASE` est correctement configuré dans le frontend (fichier `.env` à la racine)

```env
VITE_API_BASE=http://localhost:3000
```

### Performance lente

Les opérations `Scan` sur DynamoDB peuvent être lentes pour de grandes tables. Considérez :
- Ajouter des GSI (Global Secondary Indexes) pour les recherches fréquentes
- Utiliser Query au lieu de Scan quand possible
- Implémenter de la pagination côté backend
- Ajouter du caching avec Redis ou ElastiCache

## Optimisations futures

1. **GSI pour la recherche**: Ajouter des index secondaires pour améliorer les performances de recherche
2. **Pagination côté backend**: Implémenter une vraie pagination avec curseurs DynamoDB
3. **Caching**: Ajouter Redis pour mettre en cache les résultats fréquemment demandés
4. **Rate limiting**: Protéger les endpoints avec du rate limiting
5. **Monitoring**: Ajouter CloudWatch metrics pour surveiller l'utilisation

## Notes

- Le fichier `seed.json` peut être conservé pour référence mais n'est plus utilisé par le code
- Le fichier `src/lib/voting-api.ts` utilise encore `seed.json` pour générer des polls de test (à migrer séparément si nécessaire)
- Toutes les données sont maintenant stockées dans DynamoDB et servies par le backend

## Support

Pour toute question ou problème, créez une issue sur le repository GitHub.
