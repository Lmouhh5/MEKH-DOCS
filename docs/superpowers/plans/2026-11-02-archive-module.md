# Module Archives & Clusters de Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an enterprise Archive module (`08 · Archives`) featuring a hierarchical folder/cluster system, document upload/storage in MinIO, safety-locked deletion, inter-cluster document relocation, global search integration, and an industrial-themed UI.

**Architecture:** Prisma schema extended with an `ArchiveCluster` self-referential tree model and an `archiveClusterId` foreign key on `Document`. Next.js API route handlers manage CRUD operations, recursive subtree counts, and MinIO uploads, while Client Components render folder cards, breadcrumb trees, and document tables styled with the established charcoal/amber design tokens.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma ORM, PostgreSQL, MinIO S3 SDK, Tailwind CSS, Shadcn UI, Jest / React Testing Library.

**Spec:** [`docs/superpowers/specs/2026-11-02-archive-module-design.md`](file:///c:/Users/HP%20VICTUS/Desktop/system%20V2/docs/superpowers/specs/2026-11-02-archive-module-design.md)

## Global Constraints

- 100% French user interface with Algerian administrative and business terminology.
- Preserve zero lint errors (`npm run lint`), zero TypeScript errors (`npx tsc --noEmit`), and all 306 existing tests passing.
- Strictly prevent deletion of non-empty clusters or sub-clusters (returns 400 Bad Request with explicit French message).
- MinIO storage keys are immutable upon upload; moving a document between clusters updates only the database foreign key (`archiveClusterId`).
- Dashboard regulatory deadline alerts must exclude `ARCHIVES` documents.

## Review Focus

1. **Attempting to delete a cluster with documents or sub-folders:** Returns HTTP 400 with French guardrail message and does not alter the database.
2. **Moving a document to another cluster:** Verifies target cluster exists, updates `archiveClusterId`, and leaves MinIO object intact.
3. **Empty cluster / sub-cluster deletion:** Successfully deletes the empty cluster and returns HTTP 200.
4. **Recursive count on root cluster cards:** Correctly sums documents across all descendant sub-clusters, not just direct children.
5. **Global Search (`/recherche`):** Filtering by `module=ARCHIVES` retrieves archive documents and returns their cluster name.

---

### Task 1: Database Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma:21-35, 114-145`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: PostgreSQL connection via Prisma
- Produces: `ArchiveCluster` model, updated `Module` enum with `ARCHIVES`, `DocumentType` enum with `ARCHIVE_DOCUMENT`, and `Document.archiveClusterId` relation

- [ ] **Step 1: Write the failing schema integration test**

```typescript
// src/lib/db.test.ts
import db from './db'

describe('Archive schema extensions', () => {
  it('supports ArchiveCluster creation and hierarchy', async () => {
    const parent = await db.archiveCluster.create({
      data: { name: 'Dossiers Marchés Test' },
    })
    expect(parent.id).toBeDefined()

    const child = await db.archiveCluster.create({
      data: { name: 'Sous-Dossier 2026', parentId: parent.id },
    })
    expect(child.parentId).toBe(parent.id)

    // Clean up
    await db.archiveCluster.delete({ where: { id: child.id } })
    await db.archiveCluster.delete({ where: { id: parent.id } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/db.test.ts`  
Expected: FAIL with `db.archiveCluster is undefined` or schema error.

- [ ] **Step 3: Update `prisma/schema.prisma` and run `npx prisma db push`**

1. In `prisma/schema.prisma`:
   - Add `ARCHIVES` to `enum Module`.
   - Add `ARCHIVE_DOCUMENT` to `enum DocumentType`.
   - Add `ArchiveCluster` model:
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
   - In `model Document`, add:
     ```prisma
     archiveClusterId String?
     archiveCluster   ArchiveCluster? @relation(fields: [archiveClusterId], references: [id], onDelete: Restrict)
     ```
   - Add `@@index([archiveClusterId])` to `model Document`.
2. Generate client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/db.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/db.test.ts
git commit -m "feat(db): add ArchiveCluster model and Document relation"
```

---

### Task 2: Constants, Types, and Sidebar Layout Update

**Files:**
- Modify: `src/lib/constants.ts:1-65`
- Modify: `src/lib/types.ts`
- Modify: `src/components/layout/sidebar.tsx:18-65`
- Modify: `src/components/layout/layout.test.tsx`

**Interfaces:**
- Consumes: `Module` and `DocumentType` enums
- Produces: `MODULE_LABELS.ARCHIVES = 'Archives'`, `DOCUMENT_TYPES_BY_MODULE.ARCHIVES = ['ARCHIVE_DOCUMENT']`, `NAV_ITEMS` containing 9 elements (including `/archives`)

- [ ] **Step 1: Write failing layout and constant tests**

In `src/components/layout/layout.test.tsx`, add assertions:
```typescript
it('contains 9 navigation items including Archives', () => {
  render(<Sidebar />)
  expect(NAV_ITEMS).toHaveLength(9)
  expect(screen.getByText('Archives')).toBeInTheDocument()
})

it('generates breadcrumbs for /archives and subpaths', () => {
  expect(getBreadcrumbs('/archives')).toEqual([
    { label: 'ERP', href: '/' },
    { label: 'Archives' },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/layout/layout.test.tsx`  
Expected: FAIL (NAV_ITEMS has length 8, 'Archives' not found).

- [ ] **Step 3: Update constants, types, and sidebar**

1. In `src/lib/constants.ts`:
   - Add `ARCHIVES: 'Archives'` to `Module`.
   - Add `ARCHIVE_DOCUMENT: "Document d'archive"` to `DocumentType`.
   - Add `ARCHIVES: ['ARCHIVE_DOCUMENT']` to `DOCUMENT_TYPES_BY_MODULE`.
2. In `src/lib/types.ts`:
   - Export type `ArchiveClusterWithCounts`:
     ```typescript
     export interface ArchiveClusterWithCounts {
       id: string
       name: string
       description?: string | null
       parentId?: string | null
       subClustersCount: number
       totalDocumentsCount: number
       lastDocumentDate?: string | null
       createdAt: string
       updatedAt: string
     }
     ```
3. In `src/components/layout/sidebar.tsx`:
   - Import `Archive` icon from `lucide-react`.
   - Add to `NAV_ITEMS`:
     ```typescript
     {
       label: 'Archives',
       href: '/archives',
       icon: Archive,
     },
     ```
4. In `src/components/layout/top-bar.tsx`:
   - Add case for `archives` in `getBreadcrumbs` resolving to `'Archives'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/layout/layout.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/lib/types.ts src/components/layout/sidebar.tsx src/components/layout/top-bar.tsx src/components/layout/layout.test.tsx
git commit -m "feat(layout): add Archives navigation item and breadcrumbs"
```

---

### Task 3: Archive Clusters API Routes

**Files:**
- Create: `src/app/api/archive/clusters/route.ts`
- Create: `src/app/api/archive/clusters/[id]/route.ts`
- Create: `src/app/api/archive/clusters/clusters.test.ts`

**Interfaces:**
- Consumes: NextAuth session, Prisma `ArchiveCluster` model
- Produces:
  - `GET /api/archive/clusters`: lists root clusters with recursive counts or child clusters
  - `POST /api/archive/clusters`: creates a new cluster
  - `GET /api/archive/clusters/[id]`: returns cluster detail with breadcrumbs, subclusters, and documents
  - `PATCH /api/archive/clusters/[id]`: renames cluster
  - `DELETE /api/archive/clusters/[id]`: safely deletes empty cluster or rejects non-empty with 400

- [ ] **Step 1: Write failing API route unit/integration tests**

```typescript
// src/app/api/archive/clusters/clusters.test.ts
import { GET as getClusters, POST as createCluster } from './route'
import { GET as getCluster, DELETE as deleteCluster, PATCH as updateCluster } from './[id]/route'

describe('Archive Clusters API', () => {
  it('blocks deletion of a non-empty cluster with 400 Bad Request', async () => {
    // Mock or seed cluster with 1 document
    // Call deleteCluster(req, { params: { id: 'cluster-with-doc' } })
    // Expect response status === 400 and error message containing "Veuillez d'abord les vider"
  })

  it('allows deletion of an empty cluster with 200 OK', async () => {
    // Seed empty cluster, call deleteCluster, expect status === 200
  })

  it('returns recursive document count for root clusters', async () => {
    // Seed root -> child -> doc, call getClusters
    // Expect totalDocumentsCount === 1 on the root cluster
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/api/archive/clusters/clusters.test.ts`  
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement route handlers**

1. In `src/app/api/archive/clusters/route.ts`:
   - Authenticate with `getServerSession(authOptions)`.
   - `GET`: Parse `searchParams.get('parentId')` and `tree=true`. If `parentId === 'root'` or omitted, fetch root clusters. Use a recursive SQL helper or tree traverse to compute `totalDocumentsCount` and `lastDocumentDate` across all descendants.
   - `POST`: Validate `{ name: z.string().trim().min(1).max(100), parentId: z.string().optional().nullable(), description: z.string().optional().nullable() }`. Create via `db.archiveCluster.create`.
2. In `src/app/api/archive/clusters/[id]/route.ts`:
   - `GET`: Fetch cluster by `id`. Include direct `children` with `_count.documents` and `_count.children`. Include `documents` with signed URLs for MinIO file keys. Traverse `parent` recursively to build the breadcrumb chain `[{ id, name }]`.
   - `PATCH`: Validate `{ name, description }` and update cluster.
   - `DELETE`: Query cluster with `children: { select: { id: true } }` and `documents: { select: { id: true } }`. If `children.length > 0` or `documents.length > 0`, return `NextResponse.json({ error: "Impossible de supprimer ce dossier : il contient encore des documents ou sous-dossiers. Veuillez d'abord les vider ou les déplacer." }, { status: 400 })`. Otherwise, call `db.archiveCluster.delete` and return `{ success: true }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/api/archive/clusters/clusters.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/archive/clusters/
git commit -m "feat(api): add archive clusters endpoints with safe deletion guardrail"
```

---

### Task 4: Archive Documents API (Upload, Move, Delete)

**Files:**
- Create: `src/app/api/archive/documents/route.ts`
- Create: `src/app/api/archive/documents/[id]/move/route.ts`
- Create: `src/app/api/archive/documents/[id]/route.ts`
- Create: `src/app/api/archive/documents/documents.test.ts`

**Interfaces:**
- Consumes: NextAuth session, MinIO client (`uploadFile`, `deleteFile`, `generateKey`), Prisma `Document` model
- Produces:
  - `POST /api/archive/documents`: uploads PDF to MinIO and inserts `Document` with `archiveClusterId`
  - `PATCH /api/archive/documents/[id]/move`: updates `archiveClusterId` without altering MinIO object
  - `DELETE /api/archive/documents/[id]`: deletes database row and removes file from MinIO

- [ ] **Step 1: Write failing documents API tests**

```typescript
// src/app/api/archive/documents/documents.test.ts
import { POST as uploadDoc } from './route'
import { PATCH as moveDoc } from './[id]/move/route'
import { DELETE as deleteDoc } from './[id]/route'

describe('Archive Documents API', () => {
  it('moves document to another cluster without changing fileKey', async () => {
    // Test moving document from clusterA to clusterB
    // Verify document.archiveClusterId is clusterB and fileKey is unchanged
  })

  it('deletes document and triggers MinIO file removal', async () => {
    // Test document deletion calls minio deleteFile
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/api/archive/documents/documents.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement archive document route handlers**

1. In `src/app/api/archive/documents/route.ts`:
   - Authenticate session.
   - Parse `formData`: `file` (PDF only, max 50MB), `title`, `issueDate`, `archiveClusterId`, `dueDate`, `amount`, `physicalLocation`, `notes`.
   - Verify `archiveClusterId` exists in DB.
   - Upload buffer to MinIO: key = `generateKey('archives', file.name)`.
   - Create document in Prisma:
     ```typescript
     module: 'ARCHIVES',
     documentType: 'ARCHIVE_DOCUMENT',
     archiveClusterId,
     fileKey,
     title,
     issueDate: new Date(issueDate),
     dueDate: dueDate ? new Date(dueDate) : null,
     amount: amount ? new Prisma.Decimal(amount) : null,
     physicalLocation,
     notes
     ```
2. In `src/app/api/archive/documents/[id]/move/route.ts`:
   - Authenticate session.
   - Validate body `{ targetClusterId: string }`.
   - Verify `targetClusterId` exists.
   - `db.document.update({ where: { id }, data: { archiveClusterId: targetClusterId } })`.
   - Return updated document.
3. In `src/app/api/archive/documents/[id]/route.ts`:
   - Authenticate session.
   - Fetch document, delete MinIO object `deleteFile(doc.fileKey)`.
   - Delete document from database: `db.document.delete({ where: { id } })`.
   - Return `{ success: true }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/api/archive/documents/documents.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/archive/documents/
git commit -m "feat(api): add archive document upload, move, and delete handlers"
```

---

### Task 5: Global Search & Dashboard Isolation

**Files:**
- Modify: `src/app/api/search/route.ts`
- Modify: `src/app/api/dashboard/deadlines/route.ts`
- Modify: `src/components/search/search-filters.tsx`
- Modify: `src/components/search/search.test.tsx`

**Interfaces:**
- Consumes: `Module.ARCHIVES`
- Produces: Search results containing archive documents with cluster badge; dashboard deadlines ticker excluding archive documents

- [ ] **Step 1: Write failing search & dashboard integration test**

In `src/components/search/search.test.tsx`, add:
```typescript
it('allows filtering by ARCHIVES module and displays archive cluster info', async () => {
  // Mock search query with module=ARCHIVES
  // Assert archive document with cluster name appears in results
})
```
In `src/components/dashboard/dashboard.test.tsx`:
```typescript
it('does not include archive documents in executive dashboard deadline alerts', async () => {
  // Verify deadlines query contains module: { not: 'ARCHIVES' }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/search/search.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Update Search and Dashboard API routes**

1. In `src/app/api/search/route.ts`:
   - Add `include: { ..., archiveCluster: { select: { id: true, name: true } } }`.
   - When mapping items, if `doc.module === 'ARCHIVES'`, display `entityName = doc.archiveCluster?.name || 'Archive'`.
2. In `src/app/api/dashboard/deadlines/route.ts`:
   - Add condition to `where`: `module: { not: 'ARCHIVES' }`.
3. In `src/components/search/search-filters.tsx`:
   - Ensure the module dropdown includes `ARCHIVES` ("Archives").

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/search/search.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/search/route.ts src/app/api/dashboard/deadlines/route.ts src/components/search/
git commit -m "feat(search): index archive documents and exclude them from regulatory dashboard ticker"
```

---

### Task 6: Archive Dialog Components (Create, Upload, Move, Delete)

**Files:**
- Create: `src/components/archives/create-cluster-dialog.tsx`
- Create: `src/components/archives/upload-archive-dialog.tsx`
- Create: `src/components/archives/move-document-dialog.tsx`
- Create: `src/components/archives/delete-cluster-dialog.tsx`
- Create: `src/components/archives/archive-dialogs.test.tsx`

**Interfaces:**
- Consumes: UI Primitives (`Dialog`, `Button`, `Input`, `Label`, `Textarea`, `toast`), API routes
- Produces: Reusable modals for cluster creation, document upload, folder reassignment, and safe deletion confirmation

- [ ] **Step 1: Write failing tests for dialog components**

```typescript
// src/components/archives/archive-dialogs.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { CreateClusterDialog } from './create-cluster-dialog'
import { MoveDocumentDialog } from './move-document-dialog'

describe('Archive Dialogs', () => {
  it('renders CreateClusterDialog and submits cluster name', () => {
    const onSubmit = jest.fn()
    render(<CreateClusterDialog open={true} onOpenChange={jest.fn()} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/Nom du dossier/i), { target: { value: 'Marchés 2026' } })
    fireEvent.click(screen.getByRole('button', { name: /Créer le dossier/i }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Marchés 2026', description: '' })
  })

  it('renders MoveDocumentDialog with cluster selection options', () => {
    // Render MoveDocumentDialog with mock cluster tree
    // Assert target cluster can be selected and confirmed
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/archives/archive-dialogs.test.tsx`  
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement dialog components**

1. `create-cluster-dialog.tsx`:
   - Title: "Nouveau Dossier" (or "Nouveau Sous-Dossier" if `parentId` is set).
   - Form: Nom du dossier (required), Description (optional).
   - Validation & `POST /api/archive/clusters` with toast notification.
2. `upload-archive-dialog.tsx`:
   - Dropzone / file input for PDF.
   - Fields: Titre (required), Date d'émission (required), Date d'échéance (optional), Montant DZD (optional), Emplacement physique (optional), Notes (optional).
   - Submits `FormData` to `POST /api/archive/documents`.
3. `move-document-dialog.tsx`:
   - Fetches full cluster tree via `GET /api/archive/clusters?tree=true`.
   - Displays radio/select list of destination clusters (excluding current cluster).
   - Submits `PATCH /api/archive/documents/[id]/move` with toast notification.
4. `delete-cluster-dialog.tsx`:
   - Confirmation dialog explaining that non-empty folders cannot be deleted.
   - Calls `DELETE /api/archive/clusters/[id]`; catches 400 and displays toast error from server.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/archives/archive-dialogs.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/archives/
git commit -m "feat(ui): add archive modal dialogs for cluster CRUD, document upload, and move"
```

---

### Task 7: Archive UI Pages & Component Views

**Files:**
- Create: `src/components/archives/cluster-card.tsx`
- Create: `src/components/archives/archive-document-table.tsx`
- Create: `src/app/(app)/archives/page.tsx`
- Create: `src/app/(app)/archives/[id]/page.tsx`
- Create: `src/app/(app)/archives/archives-pages.test.tsx`

**Interfaces:**
- Consumes: Dialogs from Task 6, API client, design tokens (`card`, `badge`, `button`)
- Produces: Fully interactive `/archives` root explorer and `/archives/[id]` cluster workspace

- [ ] **Step 1: Write failing page & component tests**

```typescript
// src/app/(app)/archives/archives-pages.test.tsx
import { render, screen } from '@testing-library/react'
import ArchivesPage from './page'

describe('Archives Pages', () => {
  it('renders root archives page with title and cluster cards', async () => {
    // Render ArchivesPage with mocked fetch
    // Assert "Archives & Dossiers" header and "+ Nouveau Dossier" button are present
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/(app)/archives/archives-pages.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement pages and view components**

1. `src/components/archives/cluster-card.tsx`:
   - Card styled with industrial tokens: folder icon, cluster name, badge showing `totalDocumentsCount` and `subClustersCount`, last activity date.
   - Context menu / action triggers for "Renommer" and "Supprimer".
2. `src/components/archives/archive-document-table.tsx`:
   - Filter input ("Rechercher dans ce dossier...").
   - Table of documents with columns: Document (title, reference, location), Émission, Échéance, Montant, Actions (`Voir PDF`, `Déplacer`, `Supprimer`).
3. `src/app/(app)/archives/page.tsx`:
   - Page header: `08 · Archives & Dossiers`, description, `+ Nouveau Dossier` button.
   - Filter input to quickly search clusters by name.
   - Responsive grid of `ClusterCard` items linking to `/archives/[id]`.
   - Empty state when no clusters exist with clear prompt to create the first cluster.
4. `src/app/(app)/archives/[id]/page.tsx`:
   - Dynamic breadcrumb bar: `08 · Archives / [Parent] / [Current]`.
   - Header with cluster title, total count, `+ Nouveau Sous-Dossier`, `+ Déposer un document`, and cluster options.
   - Section for sub-clusters grid (if any exist).
   - Section for direct documents table with inline search and action handlers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/(app)/archives/archives-pages.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/archives/ src/app/\(app\)/archives/
git commit -m "feat(archives): implement root explorer and cluster workspace pages"
```

---

### Task 8: End-to-End Verification & Quality Gates

**Files:**
- Test: Full test suite

**Interfaces:**
- Consumes: Entire codebase
- Produces: 100% green test suite, clean lint, clean TypeScript build

- [ ] **Step 1: Run unit and integration test suite**

Run: `npm test`  
Expected: All test suites PASS (minimum 43 suites, >320 tests).

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`  
Expected: 0 errors.

- [ ] **Step 3: Run ESLint**

Run: `npm run lint`  
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Run Next.js production build**

Run: `npm run build`  
Expected: Build succeeds with `/archives` and `/archives/[id]` listed among static/server rendered routes.

- [ ] **Step 5: Final integration commit**

```bash
git add -A
git commit -m "chore: verify full quality gates for archive module"
```
