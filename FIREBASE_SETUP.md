# Guide de Configuration Firebase

Ce guide vous explique comment configurer Firebase pour que l'application FTMO fonctionne avec l'import et le stockage des données.

## 📋 Prérequis

- Un compte Google (pour accéder à Firebase Console)
- Node.js installé (déjà fait si vous avez lancé l'app)

## 🚀 Étapes de Configuration

### Étape 1 : Créer un Projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"** (ou "Add project")
3. Donnez un nom à votre projet (ex: `ftmo-journal-web`)
4. Désactivez Google Analytics si vous ne voulez pas l'utiliser (optionnel)
5. Cliquez sur **"Créer le projet"**

### Étape 2 : Activer Firestore Database

1. Dans votre projet Firebase, allez dans **"Firestore Database"** dans le menu de gauche
2. Cliquez sur **"Créer une base de données"** (ou "Create database")
3. Choisissez **"Démarrer en mode test"** (pour le développement)
4. Sélectionnez une région (ex: `europe-west` pour la France)
5. Cliquez sur **"Activer"**

### Étape 3 : Créer un Compte de Service (Service Account)

1. Dans Firebase Console, cliquez sur l'icône ⚙️ (Paramètres) en haut à gauche
2. Allez dans **"Paramètres du projet"** (ou "Project settings")
3. Cliquez sur l'onglet **"Comptes de service"** (ou "Service accounts")
4. Cliquez sur **"Générer une nouvelle clé privée"** (ou "Generate new private key")
5. Une boîte de dialogue s'ouvre → Cliquez sur **"Générer la clé"** (ou "Generate key")
6. Un fichier JSON sera téléchargé (ex: `ftmo-journal-web-xxxxx.json`)

⚠️ **IMPORTANT** : Gardez ce fichier secret ! Ne le commitez jamais dans Git.

### Étape 4 : Extraire les Informations du Fichier JSON

Ouvrez le fichier JSON téléchargé. Il ressemble à ceci :

```json
{
  "type": "service_account",
  "project_id": "ftmo-journal-web",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@ftmo-journal-web.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "xxxxx"
}
```

Vous avez besoin de 3 valeurs :
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

### Étape 5 : Créer le Fichier .env.local

1. Dans le dossier `ftmo-app/`, créez un fichier nommé `.env.local`
2. Ajoutez les variables suivantes :

```env
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_CLIENT_EMAIL=votre-email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Exemple concret :**

```env
FIREBASE_PROJECT_ID=ftmo-journal-web
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@ftmo-journal-web.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

⚠️ **IMPORTANT** :
- La `FIREBASE_PRIVATE_KEY` doit être entre guillemets `"`
- Les `\n` dans la clé privée doivent être préservés (ils représentent les retours à la ligne)
- Ne mettez PAS d'espaces avant ou après les `=`

### Étape 6 : Vérifier que .env.local est dans .gitignore

Assurez-vous que `.env.local` est dans le fichier `.gitignore` pour ne pas le commiter :

```bash
# Vérifiez que .gitignore contient :
.env.local
.env*.local
```

### Étape 7 : Redémarrer le Serveur

Après avoir créé le fichier `.env.local`, redémarrez le serveur Next.js :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez :
cd ftmo-app
npm run dev
```

### Étape 8 : Tester l'Import

1. Ouvrez http://localhost:3000
2. Cliquez sur "Choisir un fichier" dans le panneau d'import
3. Sélectionnez un fichier CSV ou XLSX FTMO
4. Cliquez sur "Importer"
5. Vous devriez voir "Import terminé avec succès !"

## 🔍 Vérification

Pour vérifier que Firebase est bien configuré :

1. **Vérifiez les logs du serveur** : Vous ne devriez plus voir d'erreurs "Firebase admin credentials are missing"
2. **Vérifiez Firestore Console** : Allez dans Firestore Database → Vous devriez voir des collections `accounts`, `trades`, `imports`
3. **Testez l'import** : Importez un fichier et vérifiez que les données apparaissent dans l'interface

## 🐛 Dépannage

### Erreur : "Firebase admin credentials are missing"

- Vérifiez que le fichier `.env.local` existe dans `ftmo-app/`
- Vérifiez que les 3 variables sont présentes et correctes
- Vérifiez que la `FIREBASE_PRIVATE_KEY` est entre guillemets
- Redémarrez le serveur après avoir créé/modifié `.env.local`

### Erreur : "Invalid credentials"

- Vérifiez que vous avez copié la clé privée complète (de `-----BEGIN` à `-----END`)
- Vérifiez que les `\n` sont présents dans la clé privée
- Vérifiez que l'email du compte de service est correct

### Erreur : "Permission denied"

- Vérifiez que Firestore est activé dans Firebase Console
- Vérifiez que vous avez créé la base de données en mode test (pour le développement)
- Si vous avez des règles de sécurité strictes, vous devrez peut-être les ajuster dans Firestore → Règles

## 📚 Ressources

- [Documentation Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Documentation Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Console](https://console.firebase.google.com/)

## 🔒 Sécurité

⚠️ **NE JAMAIS** :
- Commiter le fichier `.env.local` dans Git
- Partager vos credentials Firebase publiquement
- Utiliser les credentials de production en développement

✅ **TOUJOURS** :
- Garder `.env.local` dans `.gitignore`
- Utiliser des comptes de service séparés pour dev/prod
- Régénérer les clés si elles sont compromises

