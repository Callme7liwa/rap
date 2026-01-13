# 🔐 Guide de Test de l'Authentification

## ✅ Configuration Terminée

- ✅ Cognito User Pool créé: `eu-north-1_e4j7eAxOe`
- ✅ Client ID: `nqvnmimojggjpuvfk0cldeu2t`
- ✅ Domaine: `lyricscape-prod.auth.eu-north-1.amazoncognito.com`
- ✅ Google OAuth configuré
- ✅ Variables d'environnement configurées
- ✅ Serveur frontend: `http://localhost:8090`
- ✅ Serveur backend: `http://localhost:3000`

---

## 🧪 Tests à Effectuer

### 1. Test Sign Up (Création de Compte)

**Étapes:**
1. Ouvrir `http://localhost:8090/login`
2. Cliquer sur l'onglet **"Create Account"**
3. Remplir le formulaire:
   - Email: `test@example.com`
   - Password: `Test1234!` (doit contenir majuscule, minuscule, chiffre, symbole)
   - Confirm Password: `Test1234!`
   - Name: `Test User`
4. Cliquer sur **"Create Account"**

**Résultat attendu:**
- ✅ Un code de vérification est envoyé à l'email
- ✅ Un formulaire pour entrer le code de 6 chiffres apparaît

**Vérification AWS:**
```bash
# Vérifier l'utilisateur dans Cognito
aws cognito-idp list-users --user-pool-id eu-north-1_e4j7eAxOe --region eu-north-1
```

---

### 2. Test Vérification Email

**Étapes:**
1. Vérifier votre boîte email
2. Copier le code de vérification à 6 chiffres
3. Entrer le code dans le formulaire
4. Cliquer sur **"Confirm"**

**Résultat attendu:**
- ✅ L'email est vérifié
- ✅ Redirection vers la page de connexion ou connexion automatique

**Note:** Si vous ne recevez pas l'email:
- Vérifier le spam
- Le service Cognito email est limité (150 emails/jour)
- Pour production, configurer AWS SES

---

### 3. Test Sign In (Connexion)

**Étapes:**
1. Aller sur `http://localhost:8090/login`
2. Cliquer sur l'onglet **"Sign In"**
3. Entrer:
   - Email: `test@example.com`
   - Password: `Test1234!`
4. Cliquer sur **"Sign In"**

**Résultat attendu:**
- ✅ Connexion réussie
- ✅ Redirection vers la page d'accueil `/`
- ✅ Le nom d'utilisateur apparaît dans la navigation
- ✅ Un bouton **"Sign Out"** est visible

**Vérification navigateur:**
```javascript
// Ouvrir la console navigateur (F12) et exécuter:
import { fetchAuthSession } from 'aws-amplify/auth';
const session = await fetchAuthSession();
console.log('User authenticated:', !!session.tokens);
console.log('Access Token:', session.tokens?.accessToken);
```

---

### 4. Test Sign In avec Google OAuth

**Étapes:**
1. Aller sur `http://localhost:8090/login`
2. Cliquer sur **"Continue with Google"**
3. Se connecter avec votre compte Google

**Résultat attendu:**
- ✅ Redirection vers la page Google OAuth
- ✅ URL commence par: `https://lyricscape-prod.auth.eu-north-1.amazoncognito.com/oauth2/authorize`
- ✅ Après connexion Google, redirection vers `http://localhost:8090`
- ✅ Utilisateur connecté automatiquement

**URL OAuth attendue:**
```
https://lyricscape-prod.auth.eu-north-1.amazoncognito.com/oauth2/authorize?
  redirect_uri=http://localhost:8090
  &response_type=code
  &client_id=nqvnmimojggjpuvfk0cldeu2t
  &identity_provider=Google
  &scope=email+openid+profile
```

**Important:** Vérifier dans Google Cloud Console que les callback URLs incluent:
- `http://localhost:8090`
- `http://localhost:8090/`
- `http://localhost:8090/login`
- `https://lyricscape-prod.auth.eu-north-1.amazoncognito.com/oauth2/idpresponse`

---

### 5. Test Routes Protégées

**Test A: Accès autorisé (connecté)**
1. Se connecter
2. Aller sur `/blog/create`

**Résultat attendu:**
- ✅ Accès autorisé
- ✅ Page s'affiche normalement

**Test B: Accès refusé (déconnecté)**
1. Se déconnecter
2. Essayer d'accéder à `/blog/create`

**Résultat attendu:**
- ✅ Redirection vers `/login`
- ✅ Message ou indication qu'il faut se connecter

**Vérification dans le code:**
```typescript
// Vérifier que ProtectedRoute fonctionne
// Dans src/components/ProtectedRoute.tsx
```

---

### 6. Test Sign Out (Déconnexion)

**Étapes:**
1. Être connecté
2. Cliquer sur le bouton **"Sign Out"** dans la navigation
3. Confirmer la déconnexion si nécessaire

**Résultat attendu:**
- ✅ Déconnexion réussie
- ✅ Redirection vers la page d'accueil `/`
- ✅ Le bouton "Sign Out" disparaît
- ✅ Un bouton "Login" ou "Sign In" apparaît

---

### 7. Test Backend JWT Validation

**Prérequis:**
- Backend en cours d'exécution sur port 3000
- `aws-jwt-verify` installé dans backend-api

**Étapes:**
1. Se connecter sur le frontend
2. Ouvrir la console navigateur (F12)
3. Exécuter:

```javascript
import { fetchAuthSession } from 'aws-amplify/auth';

const session = await fetchAuthSession();
const accessToken = session.tokens?.accessToken.toString();

// Test appel API protégé
const response = await fetch('http://localhost:3000/api/protected-route', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log('Response:', data);
```

