# 🧪 Guide de Test en Local

## ✅ Ce qui FONCTIONNE en local (sans Firebase)

### 1. **Design et Interface** ✅
- Tous les composants visuels s'affichent
- Graphiques, tableaux, KPIs
- Navigation et interactions
- **Données de démonstration** pré-chargées

### 2. **Parsing des fichiers** ✅
- Le code peut lire CSV et XLSX
- Détection automatique du format
- Mapping des colonnes FTMO

## ⚠️ Ce qui nécessite Firebase

### 1. **Import réel des données** ⚠️
- L'import **nécessite** Firebase Admin configuré
- Sans Firebase : l'import échouera avec une erreur
- Les données ne seront **pas sauvegardées**

### 2. **Pourquoi ?**
L'import passe par une API route (`/api/ftmo/import`) qui :
1. Parse votre fichier CSV/XLSX ✅ (fonctionne)
2. Vérifie les doublons dans Firestore ❌ (nécessite Firebase)
3. Sauvegarde dans Firestore ❌ (nécessite Firebase)
4. Calcule les statistiques ❌ (nécessite Firebase)

## 🎯 Comment tester le design maintenant

1. **Lancez l'app** :
   ```bash
   cd ftmo-app
   npm run dev
   ```

2. **Ouvrez** : http://localhost:3000

3. **Vous verrez** :
   - Interface complète avec données de démo
   - Graphiques interactifs
   - Tableaux avec filtres
   - Tous les KPIs

4. **Pour tester l'import** :
   - Cliquez sur "Importer"
   - Sélectionnez un fichier CSV/XLSX
   - ⚠️ **L'import échouera** sans Firebase configuré
   - Mais vous verrez l'interface d'import fonctionner

## 🔧 Pour activer l'import réel

1. **Créez** `.env.local` dans `ftmo-app/` :
   ```bash
   FIREBASE_PROJECT_ID=ftmo-journal-web
   FIREBASE_CLIENT_EMAIL=votre-email@ftmo-journal-web.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

2. **Obtenez les credentials** :
   - Firebase Console > Project Settings > Service Accounts
   - Cliquez "Generate new private key"
   - Copiez les valeurs dans `.env.local`

3. **Redémarrez** l'app :
   ```bash
   npm run dev
   ```

4. **Testez l'import** : L'import fonctionnera maintenant !

## 📊 Résumé

| Fonctionnalité | Sans Firebase | Avec Firebase |
|----------------|---------------|---------------|
| Design/Interface | ✅ Oui | ✅ Oui |
| Graphiques | ✅ Oui (démo) | ✅ Oui (réel) |
| Tableaux | ✅ Oui (démo) | ✅ Oui (réel) |
| Import CSV/XLSX | ❌ Non | ✅ Oui |
| Sauvegarde données | ❌ Non | ✅ Oui |
| Statistiques | ✅ Oui (démo) | ✅ Oui (réel) |

