# 🔐 Guide : Obtenir Instagram Access Token & Account ID

Ce guide vous explique comment obtenir les credentials nécessaires pour poster automatiquement sur Instagram.

## 📋 Prérequis

- ✅ Un compte **Instagram Business** ou **Creator**
- ✅ Une **Page Facebook** liée à votre compte Instagram
- ✅ Un compte **Facebook Developers**

---

## 🚀 Étape 1 : Convertir en Instagram Business Account

### Si votre compte n'est pas encore Business :

1. **Ouvrir l'app Instagram** sur mobile
2. Aller dans **Paramètres** → **Compte**
3. Cliquer sur **Passer à un compte professionnel**
4. Choisir **Entreprise** ou **Créateur**
5. **Lier à une Page Facebook** (créez-en une si nécessaire)

### Créer une Page Facebook (si nécessaire) :

1. Aller sur https://www.facebook.com/pages/create
2. Créer une page simple (nom, catégorie)
3. Dans Instagram → Paramètres → Compte → **Pages liées**
4. Connecter la page à votre compte Instagram

---

## 🎨 Étape 2 : Créer une Facebook App

### 1. Accéder à Facebook Developers

👉 https://developers.facebook.com/

- Connectez-vous avec votre compte Facebook
- Cliquez sur **"Mes apps"** (en haut à droite)
- Cliquez sur **"Créer une app"**

### 2. Configurer l'app

**Type d'app :** Sélectionnez **"Entreprise"** ou **"Autre"**

**Détails de l'app :**
- **Nom de l'app** : `Lyricscape Automation` (ou autre nom)
- **Email de contact** : Votre email
- **Compte Meta Business** : Créez-en un si demandé

Cliquez sur **"Créer l'app"**

### 3. Ajouter Instagram Graph API

Une fois l'app créée :

1. Dans le **Tableau de bord**
2. Cliquez sur **"Ajouter un produit"**
3. Trouvez **"Instagram Graph API"**
4. Cliquez sur **"Configurer"**

---

## 🔑 Étape 3 : Générer l'Access Token

### Méthode 1 : Via Graph API Explorer (Recommandé)

#### A. Accéder au Graph API Explorer

👉 https://developers.facebook.com/tools/explorer/

#### B. Configuration

1. **Sélectionner votre app** dans le menu déroulant (en haut)

2. **Générer un User Access Token** :
   - Cliquez sur **"Generate Access Token"**
   - Sélectionnez les **permissions** suivantes :
     - ✅ `instagram_basic`
     - ✅ `instagram_content_publish`
     - ✅ `pages_read_engagement`
     - ✅ `pages_show_list`
   
3. Cliquez sur **"Generate Access Token"**

4. **Autoriser** dans la popup Facebook

5. Vous obtenez un **Short-Lived Token** (expire en 1h)

#### C. Convertir en Long-Lived Token (60 jours)

**Option 1 : Via l'interface**

Dans Graph API Explorer :
- Cliquez sur l'icône **ℹ️** à côté de votre token
- Cliquez sur **"Extend Access Token"**
- Copiez le nouveau token (valable 60 jours)

**Option 2 : Via cURL**

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

Remplacez :
- `YOUR_APP_ID` : ID de votre app (Tableau de bord → Paramètres → Général)
- `YOUR_APP_SECRET` : Secret de l'app (même endroit, cliquez sur "Afficher")
- `YOUR_SHORT_LIVED_TOKEN` : Le token de 1h obtenu avant

