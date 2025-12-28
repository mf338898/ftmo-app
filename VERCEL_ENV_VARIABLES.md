# Variables d'environnement pour Vercel

## Variables requises

Vous devez configurer **3 variables d'environnement** dans Vercel pour que l'application fonctionne correctement.

### 1. FIREBASE_PROJECT_ID

**Valeur :** L'ID de votre projet Firebase

**Exemple :**
```
ftmo-journal-web
```

**Comment l'obtenir :**
- Allez sur [Firebase Console](https://console.firebase.google.com/)
- Sélectionnez votre projet
- L'ID du projet est visible en haut de la page ou dans les paramètres du projet

---

### 2. FIREBASE_CLIENT_EMAIL

**Valeur :** L'email du compte de service Firebase

**Exemple :**
```
firebase-adminsdk-xxxxx@ftmo-journal-web.iam.gserviceaccount.com
```

**Comment l'obtenir :**
1. Dans Firebase Console → Paramètres du projet (⚙️)
2. Onglet "Comptes de service" (Service accounts)
3. L'email est visible dans la section "Compte de service Firebase Admin SDK"
4. OU téléchargez le fichier JSON de la clé privée et cherchez le champ `client_email`

---

### 3. FIREBASE_PRIVATE_KEY

**Valeur :** La clé privée complète du compte de service Firebase

**Exemple :**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(plusieurs lignes de caractères)
...
-----END PRIVATE KEY-----
```

**Comment l'obtenir :**
1. Dans Firebase Console → Paramètres du projet (⚙️)
2. Onglet "Comptes de service" (Service accounts)
3. Cliquez sur "Générer une nouvelle clé privée" (Generate new private key)
4. Un fichier JSON sera téléchargé
5. Ouvrez ce fichier JSON
6. Copiez la valeur du champ `private_key` (tout le contenu entre les guillemets, incluant `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`)

⚠️ **IMPORTANT :** 
- Copiez la clé complète avec les lignes `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`
- Les `\n` dans le JSON seront automatiquement convertis en retours à la ligne par Vercel
- Ne modifiez pas la clé, copiez-la telle quelle

---

## Comment ajouter ces variables dans Vercel

### Méthode 1 : Via l'interface web (recommandé)

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous
2. Sélectionnez votre projet `ftmo-app`
3. Allez dans **Settings** (Paramètres)
4. Cliquez sur **Environment Variables** dans le menu de gauche
5. Ajoutez chaque variable une par une :
   - **Name** : `FIREBASE_PROJECT_ID`
   - **Value** : Votre ID de projet (ex: `ftmo-journal-web`)
   - **Environment** : Cochez toutes les cases (Production, Preview, Development)
   - Cliquez sur **Save**
   
   Répétez pour les 2 autres variables :
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

6. Après avoir ajouté toutes les variables, **redéployez votre application** :
   - Allez dans l'onglet **Deployments**
   - Cliquez sur les 3 points (⋯) du dernier déploiement
   - Cliquez sur **Redeploy**

### Méthode 2 : Via la CLI Vercel

```bash
cd ftmo-app
npx vercel env add FIREBASE_PROJECT_ID
# Collez la valeur quand demandé
# Sélectionnez les environnements (Production, Preview, Development)

npx vercel env add FIREBASE_CLIENT_EMAIL
# Collez la valeur quand demandé

npx vercel env add FIREBASE_PRIVATE_KEY
# Collez la valeur quand demandé
```

---

## Exemple de configuration complète

Voici un exemple de ce à quoi ressemblent les variables dans Vercel :

| Name | Value | Environment |
|------|-------|-------------|
| `FIREBASE_PROJECT_ID` | `ftmo-journal-web` | Production, Preview, Development |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-abc123@ftmo-journal-web.iam.gserviceaccount.com` | Production, Preview, Development |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n` | Production, Preview, Development |

---

## Vérification

Après avoir configuré les variables et redéployé :

1. Vérifiez que votre application se déploie sans erreur
2. Testez l'import de données dans l'interface
3. Vérifiez les logs de déploiement dans Vercel pour confirmer qu'il n'y a pas d'erreurs Firebase

---

## ⚠️ Sécurité

- Ne partagez jamais ces valeurs publiquement
- Ne commitez jamais ces variables dans Git (elles sont déjà dans `.gitignore`)
- Si une clé est compromise, régénérez-la immédiatement dans Firebase Console

