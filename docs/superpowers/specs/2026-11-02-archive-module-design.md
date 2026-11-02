# Module Archives & Clusters de Documents — Spécification & Conception Technique

**Date :** 2026-11-02  
**Statut :** Validé après revue technique  
**Projet :** ERP Documentaire Travaux Publics & Concassage (Régime Réel)  

---

## 1. Contexte & Intention (The Why)

L'ERP actuel organise les documents autour d'entités métiers strictes (Clients, Fournisseurs, Matériel & Engins, Personnel, Trésorerie, Fiscalité). Dans le fonctionnement réel d'une entreprise de travaux publics et d'exploitation de carrière en Algérie, une multitude de documents cruciaux n'appartiennent pas directement à un client ou un engin particulier :
- **Cahiers des charges & marchés publics / privés** (appels d'offres DTP, DRE, concassage de granulat, conventions de sous-traitance).
- **Documents bancaires & garanties de marché** (cautions de soumission, cautions de bonne exécution, mainlevées, lignes de crédit d'exploitation, conventions de découvert).
- **Importations & dédouanement** (dossiers d'importation de pièces de rechange concasseur/crible, avis d'arrivée en douane, déclarations D10 libres).
- **Actes administratifs & réglementaires** (autorisations d'exploitation de carrière, arrêtés de wilaya, délibérations, baux de concession minière).

L'utilisateur souhaite un module **"08 · Archives"** dans le menu principal, agissant comme un coffre-fort documentaire où il peut librement créer, hiérarchiser et organiser ses documents au moyen de **clusters (dossiers)** et **sous-clusters (sous-dossiers)** personnalisés, avec une recherche instantanée et sécurisée.

---

## 2. Objectifs, Non-Objectifs & Anti-Objectifs

### Objectifs (Goals)
1. **Entrée de navigation dédiée :** Ajouter `08 · Archives` dans la barre latérale de navigation (`src/components/layout/sidebar.tsx`) avec l'icône `Archive` de `lucide-react`.
2. **Hiérarchie personnalisée (Clusters & Sous-Clusters) :**
   - Création libre de clusters racine (ex: *Cahiers des charges*, *Banques & Financement*, *Importations*).
   - Création libre de sous-clusters imbriqués à l'intérieur de n'importe quel dossier (ex: *Banques > Cautions & Garanties*).
   - Possibilité de renommer et supprimer les clusters et sous-clusters.
3. **Règle stricte de sécurité à la suppression (Guardrail) :**
   - **Interdiction absolue** de supprimer un cluster ou sous-cluster s'il contient encore des documents ou des sous-dossiers.
   - L'utilisateur doit vider ou déplacer le contenu avant de pouvoir effacer le dossier. Message d'erreur explicite en français : *"Impossible de supprimer ce dossier : il contient encore des documents ou sous-dossiers. Veuillez d'abord les vider ou les déplacer."*
4. **Déplacement de documents (Reclassement) :**
   - Possibilité de déplacer n'importe quel document vers un autre cluster ou sous-cluster en 1 clic (action "Déplacer" avec sélecteur de dossier cible).
5. **Gestion documentaire complète :**
   - Dépôt de fichiers PDF dans n'importe quel cluster ou sous-cluster.
   - Métadonnées : Fichier (PDF, MinIO), Titre (obligatoire), Date d'émission (obligatoire), Date d'échéance/validité (optionnel), Montant en DZD (optionnel), Emplacement physique (optionnel), Notes (optionnel).
   - Visualisation directe du PDF dans un nouvel onglet via URL signée MinIO, téléchargement, et suppression avec confirmation.
6. **Recherche & Filtrage :**
   - Barre de filtre rapide au sein du dossier actif (par titre, mot-clé, date).
   - Intégration dans le moteur de recherche global 3-axes (`/recherche`) avec filtre de module `ARCHIVES`.
7. **Interface Industrielle :**
   - Conforme à la charte graphique existante (charcoal `#0f172a` / `#1e293b`, accents ambre `#f59e0b`, badges techniques, typographie claire).

### Non-Objectifs (Out of Scope)
- Reconnaissance optique de caractères (OCR) ou indexation du texte brut à l'intérieur des fichiers PDF (la recherche s'effectue sur les métadonnées et titres).
- Glisser-déposer de dossiers entiers pour déplacer des arbres complexes (déplacement d'arborescence non requis).
- Alertes d'échéance obligatoires sur le tableau de bord pour les archives (les alertes du tableau de bord restent réservées aux obligations réglementaires critiques : G50, CNAS, contrôle technique, assurances engins).

### Anti-Objectifs
- **Ne jamais autoriser la suppression en cascade accidentelle** d'un dossier contenant des documents.
- **Ne pas enfermer les documents d'archives dans une énumération rigide** de types de documents : l'utilisateur nomme et classe ses dossiers comme il l'entend.

---

## 3. Architecture des Données (Prisma Schema)

### Modèle `ArchiveCluster`
```prisma
model ArchiveCluster {
  id          String           @id @default(cuid())
  name        String
  description String?
  parentId    String?
  parent      ArchiveCluster?  @relation("ClusterHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children    ArchiveCluster[] @relation("ClusterHierarchy")
  documents   Document[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([parentId])
  @@index([name])
}
```

### Évolution du Modèle `Document`
- Ajout de la valeur `ARCHIVES` dans l'enum `Module`.
- Ajout de la valeur `ARCHIVE_DOCUMENT` dans l'enum `DocumentType`.
- Ajout de la clé étrangère optionnelle `archiveClusterId` :
```prisma
archiveClusterId String?
archiveCluster   ArchiveCluster? @relation(fields: [archiveClusterId], references: [id], onDelete: Restrict)
```
- Indexation sur `archiveClusterId`.

---

## 4. API & Endpoints

### 1. `GET /api/archive/clusters`
- Paramètre optionnel `parentId` :
  - `parentId=root` ou omis : renvoie les clusters racine avec le décompte récursif des documents et sous-dossiers, ainsi que la date du document le plus récent.
  - `parentId=<id>` : renvoie les enfants directs d'un cluster donné.
- Paramètre optionnel `tree=true` : renvoie l'arborescence complète (utilisé par le sélecteur "Déplacer vers...").

### 2. `POST /api/archive/clusters`
- Payload : `{ name: string, parentId?: string | null, description?: string }`
- Validation : `name` non vide (min 1, max 100 caractères).
- Réponse : cluster créé (`201 Created`).

### 3. `PATCH /api/archive/clusters/[id]`
- Payload : `{ name?: string, description?: string }`
- Permet de renommer ou mettre à jour la description d'un cluster.

### 4. `DELETE /api/archive/clusters/[id]`
- **Règle de sécurité stricte :**
  - Vérifier si `children.length > 0` ou `documents.length > 0`.
  - Si non vide, retourner `400 Bad Request` avec :
    `{ error: "Impossible de supprimer ce dossier : il contient encore des documents ou sous-dossiers. Veuillez d'abord les vider ou les déplacer." }`
  - Si vide, supprimer le cluster et retourner `200 OK`.

### 5. `GET /api/archive/clusters/[id]`
- Renvoie les détails complets du cluster :
  - Métadonnées du cluster.
  - Fil d'Ariane ordonné (tableau des ancêtres de la racine au dossier actuel).
  - Sous-dossiers directs avec décomptes.
  - Documents rattachés à ce cluster (`documents` triés par date d'émission descendante).

### 6. `POST /api/archive/documents`
- Téléversement d'un document PDF via `multipart/form-data`.
- Champs : `file`, `title`, `issueDate`, `archiveClusterId`, `dueDate` (optionnel), `amount` (optionnel), `physicalLocation` (optionnel), `notes` (optionnel).
- Stockage MinIO sous la clé `archives/{timestamp}-{randomId}.pdf`.
- Création de l'enregistrement `Document` (`module: ARCHIVES`, `documentType: ARCHIVE_DOCUMENT`, `archiveClusterId`).

### 7. `PATCH /api/archive/documents/[id]/move`
- Payload : `{ targetClusterId: string }`
- Vérification de l'existence du cluster cible.
- Mise à jour de `archiveClusterId`.
- Le fichier MinIO reste intègre à sa clé d'origine sans copie inutile.

### 8. `DELETE /api/archive/documents/[id]`
- Suppression du document en base et suppression physique de l'objet dans MinIO.

### 9. Intégration `GET /api/search`
- Prise en charge du paramètre `module=ARCHIVES`.
- Recherche textuelle dans les titres de documents d'archives et filtrage par période d'émission.
- Inclusion du nom du cluster d'archive dans le résultat pour identification immédiate.

---

## 5. Interface Utilisateur (UX)

### 1. Navigation Principale
- Entrée statique dans `src/components/layout/sidebar.tsx` : `08 · Archives` (`/archives`) avec l'icône `Archive`.

### 2. Page d'Accueil des Archives (`/archives`) — Vue Classeur
- En-tête : Titre "Archives & Dossiers", description, bouton d'action `+ Nouveau Dossier`.
- Grille des clusters racine (cartes classeurs) :
  - Icône de dossier colorée.
  - Nom du cluster.
  - Décompte total des documents (agrégé sur toute la descendance) et nombre de sous-dossiers.
  - Date du document le plus récent (ou *"Aucun document"* si vide).
  - Menu contextuel : Renommer, Supprimer (protégé si non vide).

### 3. Page Intérieure d'un Dossier (`/archives/[clusterId]`)
- **Fil d'Ariane dynamique (Breadcrumbs) :** `08 · Archives / [Dossier Parent] / [Dossier Actuel]` permettant de remonter d'un clic à n'importe quel échelon.
- **Barre d'actions :**
  - `+ Nouveau Sous-Dossier` (dialogue de création).
  - `+ Déposer un document` (dialogue d'upload PDF).
  - `Paramètres du dossier` (renommer ou supprimer).
- **Section Sous-Dossiers :** Grille des dossiers enfants directs avec indicateurs.
- **Section Documents :**
  - Tableau/cartes avec Titre, Notes/Référence, Date d'émission, Échéance (si renseignée), Montant en DZD (si renseigné), Emplacement physique.
  - Actions sur chaque ligne :
    - `Voir PDF` (ouverture dans un nouvel onglet via URL signée).
    - `Déplacer` (dialogue avec arbre des dossiers pour reclassement instantané).
    - `Supprimer` (confirmation obligatoire avec suppression MinIO).

### 4. Composants Modaux
- `CreateClusterModal` : Saisie du nom et description.
- `UploadArchiveDocumentModal` : Sélecteur de fichier PDF, titre, date d'émission et champs optionnels.
- `MoveDocumentModal` : Arborescence des clusters pour choisir la nouvelle destination.
- `DeleteConfirmDialog` : Message explicatif clair refusant la suppression si le dossier n'est pas vide.

---

## 6. Décisions d'Ingénierie Arrêtées (Builder Calls)

1. **Agrégation récursive des compteurs :** Les cartes racine calculent le décompte cumulé de tous les documents du sous-arbre pour donner une vue représentative du volume de chaque pôle d'archives.
2. **Clés MinIO immuables :** Lors du déplacement d'un document d'un cluster à un autre, seule la clé étrangère en base (`archiveClusterId`) est mise à jour. L'objet dans MinIO conserve sa clé immuable pour une performance instantanée à coût nul sur le stockage.
3. **Isolation du tableau de bord :** `src/app/api/dashboard/deadlines/route.ts` exclut expressément `module: 'ARCHIVES'` afin que les échéances informatives des archives n'encombrent pas le bandeau des alertes réglementaires critiques (G50, CNAS, contrôles techniques engins).
4. **Sidebar statique & légère :** L'élément de menu `08 · Archives` s'intègre comme élément statique dans `sidebar.tsx`, garantissant un temps de chargement immédiat et préservant les tests de structure de navigation.

---

## 7. Contraintes Globales & Respect du Système

- **100% Français :** Terminologie administrative algérienne et libellés professionnels soignés.
- **Intégrité de la base :** Schéma et relations Prisma stricts avec `onDelete: Restrict` pour empêcher toute perte de données accidentelle.
- **Qualité des tests :** Mise à jour du test de layout `src/components/layout/layout.test.tsx` (9 éléments de navigation) et tests unitaires / d'intégration complets pour les nouveaux endpoints et composants.