**Réponse :**
```json
{
  "access_token": "LONG_LIVED_TOKEN_HERE",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

---

## 🆔 Étape 4 : Obtenir l'Instagram Account ID

### Méthode : Via Graph API Explorer

1. Retourner sur https://developers.facebook.com/tools/explorer/

2. Dans le champ de requête, entrer :
   ```
   me/accounts
   ```

3. Cliquer sur **"Submit"**

4. Vous verrez vos Pages Facebook :
   ```json
   {
     "data": [
       {
         "access_token": "PAGE_ACCESS_TOKEN",
         "category": "...",
         "name": "Votre Page",
         "id": "123456789012345"  ← ID de la page
       }
     ]
   }
   ```

5. **Copier l'ID de la page**, puis faire une nouvelle requête :
   ```
   123456789012345?fields=instagram_business_account
   ```

6. Résultat :
   ```json
   {
     "instagram_business_account": {
       "id": "17841401234567890"  ← INSTAGRAM ACCOUNT ID
     },
     "id": "123456789012345"
   }
   ```

**Copier** le `instagram_business_account.id` → C'est votre **Instagram Account ID** ! 🎉

---

## 🧪 Étape 5 : Tester vos credentials

### Test via cURL

```bash
# Tester l'access token
curl -X GET "https://graph.facebook.com/v18.0/17841401234567890?fields=username,followers_count&access_token=YOUR_ACCESS_TOKEN"
```

**Réponse attendue :**
```json
{
  "username": "votre_username",
  "followers_count": 1234,
  "id": "17841401234567890"
}
```

✅ Si ça fonctionne, vos credentials sont valides !

---

## 📝 Étape 6 : Configurer Terraform

Créer/éditer `terraform/terraform.tfvars` :

```hcl
aws_region = "us-east-1"
project_name = "lyricscape"
environment = "prod"

# VOS CREDENTIALS ICI 👇
instagram_access_token = "EAABwzLixnjYBO..."  # Long-lived token (60 jours)
instagram_account_id = "17841401234567890"     # Instagram Business Account ID
```

**⚠️ IMPORTANT :** Ne commitez JAMAIS ce fichier ! Il est déjà dans `.gitignore`.

---

## 🔄 Renouveler le Token (tous les 60 jours)

Les Long-Lived Tokens expirent après **60 jours**. Pour renouveler :

### Option 1 : Renouvellement automatique

Avant expiration (après ~50 jours), refaites la commande cURL :

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_CURRENT_LONG_LIVED_TOKEN"
```

### Option 2 : Via Facebook Business Settings

1. Aller sur https://business.facebook.com/settings/
2. **Paramètres système** → **Tokens d'accès**
3. Sélectionner votre app
4. Générer un nouveau token

### Mettre à jour dans Terraform

```powershell
cd terraform
terraform apply -var="instagram_access_token=NEW_TOKEN"
```

---

## 🛠️ Troubleshooting

### ❌ "Invalid OAuth access token"

**Causes :**
- Token expiré
- Permissions insuffisantes
- Compte Instagram non lié à la Page Facebook

**Solution :**
1. Vérifier que le compte Instagram est bien **Business**
2. Régénérer le token avec toutes les permissions
3. Tester avec cURL

### ❌ "instagram_business_account not found"

**Cause :** Le compte Instagram n'est pas lié à la Page Facebook

**Solution :**
1. Instagram mobile → Paramètres → Compte
2. **Pages liées** → Connecter votre Page Facebook
3. Réessayer la requête `me/accounts`

### ❌ "Error validating access token"

**Cause :** Token invalide ou app non autorisée

**Solution :**
1. Vérifier que l'app est en mode **"Live"** (pas Development)
2. Aller dans **Tableau de bord** → **Paramètres** → **Général**
3. Passer le **Mode app** à "Live"
4. Régénérer le token

---

## 📚 Ressources utiles

- 📖 **Instagram Graph API Docs** : https://developers.facebook.com/docs/instagram-api
- 🔧 **Graph API Explorer** : https://developers.facebook.com/tools/explorer/
- 💬 **Instagram Content Publishing** : https://developers.facebook.com/docs/instagram-api/guides/content-publishing
- 🎓 **Getting Started Guide** : https://developers.facebook.com/docs/instagram-api/getting-started

---

## ✅ Checklist finale

- [ ] Compte Instagram converti en Business
- [ ] Page Facebook créée et liée à Instagram
- [ ] Facebook App créée avec Instagram Graph API
- [ ] Access Token généré (long-lived, 60 jours)
- [ ] Instagram Account ID récupéré
- [ ] Credentials testés avec cURL
- [ ] `terraform/terraform.tfvars` configuré
- [ ] Prêt pour `terraform apply` ! 🚀

---

## 🎯 Prochaine étape

Une fois que vous avez vos credentials :

```powershell
cd terraform
terraform init
terraform plan
terraform apply
```

Bonne chance ! 🎉