**Résultat attendu:**
- ✅ Status 200 si token valide
- ✅ Status 401 si token invalide ou absent
- ✅ Backend logs montrent la validation du token

**Vérifier backend/.env:**
```bash
COGNITO_USER_POOL_ID=eu-north-1_e4j7eAxOe
COGNITO_CLIENT_ID=nqvnmimojggjpuvfk0cldeu2t
AWS_REGION=eu-north-1
```

---

### 8. Test Gestion des Erreurs

**Test A: Mot de passe incorrect**
1. Essayer de se connecter avec un mauvais mot de passe

**Résultat attendu:**
- ✅ Message d'erreur clair
- ✅ "Incorrect username or password"

**Test B: Email non vérifié**
1. Créer un compte mais ne pas vérifier l'email
2. Essayer de se connecter

**Résultat attendu:**
- ✅ Message demandant de vérifier l'email
- ✅ Option pour renvoyer le code

**Test C: Mot de passe faible**
1. Essayer de créer un compte avec mot de passe: `test123`

**Résultat attendu:**
- ✅ Message d'erreur
- ✅ "Password does not meet requirements"

---

## 🔍 Debugging

### Vérifier les logs Cognito

```bash
# Lister les utilisateurs
aws cognito-idp list-users \
  --user-pool-id eu-north-1_e4j7eAxOe \
  --region eu-north-1

# Vérifier le client
aws cognito-idp describe-user-pool-client \
  --user-pool-id eu-north-1_e4j7eAxOe \
  --client-id nqvnmimojggjpuvfk0cldeu2t \
  --region eu-north-1
```

### Vérifier les tokens dans le navigateur

1. F12 → Application → Local Storage → `http://localhost:8090`
2. Chercher les clés commençant par `CognitoIdentityServiceProvider`
3. Vérifier les tokens `accessToken`, `idToken`, `refreshToken`

### Tester manuellement l'OAuth flow

```bash
# URL pour tester Google OAuth
https://lyricscape-prod.auth.eu-north-1.amazoncognito.com/oauth2/authorize?client_id=nqvnmimojggjpuvfk0cldeu2t&response_type=code&scope=email+openid+profile&redirect_uri=http://localhost:8090&identity_provider=Google
```

---

## ⚠️ Problèmes Courants

### 1. "DNS_PROBE_FINISHED_NXDOMAIN"
**Cause:** Domaine Cognito incorrect
**Solution:** Vérifier que le domaine est `lyricscape-prod.auth.eu-north-1.amazoncognito.com`

### 2. "redirect_uri_mismatch"
**Cause:** URL de callback non autorisée
**Solution:** 
- Vérifier Terraform variables.tf
- Vérifier Google Cloud Console
- Run `terraform apply` pour mettre à jour

### 3. "Port 8089 is in use"
**Cause:** Un autre processus utilise le port
**Solution:** 
- Le serveur Vite utilise automatiquement 8090
- Mettre à jour les callback URLs pour inclure 8090
- Ou arrêter le processus sur 8089: `netstat -ano | findstr :8089`

### 4. Email de vérification non reçu
**Cause:** Cognito email par défaut est limité
**Solution:**
- Vérifier spam
- Attendre quelques minutes
- Pour production: configurer AWS SES
- Vérifier les quotas Cognito dans AWS Console

### 5. "Invalid token" du backend
**Cause:** Variables d'environnement backend incorrectes
**Solution:**
- Vérifier backend-api/.env
- Vérifier que `aws-jwt-verify` est installé
- Redémarrer le serveur backend

---

## ✅ Checklist Finale

- [ ] ✅ Créer un compte avec email/password
- [ ] ✅ Recevoir et vérifier le code email
- [ ] ✅ Se connecter avec email/password
- [ ] ✅ Voir le nom d'utilisateur dans la navigation
- [ ] ✅ Se connecter avec Google OAuth
- [ ] ✅ Accéder aux routes protégées quand connecté
- [ ] ✅ Être redirigé vers /login pour routes protégées quand déconnecté
- [ ] ✅ Se déconnecter
- [ ] ✅ Backend valide les tokens JWT correctement
- [ ] ✅ Gestion d'erreurs fonctionne (mauvais mot de passe, etc.)

---

## 🚀 Prochaines Étapes (Optionnel)

1. **Ajouter Facebook OAuth**
   - Créer Facebook App
   - Décommenter resource dans Terraform
   - Ajouter callback URLs Facebook

2. **Configurer AWS SES pour emails**
   - Vérifier domaine email
   - Mettre à jour Cognito email configuration
   - Augmenter limite d'envoi

3. **Ajouter MFA (Multi-Factor Authentication)**
   - Configurer SMS ou TOTP
   - Mettre à jour Cognito User Pool

4. **Ajouter page de profil utilisateur**
   - Afficher infos utilisateur
   - Modifier nom, email
   - Changer mot de passe

5. **Implémenter rôles et permissions**
   - Ajouter attribut "role" dans Cognito
   - Admin vs Regular user
   - Protéger certaines routes par rôle

6. **Configurer password reset**
   - "Forgot password" flow
   - Reset par email

---

## 📝 Notes

**URLs importantes:**
- Frontend: `http://localhost:8090`
- Backend: `http://localhost:3000`
- Cognito Domain: `https://lyricscape-prod.auth.eu-north-1.amazoncognito.com`
- User Pool ID: `eu-north-1_e4j7eAxOe`
- Client ID: `nqvnmimojggjpuvfk0cldeu2t`

**Credentials Google OAuth:**
- Client ID: `27911664626-cmk9n0b53mnhnpk4261skiu32fn9looe.apps.googleusercontent.com`
- Client Secret: Stocké dans Terraform variables (ne pas commit!)

**AWS Region:** `eu-north-1` (Stockholm)
