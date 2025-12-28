# FTMO Split Screen Dashboard

Application Next.js pour visualiser et analyser vos comptes et trades FTMO.

## 🚀 Démarrage rapide

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration Firebase (pour l'import réel)

**📖 Guide complet :** Voir [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) pour un guide détaillé étape par étape.

**Résumé rapide :**

1. Créez un fichier `.env.local` à la racine du projet :
   ```bash
   cp .env.example .env.local
   ```

2. Configurez Firebase :
   - Allez sur [Firebase Console](https://console.firebase.google.com/)
   - Créez un projet (ou utilisez `ftmo-journal-web`)
   - Activez Firestore Database
   - Allez dans Project Settings > Service Accounts
   - Générez une nouvelle clé privée (fichier JSON)
   - Copiez les valeurs dans `.env.local` :
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `client_email` → `FIREBASE_CLIENT_EMAIL`
     - `private_key` → `FIREBASE_PRIVATE_KEY` (avec guillemets)

3. Redémarrez le serveur après avoir créé `.env.local`

### 3. Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 📊 Fonctionnalités

### Mode Démonstration (sans Firebase)
- ✅ **Design et interface** : Fonctionne avec des données de démonstration
- ✅ **Visualisation** : Graphiques, tableaux, KPIs
- ✅ **Navigation** : Tous les composants sont interactifs

### Mode Complet (avec Firebase configuré)
- ✅ **Import CSV/XLSX** : Importez vos exports FTMO
- ✅ **Stockage Firestore** : Données persistées dans Firebase
- ✅ **Déduplication** : Évite les doublons par Ticket
- ✅ **Statistiques** : Calcul automatique des agrégats

## 📁 Format des fichiers d'import

L'application attend des fichiers CSV ou XLSX avec les colonnes suivantes (mapping par défaut FTMO) :

- `Ticket` : Identifiant unique du trade
- `Ouvrir` : Date/heure d'ouverture
- `Type` : buy/sell
- `Volume` : Taille du trade
- `Symbole` : Paire de devises (ex: EURUSD, XAUUSD)
- `Prix` : Prix d'ouverture
- `SL` : Stop Loss
- `TP` : Take Profit
- `Fermeture` : Date/heure de clôture
- `Prix.1` : Prix de clôture
- `Swap`, `Commissions`, `Profit`, `Pips` : Valeurs financières
- `Durée` : Durée en secondes

## 🎨 Design

L'interface reproduit le style FTMO avec :
- Palette de couleurs bleue FTMO (`#1f6ff2`)
- Layout split-screen (60/40 sur desktop)
- Graphiques interactifs (Recharts)
- Tableaux triables et filtrables (TanStack Table)
- Responsive (mobile/tablet/desktop)

## 🔧 Technologies

- **Next.js 16** (App Router)
- **TypeScript**
- **Firebase** (Firestore + Admin SDK)
- **Recharts** (Graphiques)
- **TanStack Table** (Tableaux)
- **Tailwind CSS** (Styling)
- **PapaParse** (CSV parsing)
- **XLSX** (Excel parsing)

## 📝 Notes

- L'application fonctionne en mode démo sans Firebase
- L'import réel nécessite les credentials Firebase Admin
- Les données sont stockées dans Firestore avec `userId: "demo-user"` par défaut
- Pour plusieurs utilisateurs, activez Firebase Auth (voir `src/lib/useAuth.ts`)
