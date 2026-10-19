# ERP Système de Gestion Documentaire — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a French-language, LAN-hosted ERP web app for a single Algerian enterprise that makes any document findable in under 30 seconds via a 3-axis filter (entity, date, type), enforces module-scoped uploads to prevent misfiling, and surfaces compliance deadline alerts on the home dashboard.

**Architecture:** Next.js 14 App Router with two route groups — `(auth)` for login, `(app)` for all authenticated pages. All document uploads are scoped to a module+entity context via a shared `DocumentUploadForm` component. The database stores only the MinIO object key; PDF access goes through a Next.js API route that generates short-lived signed URLs after validating the session.

**Tech Stack:** Next.js 14+ (App Router), React, Tailwind CSS, Shadcn UI, NextAuth.js (credentials + bcrypt), PostgreSQL, Prisma ORM, MinIO (self-hosted), Jest, @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-10-19-erp-document-management-design.md`

## Global Constraints

- Next.js 14+ App Router only — no Pages Router patterns.
- All UI copy in French. Use the exact Algerian document-type names from the spec (G50, Bon de livraison, Facture d'achat, etc.).
- `entityId` is nullable — Trésorerie and Fiscalité modules have no entity profiles.
- `fileKey` (not `fileUrl`) is stored in the database; URLs are generated on demand.
- Every API route must verify session via `getServerSession(authOptions)` before doing anything. Return 401 if unauthenticated.
- Dashboard calendar alert thresholds are hardcoded constants from the spec (G50: warn day 10, red day 17; CNAS: quarterly; IBS/G40: annual).
- Assurance and Contrôle technique document types require `dueDate` — enforce in both API validation and form UI.
- `DocumentLink` is symmetric: linking A→B and B→A is the same link. Enforce with a `@@unique([documentAId, documentBId])` and deduplicate in the query layer.
- All monetary amounts are entered manually as `Decimal` — no calculation logic in the app.

## Review Focus

- **Upload without dueDate for Assurance/Contrôle technique:** form and API must both reject; test Task 9 covers this.
- **Duplicate document links (A→B and B→A):** the link query must return each pair once regardless of insertion order; test Task 13 covers this.
- **Session expiry during PDF viewing:** signed URL refresh on tab focus must return 401 when session is gone, triggering redirect to login; test Task 5 covers this.
- **Search with no matching documents:** must show an empty-state message, not a crash; test Task 6 covers this.
- **Calendar alert at month boundary (G50 on the 1st of the month):** deadline logic must correctly compute the next due date; test Task 14 covers this.

---

## File Structure

```
prisma/
  schema.prisma
  seed.ts

src/
  app/
    (auth)/
      login/
        page.tsx
    (app)/
      layout.tsx                     # authenticated shell with sidebar
      page.tsx                       # dashboard home
      recherche/
        page.tsx                     # global search
      clients/
        page.tsx                     # client list
        nouveau/
          page.tsx                   # create client form
        [id]/
          page.tsx                   # client profile + documents
          nouveau-document/
            page.tsx                 # upload scoped to this client
      fournisseurs/
        page.tsx
        nouveau/
          page.tsx
        [id]/
          page.tsx
          nouveau-document/
            page.tsx
      materiel/
        page.tsx
        nouveau/
          page.tsx
        [id]/
          page.tsx
          nouveau-document/
            page.tsx
      personnel/
        page.tsx
        nouveau/
          page.tsx
        [id]/
          page.tsx
          nouveau-document/
            page.tsx
      tresorerie/
        page.tsx
        nouveau-document/
          page.tsx
      fiscalite/
        page.tsx
        nouveau-document/
          page.tsx

  api/
    auth/
      [...nextauth]/
        route.ts
    documents/
      route.ts                       # POST: create document record + upload
      [id]/
        route.ts                     # GET metadata, PATCH, DELETE
        signed-url/
          route.ts                   # GET: refresh signed URL
        links/
          route.ts                   # GET linked docs, POST add link, DELETE remove link
    clients/
      route.ts                       # GET list, POST create
      [id]/
        route.ts                     # GET, PATCH, DELETE
    fournisseurs/
      route.ts
      [id]/
        route.ts
    materiel/
      route.ts
      [id]/
        route.ts
    personnel/
      route.ts
      [id]/
        route.ts
    search/
      route.ts                       # GET: 3-axis document search
    dashboard/
      deadlines/
        route.ts                     # GET: merged calendar + document-based alerts
      manual-deadlines/
        route.ts                     # GET list, POST create
        [id]/
          route.ts                   # DELETE
      outstanding/
        route.ts                     # GET: isPaid=false across Clients + Fournisseurs

  components/
    layout/
      sidebar.tsx
      top-bar.tsx
    documents/
      document-upload-form.tsx       # shared, accepts module + entityId props
      document-list.tsx
      document-card.tsx
      document-detail-panel.tsx
      pdf-viewer.tsx
      document-link-widget.tsx
      paid-toggle.tsx
    search/
      search-bar.tsx
      search-filters.tsx
      search-results.tsx
    dashboard/
      deadline-card.tsx
      calendar-alerts-section.tsx
      document-alerts-section.tsx
      manual-deadline-form.tsx
      outstanding-invoices-section.tsx
    entities/
      client-form.tsx
      supplier-form.tsx
      machine-form.tsx
      worker-form.tsx
      entity-document-list.tsx       # shared: renders docs for any entity

  lib/
    auth.ts                          # NextAuth config + authOptions
    db.ts                            # Prisma client singleton
    minio.ts                         # MinIO client + uploadFile + getSignedUrl
    deadlines.ts                     # computeCalendarAlerts(), computeDocumentAlerts()
    constants.ts                     # DocumentType enum labels, Module labels, alert thresholds

  middleware.ts                      # Protect all (app)/* routes
```

---

## Task 1: Project Scaffold & Dev Environment

**Files:**
- Create: `package.json` (via `create-next-app`)
- Create: `.env.local` (from `.env.example`)
- Create: `src/lib/constants.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/minio.ts` (stub — filled in Task 4)

**Interfaces:**
- Produces: `db` (Prisma client singleton), `MODULE_LABELS`, `DOCUMENT_TYPE_LABELS`, `DOCUMENT_TYPES_BY_MODULE` from `constants.ts`

- [ ] **Step 1: Scaffold Next.js app**

  Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  Expected: project files created, `npm run dev` serves on port 3000.

- [ ] **Step 2: Install dependencies**

  ```bash
  npm install prisma @prisma/client next-auth bcryptjs @types/bcryptjs
  npm install minio @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  npm install zod react-hook-form @hookform/resolvers
  npm install @tanstack/react-query
  npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest
  npx shadcn@latest init
  npx shadcn@latest add button input label card table badge dialog sheet select date-picker separator skeleton toast
  ```

- [ ] **Step 3: Create `.env.example`**

  ```
  DATABASE_URL="postgresql://user:password@localhost:5432/erp_db"
  NEXTAUTH_SECRET="change-me"
  NEXTAUTH_URL="http://localhost:3000"
  MINIO_ENDPOINT="localhost"
  MINIO_PORT="9000"
  MINIO_ACCESS_KEY="minioadmin"
  MINIO_SECRET_KEY="minioadmin"
  MINIO_BUCKET="erp-documents"
  MINIO_USE_SSL="false"
  ```
  Copy to `.env.local` and fill with real values.

- [ ] **Step 4: Create `src/lib/db.ts`**

  Export a Prisma client singleton using the standard Next.js pattern (global cache in development to avoid hot-reload connection exhaustion).

- [ ] **Step 5: Create `src/lib/constants.ts`**

  Export:
  - `DocumentType` — a `const` object mapping enum keys to French display labels (e.g. `FACTURE_VENTE: "Facture de vente"`).
  - `Module` — a `const` object mapping module keys to French display labels.
  - `DOCUMENT_TYPES_BY_MODULE` — a `Record<Module, DocumentType[]>` mapping each module to its allowed document types. This is the enforcement point for the upload form.
  - `ALERT_THRESHOLDS` — a `const` object with the exact values from the spec: `G50_WARN_DAY: 10`, `G50_RED_DAY: 17`, `CNAS_WARN_DAYS: 15`, `CNAS_RED_DAYS: 5`, `IBS_WARN_DAYS: 30`, `IBS_RED_DAYS: 10`, `MACHINE_WARN_DAYS: 30`, `MACHINE_RED_DAYS: 7`, `DEFAULT_WARN_DAYS: 30`, `DEFAULT_RED_DAYS: 7`.

- [ ] **Step 6: Configure Jest**

  Create `jest.config.ts` using `ts-jest` preset, `jsdom` environment, and `@/*` path alias matching `tsconfig.json`.

- [ ] **Step 7: Verify app starts**

  Run: `npm run dev`
  Expected: no errors on port 3000.

- [ ] **Step 8: Commit**

  ```bash
  git init && git add . && git commit -m "feat: scaffold next.js project with dependencies"
  ```

---

## Task 2: Database Schema & Migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`

**Interfaces:**
- Produces: Prisma types `Document`, `Client`, `Fournisseur`, `Machine`, `Travailleur`, `DocumentLink`, `ManualDeadline`, `User`. All later tasks import these from `@prisma/client`.

- [ ] **Step 1: Write failing test for seed**

  ```ts
  // prisma/seed.test.ts
  it('seed creates admin user with hashed password', async () => {
    await seed();
    const user = await db.user.findUnique({ where: { email: 'admin@erp.local' } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe('ADMIN');
    expect(user!.password).not.toBe('admin123');
  });
  ```

- [ ] **Step 2: Write `prisma/schema.prisma`**

  Models and enums exactly as follows:

  **Enums:** `Role { ADMIN MANAGER VIEWER }`, `MachineStatut { ACTIF EN_MAINTENANCE HORS_SERVICE }`, `Module { CLIENTS FOURNISSEURS MATERIEL PERSONNEL TRESORERIE FISCALITE }`, `DocumentType` (all values listed in the spec, using SCREAMING_SNAKE_CASE: `FACTURE_VENTE`, `BON_DE_LIVRAISON`, `CONTRAT_CLIENT`, `DEVIS`, `FACTURE_ACHAT`, `BON_DE_COMMANDE`, `BON_DE_RECEPTION`, `CARTE_GRISE`, `ASSURANCE`, `CONTROLE_TECHNIQUE`, `D10`, `FACTURE_REPARATION`, `FICHE_DE_PAIE`, `CONTRAT_TRAVAIL`, `PIECE_IDENTITE`, `RELEVE_BANCAIRE`, `RECU_PAIEMENT`, `REGISTRE_COMMERCE`, `G50`, `G4`, `G12`, `G40`, `ETAT_104`, `CNAS_DECLARATION`, `CASNOS`, `CACOBATPH`).

  **Models:**
  - `User`: `id`, `email @unique`, `password`, `role Role @default(ADMIN)`, `createdAt`.
  - `Client`: `id`, `nom`, `nif?`, `telephone?`, `adresse?`, `documents Document[]`, timestamps.
  - `Fournisseur`: same shape as Client, with `documents Document[]`.
  - `Machine`: `id`, `machineId @unique`, `marque?`, `modele?`, `numeroSerie?`, `matricule?`, `statut MachineStatut @default(ACTIF)`, `documents Document[]`, timestamps.
  - `Travailleur`: `id`, `nom`, `numeroIdentification?`, `dateDebutContrat DateTime?`, `numeroCnas?`, `documents Document[]`, timestamps.
  - `Document`: `id`, `title`, `documentType DocumentType`, `module Module`, `issueDate DateTime`, `dueDate DateTime?`, `amount Decimal?`, `isPaid Boolean?`, `physicalLocation?`, `notes?`, `fileKey String`, `clientId? → Client`, `fournisseurId? → Fournisseur`, `machineId? → Machine`, `travailleurId? → Travailleur`, `linkedTo DocumentLink[] @relation("DocumentA")`, `linkedFrom DocumentLink[] @relation("DocumentB")`, timestamps. Indexes: `module`, `documentType`, `issueDate`, `dueDate`, `isPaid`.
  - `DocumentLink`: `id`, `documentAId → Document @relation("DocumentA") onDelete: Cascade`, `documentBId → Document @relation("DocumentB") onDelete: Cascade`, `createdAt`. Unique: `[documentAId, documentBId]`.
  - `ManualDeadline`: `id`, `label`, `dueDate DateTime`, `yellowDaysBefore Int @default(30)`, `redDaysBefore Int @default(7)`, `createdAt`.

- [ ] **Step 3: Run migration**

  ```bash
  npx prisma migrate dev --name init
  ```
  Expected: `prisma/migrations/` folder created, no errors.

- [ ] **Step 4: Write `prisma/seed.ts`**

  Hash `"admin123"` with bcrypt (rounds: 12) and create a User with `email: "admin@erp.local"`, `role: "ADMIN"`. Use `upsert` so re-running is idempotent.

- [ ] **Step 5: Run seed test to verify it passes**

  Run: `npx ts-node prisma/seed.ts && npx jest prisma/seed.test.ts`
  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add prisma/ && git commit -m "feat: prisma schema, migration, and admin seed"
  ```

---

## Task 3: Authentication & Route Protection

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/middleware.ts`
- Create: `src/types/next-auth.d.ts`

**Interfaces:**
- Produces: `authOptions` (exported from `src/lib/auth.ts`). All API routes and server components call `getServerSession(authOptions)` to get the session.
- Produces: Session type augmented with `user.role: Role` and `user.id: string`.

- [ ] **Step 1: Write failing tests**

  ```ts
  // src/lib/auth.test.ts
  it('rejects login with wrong password', async () => {
    const result = await authorize({ email: 'admin@erp.local', password: 'wrong' });
    expect(result).toBeNull();
  });

  it('returns user on correct credentials', async () => {
    const result = await authorize({ email: 'admin@erp.local', password: 'admin123' });
    expect(result).toMatchObject({ email: 'admin@erp.local', role: 'ADMIN' });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx jest src/lib/auth.test.ts`
  Expected: FAIL — `authorize` not defined.

- [ ] **Step 3: Implement `src/lib/auth.ts`**

  Export `authOptions: NextAuthOptions` with:
  - `providers: [CredentialsProvider]` — `authorize` function: find user by email in DB, compare password with `bcrypt.compare`, return `{ id, email, role }` or `null`.
  - `callbacks.jwt`: attach `id` and `role` from `token` to JWT.
  - `callbacks.session`: attach `id` and `role` from `token` to `session.user`.
  - `pages.signIn: '/login'`.
  - `session.strategy: 'jwt'`.

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx jest src/lib/auth.test.ts`
  Expected: PASS.

- [ ] **Step 5: Create `src/middleware.ts`**

  Use NextAuth `withAuth` middleware. Protect all routes matching `/(app)/(.*)` and `/(api/)(?!auth)(.*)`. Redirect unauthenticated requests to `/login`.

- [ ] **Step 6: Create `src/app/(auth)/login/page.tsx`**

  A centered card with email + password fields. On submit, call `signIn('credentials', { email, password, callbackUrl: '/' })`. Show an error message if `signIn` returns an error. Use Shadcn `Card`, `Input`, `Button`, `Label`.

- [ ] **Step 7: Create `src/app/api/auth/[...nextauth]/route.ts`**

  Export `GET` and `POST` handlers from `NextAuth(authOptions)`.

- [ ] **Step 8: Manual verification**

  Run: `npm run dev`. Navigate to `http://localhost:3000/`. Expected: redirect to `/login`. Log in with `admin@erp.local` / `admin123`. Expected: redirect to `/`.

- [ ] **Step 9: Commit**

  ```bash
  git add src/ && git commit -m "feat: nextauth credentials auth, login page, route protection"
  ```

---

## Task 4: MinIO Integration & File Storage API

**Files:**
- Create: `src/lib/minio.ts`
- Create: `src/app/api/documents/route.ts`
- Create: `src/app/api/documents/[id]/route.ts`
- Create: `src/app/api/documents/[id]/signed-url/route.ts`

**Interfaces:**
- Produces: `uploadFile(file: Buffer, key: string, mimetype: string): Promise<void>` from `minio.ts`.
- Produces: `getSignedUrl(key: string): Promise<string>` from `minio.ts` — 15-minute expiry.
- Produces: `POST /api/documents` — accepts multipart form data, returns `Document` record.
- Produces: `GET /api/documents/[id]/signed-url` — returns `{ url: string }`.

- [ ] **Step 1: Write failing tests**

  ```ts
  // src/lib/minio.test.ts
  it('getSignedUrl returns a string URL for a valid key', async () => {
    const url = await getSignedUrl('test/sample.pdf');
    expect(typeof url).toBe('string');
    expect(url).toContain('test/sample.pdf');
  });

  // src/app/api/documents/route.test.ts
  it('POST /api/documents returns 401 without session', async () => {
    const res = await POST(new Request('http://localhost/api/documents', { method: 'POST' }));
    expect(res.status).toBe(401);
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx jest src/lib/minio.test.ts src/app/api/documents/route.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/minio.ts`**

  - Instantiate MinIO `Client` from env vars.
  - `uploadFile(buffer, key, mimetype)`: call `client.putObject(BUCKET, key, buffer, { 'Content-Type': mimetype })`.
  - `getSignedUrl(key)`: use `@aws-sdk/s3-request-presigner` `getSignedUrl` with S3-compatible MinIO config, `GetObjectCommand`, expiry 900 seconds (15 min). Return the URL string.
  - `generateKey(module, entityId, filename)`: returns `${module}/${entityId ?? 'global'}/${Date.now()}-${filename}`.

- [ ] **Step 4: Implement `POST /api/documents`**

  In `src/app/api/documents/route.ts`:
  1. Verify session — return 401 if missing.
  2. Parse multipart body: extract `file`, `title`, `documentType`, `module`, `issueDate`, and optional fields.
  3. Validate with Zod: `title` required, `documentType` must be in `DOCUMENT_TYPES_BY_MODULE[module]`, `issueDate` required, `dueDate` required if `documentType` is `ASSURANCE` or `CONTROLE_TECHNIQUE`.
  4. Generate `key` via `generateKey`.
  5. Call `uploadFile`.
  6. Create `Document` record in DB with `fileKey: key`.
  7. Return `201` with the created document (excluding `fileKey`, including a fresh signed URL).

- [ ] **Step 5: Implement `GET /api/documents/[id]/signed-url`**

  1. Verify session — 401 if missing.
  2. Find document by id — 404 if not found.
  3. Call `getSignedUrl(document.fileKey)`.
  4. Return `{ url }`.

- [ ] **Step 6: Implement `GET/PATCH/DELETE /api/documents/[id]`**

  - `GET`: return document metadata (no fileKey, include signed URL).
  - `PATCH`: update allowed fields (`title`, `notes`, `physicalLocation`, `amount`, `isPaid`, `dueDate`). Re-validate `dueDate` requirement for Assurance/CT.
  - `DELETE`: delete MinIO object via `client.removeObject`, then delete DB record.

- [ ] **Step 7: Run tests to verify they pass**

  Run: `npx jest src/lib/minio.test.ts src/app/api/documents/route.test.ts`
  Expected: PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add src/ && git commit -m "feat: minio integration, document upload and signed-url API"
  ```

---

## Task 5: Document Engine Components

**Files:**
- Create: `src/components/documents/document-upload-form.tsx`
- Create: `src/components/documents/document-list.tsx`
- Create: `src/components/documents/document-card.tsx`
- Create: `src/components/documents/document-detail-panel.tsx`
- Create: `src/components/documents/pdf-viewer.tsx`
- Create: `src/components/documents/paid-toggle.tsx`

**Interfaces:**
- Consumes: `POST /api/documents`, `GET /api/documents/[id]/signed-url`, `PATCH /api/documents/[id]`.
- Produces:
  - `<DocumentUploadForm module={Module} entityId={string | null} onSuccess={() => void} />` — renders the upload form, scoped to the given module; document type dropdown is filtered by `DOCUMENT_TYPES_BY_MODULE[module]`.
  - `<DocumentList documents={DocumentSummary[]} onSelect={(id) => void} />` — renders a list of document cards.
  - `<DocumentDetailPanel documentId={string} onClose={() => void} />` — renders metadata + PDF viewer in a Sheet/Drawer.
  - `<PaidToggle documentId={string} isPaid={boolean} />` — calls `PATCH /api/documents/[id]` with `{ isPaid: !current }`.

- [ ] **Step 1: Write failing tests**

  ```tsx
  // src/components/documents/document-upload-form.test.tsx
  it('filters document types by module', () => {
    render(<DocumentUploadForm module="CLIENTS" entityId="c1" onSuccess={jest.fn()} />);
    expect(screen.getByText('Facture de vente')).toBeInTheDocument();
    expect(screen.queryByText('G50')).not.toBeInTheDocument();
  });

  it('shows dueDate field as required for ASSURANCE type', async () => {
    render(<DocumentUploadForm module="MATERIEL" entityId="m1" onSuccess={jest.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'ASSURANCE');
    expect(screen.getByLabelText(/date d'expiration/i)).toBeRequired();
  });

  // src/components/documents/pdf-viewer.test.tsx
  it('fetches a new signed URL on window focus when URL is near expiry', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ url: 'http://minio/refreshed.pdf' });
    global.fetch = fetchMock;
    render(<PdfViewer documentId="d1" initialUrl="http://minio/old.pdf" expiresAt={Date.now() + 90_000} />);
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/documents/d1/signed-url'));
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx jest src/components/documents/`
  Expected: FAIL.

- [ ] **Step 3: Implement `document-upload-form.tsx`**

  - Props: `module: Module`, `entityId: string | null`, `onSuccess: () => void`.
  - Form fields: file input (PDF only), title (text), documentType (select filtered by `DOCUMENT_TYPES_BY_MODULE[module]`), issueDate (date), dueDate (date — shown always, marked required when type is `ASSURANCE` or `CONTROLE_TECHNIQUE`), amount (number, optional), physicalLocation (text, optional), notes (textarea, optional).
  - On submit: POST to `/api/documents` as multipart form data, call `onSuccess()` on 201.
  - Show a toast on error.

- [ ] **Step 4: Implement `pdf-viewer.tsx`**

  - Props: `documentId: string`, `initialUrl: string`, `expiresAt: number` (unix ms).
  - Render an `<iframe src={currentUrl} />` filling its container.
  - On `window` `focus` event: if `Date.now() > expiresAt - 120_000`, fetch `/api/documents/${documentId}/signed-url` and update `currentUrl` and `expiresAt`.
  - On fetch returning 401: redirect to `/login`.

- [ ] **Step 5: Implement remaining components**

  - `document-card.tsx`: renders title, type label, issueDate, entity name, and a badge for `isPaid` status. Clicking fires `onSelect`.
  - `document-list.tsx`: maps `documents` → `<DocumentCard>`. Shows "Aucun document" when empty.
  - `document-detail-panel.tsx`: a Shadcn `Sheet` (slides in from right). Shows all document metadata, `<PdfViewer>`, `<PaidToggle>` (if applicable), and `<DocumentLinkWidget>` placeholder (wired in Task 13).
  - `paid-toggle.tsx`: a Shadcn `Switch` labeled "Payé" / "Impayé". On toggle: `PATCH /api/documents/[id]` with `{ isPaid }`.

- [ ] **Step 6: Run tests to verify they pass**

  Run: `npx jest src/components/documents/`
  Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add src/ && git commit -m "feat: document engine UI components"
  ```

---

## Task 6: Search & Retrieval (Primary Feature)

**Files:**
- Create: `src/app/api/search/route.ts`
- Create: `src/components/search/search-bar.tsx`
- Create: `src/components/search/search-filters.tsx`
- Create: `src/components/search/search-results.tsx`
- Create: `src/app/(app)/recherche/page.tsx`

**Interfaces:**
- Consumes: `Document` records with entity relations.
- Produces: `GET /api/search?entity=&from=&to=&type=` — returns `DocumentSummary[]` sorted by `issueDate` descending. All params optional; returns all documents if none provided.
- Produces: `<SearchBar />` — a controlled input that updates the `entity` query param.
- Produces: `/recherche` page — combines SearchBar + SearchFilters + SearchResults.

- [ ] **Step 1: Write failing tests**

  ```ts
  // src/app/api/search/route.test.ts
  it('returns 401 without session', async () => {
    const res = await GET(new Request('http://localhost/api/search'));
    expect(res.status).toBe(401);
  });

  it('filters by documentType', async () => {
    // seed two docs: one G50, one FACTURE_VENTE
    const res = await GET(authenticatedRequest('/api/search?type=G50'));
    const data = await res.json();
    expect(data.every((d: any) => d.documentType === 'G50')).toBe(true);
  });

  it('returns empty array (not error) when no documents match', async () => {
    const res = await GET(authenticatedRequest('/api/search?type=CACOBATPH'));
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx jest src/app/api/search/route.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement `GET /api/search`**

  In `src/app/api/search/route.ts`:
  1. Verify session — 401 if missing.
  2. Read query params: `entity` (string), `from` (ISO date), `to` (ISO date), `type` (DocumentType).
  3. Build Prisma `where` clause:
     - If `entity`: `OR` across `client.nom`, `fournisseur.nom`, `machine.machineId`, `travailleur.nom` using `contains` (case-insensitive via `mode: 'insensitive'`).
     - If `from`/`to`: `issueDate: { gte: from, lte: to }`.
     - If `type`: `documentType: type`.
  4. Query with `include: { client, fournisseur, machine, travailleur }`.
  5. Order by `issueDate: 'desc'`.
  6. Return mapped `DocumentSummary[]` (id, title, documentType, module, issueDate, dueDate, amount, isPaid, entityName derived from whichever relation is non-null).

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx jest src/app/api/search/route.test.ts`
  Expected: PASS.

- [ ] **Step 5: Implement search UI components**

  - `search-bar.tsx`: a Shadcn `Input` with a search icon. Debounced (300ms). Updates `?entity=` query param via `useRouter().replace`.
  - `search-filters.tsx`: two additional controls — a date range picker (`?from=`, `?to=`) and a document type `Select` (`?type=`). Each updates query params independently.
  - `search-results.tsx`: reads query params, fetches `/api/search?...` via `useQuery`, renders `<DocumentList>`. Shows skeleton while loading. Shows "Aucun document trouvé" when results are empty.

- [ ] **Step 6: Implement `/recherche/page.tsx`**

  Full-width layout: `<SearchBar>` + `<SearchFilters>` row at top, `<SearchResults>` below. Clicking a result opens `<DocumentDetailPanel>`.

- [ ] **Step 7: Commit**

  ```bash
  git add src/ && git commit -m "feat: global search with entity/date/type filters"
  ```

---

## Task 7: App Layout & Navigation

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/top-bar.tsx`

**Interfaces:**
- Consumes: NextAuth session for user display name.
- Produces: Authenticated shell wrapping all `(app)` pages.

- [ ] **Step 1: Implement `sidebar.tsx`**

  A fixed left sidebar with navigation links to all modules. Active link is highlighted. Links:
  - Tableau de bord (`/`)
  - Recherche (`/recherche`) — with a search icon, always visible
  - Clients (`/clients`)
  - Fournisseurs (`/fournisseurs`)
  - Matériel & Engins (`/materiel`)
  - Personnel (`/personnel`)
  - Trésorerie & Banque (`/tresorerie`)
  - Fiscalité & Administration (`/fiscalite`)

- [ ] **Step 2: Implement `top-bar.tsx`**

  Shows current page title and a user menu (logged-in email + "Se déconnecter" button calling `signOut()`).

- [ ] **Step 3: Implement `src/app/(app)/layout.tsx`**

  Server component: calls `getServerSession(authOptions)` — redirects to `/login` if null. Renders `<Sidebar>` + `<TopBar>` + `{children}` in a two-column layout.

- [ ] **Step 4: Manual verification**

  Run `npm run dev`. Log in. Verify sidebar is visible. Verify clicking each nav link navigates correctly. Verify "Se déconnecter" logs out.

- [ ] **Step 5: Commit**

  ```bash
  git add src/ && git commit -m "feat: authenticated app shell with sidebar navigation"
  ```

---

## Task 8: Clients Module

**Files:**
- Create: `src/app/api/clients/route.ts`
- Create: `src/app/api/clients/[id]/route.ts`
- Create: `src/components/entities/client-form.tsx`
- Create: `src/components/entities/entity-document-list.tsx`
- Create: `src/app/(app)/clients/page.tsx`
- Create: `src/app/(app)/clients/nouveau/page.tsx`
- Create: `src/app/(app)/clients/[id]/page.tsx`
- Create: `src/app/(app)/clients/[id]/nouveau-document/page.tsx`

**Interfaces:**
- Produces: `GET /api/clients` (list), `POST /api/clients`, `GET/PATCH/DELETE /api/clients/[id]`.
- Produces: `<ClientForm>` — create/edit form with Nom, NIF, Téléphone, Adresse.
- Produces: `<EntityDocumentList module="CLIENTS" entityId={id} />` — shows documents for this client, opens `<DocumentDetailPanel>` on click.

- [ ] **Step 1: Write failing tests**

  ```ts
  // src/app/api/clients/route.test.ts
  it('POST /api/clients creates client and returns 201', async () => {
    const res = await POST(authenticatedRequest('/api/clients', { nom: 'SARL Test' }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.nom).toBe('SARL Test');
  });

  it('POST /api/clients returns 400 when nom is missing', async () => {
    const res = await POST(authenticatedRequest('/api/clients', {}));
    expect(res.status).toBe(400);
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx jest src/app/api/clients/`
  Expected: FAIL.

- [ ] **Step 3: Implement Client API routes**

  - `GET /api/clients`: return all clients ordered by `nom asc`, include `_count: { documents: true }`.
  - `POST /api/clients`: Zod validate `{ nom: string (required), nif?, telephone?, adresse? }`. Create and return.
  - `GET /api/clients/[id]`: return client with `documents` included (summary fields only).
  - `PATCH /api/clients/[id]`: update any of the four fields.
  - `DELETE /api/clients/[id]`: delete client (cascade deletes documents via Prisma).

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx jest src/app/api/clients/`
  Expected: PASS.

- [ ] **Step 5: Implement UI pages**

  - `/clients/page.tsx`: table of clients (Nom, NIF, Téléphone, document count). "Nouveau client" button → `/clients/nouveau`.
  - `/clients/nouveau/page.tsx`: renders `<ClientForm onSuccess={() => router.push('/clients')} />`.
  - `/clients/[id]/page.tsx`: shows client details, edit button (inline or modal), and `<EntityDocumentList module="CLIENTS" entityId={id} />` below. "Nouveau document" button → `/clients/[id]/nouveau-document`.
  - `/clients/[id]/nouveau-document/page.tsx`: renders `<DocumentUploadForm module="CLIENTS" entityId={id} onSuccess={() => router.back()} />`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/ && git commit -m "feat: clients module — CRUD and document upload"
  ```

---

## Task 9: Fournisseurs Module

**Files:**
- Create: `src/app/api/fournisseurs/route.ts`
- Create: `src/app/api/fournisseurs/[id]/route.ts`
- Create: `src/components/entities/supplier-form.tsx`
- Create: `src/app/(app)/fournisseurs/page.tsx`
- Create: `src/app/(app)/fournisseurs/nouveau/page.tsx`
- Create: `src/app/(app)/fournisseurs/[id]/page.tsx`
- Create: `src/app/(app)/fournisseurs/[id]/nouveau-document/page.tsx`

**Interfaces:**
- Consumes: Same pattern as Task 8.
- Produces: `GET/POST /api/fournisseurs`, `GET/PATCH/DELETE /api/fournisseurs/[id]`. `<SupplierForm>`.

- [ ] **Step 1–5:** Mirror Task 8 exactly substituting `Fournisseur` for `Client`. Document types are `FACTURE_ACHAT`, `BON_DE_COMMANDE`, `BON_DE_RECEPTION`. `isPaid` toggle is shown on `FACTURE_ACHAT` documents in the detail panel.

- [ ] **Step 6: Commit**

  ```bash
  git add src/ && git commit -m "feat: fournisseurs module — CRUD and document upload"
  ```

---

## Task 10: Matériel & Engins Module

**Files:**
- Create: `src/app/api/materiel/route.ts`
- Create: `src/app/api/materiel/[id]/route.ts`
- Create: `src/components/entities/machine-form.tsx`
- Create: `src/app/(app)/materiel/page.tsx`
- Create: `src/app/(app)/materiel/nouveau/page.tsx`
- Create: `src/app/(app)/materiel/[id]/page.tsx`
- Create: `src/app/(app)/materiel/[id]/nouveau-document/page.tsx`

**Interfaces:**
- Produces: `GET/POST /api/materiel`, `GET/PATCH/DELETE /api/materiel/[id]`. `<MachineForm>`.

- [ ] **Step 1: Write failing tests**

  ```ts
  // src/app/api/materiel/route.test.ts
  it('POST /api/materiel/[id]/documents rejects ASSURANCE without dueDate', async () => {
    // This is enforced by the shared document upload API (Task 4)
    // Verify the Zod schema rejects ASSURANCE with no dueDate
    const res = await POST(authenticatedRequest('/api/documents', {
      documentType: 'ASSURANCE', module: 'MATERIEL', machineId: 'm1', title: 'Test', issueDate: '2026-01-01'
      // dueDate intentionally omitted
    }));
    expect(res.status).toBe(400);
  });

  it('POST /api/materiel creates machine', async () => {
    const res = await POST(authenticatedRequest('/api/materiel', { machineId: 'ENG-001', marque: 'Caterpillar' }));
    expect(res.status).toBe(201);
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx jest src/app/api/materiel/`
  Expected: FAIL.

- [ ] **Step 3: Implement Machine API routes**

  - `POST /api/materiel`: Zod validate `{ machineId: string (required), marque?, modele?, numeroSerie?, matricule?, statut? }`. `machineId` must be unique — return 409 on conflict.
  - `GET /api/materiel`: return all machines with `_count: { documents: true }` and `statut`.
  - `GET/PATCH/DELETE /api/materiel/[id]`: standard pattern.

- [ ] **Step 4: Run tests to verify they pass**

  Expected: PASS.

- [ ] **Step 5: Implement UI**

  - Machine list shows: Machine ID, Marque/Modèle, Matricule, Statut (badge), document count.
  - Machine form fields: machineId, marque, modele, numeroSerie, matricule, statut (select).
  - Machine profile shows status badge prominently. Documents section shows Assurance and Contrôle technique with their `dueDate` highlighted.

- [ ] **Step 6: Commit**

  ```bash
  git add src/ && git commit -m "feat: materiel module — fleet CRUD and document upload with dueDate enforcement"
  ```

---

## Task 11: Personnel Module

**Files:**
- Create: `src/app/api/personnel/route.ts`
- Create: `src/app/api/personnel/[id]/route.ts`
- Create: `src/components/entities/worker-form.tsx`
- Create: `src/app/(app)/personnel/page.tsx`
- Create: `src/app/(app)/personnel/nouveau/page.tsx`
- Create: `src/app/(app)/personnel/[id]/page.tsx`
- Create: `src/app/(app)/personnel/[id]/nouveau-document/page.tsx`

**Interfaces:**
- Produces: `GET/POST /api/personnel`, `GET/PATCH/DELETE /api/personnel/[id]`. `<WorkerForm>`.

- [ ] **Step 1–4:** Mirror Task 8 substituting `Travailleur`. Fields: `nom (required)`, `numeroIdentification?`, `dateDebutContrat?`, `numeroCnas?`.

- [ ] **Step 5: Add month/year grouping for Fiches de paie**

  In the worker profile page, filter documents where `documentType === 'FICHE_DE_PAIE'` and group them by `issueDate` month/year using `Array.prototype.reduce`. Display each group as a collapsible section labeled "Octobre 2026", "Septembre 2026", etc.

- [ ] **Step 6: Commit**

  ```bash
  git add src/ && git commit -m "feat: personnel module — HR CRUD and fiche de paie grouped by month"
  ```

---

## Task 12: Trésorerie & Banque Module

**Files:**
- Create: `src/app/(app)/tresorerie/page.tsx`
- Create: `src/app/(app)/tresorerie/nouveau-document/page.tsx`

**Interfaces:**
- Consumes: `POST /api/documents` (Task 4) with `module: 'TRESORERIE'`, `entityId: null`.
- Consumes: `GET /api/dashboard/outstanding` (Task 14 — implement the API here, the dashboard uses it too).

- [ ] **Step 1: Implement `GET /api/dashboard/outstanding`**

  Query all documents where `isPaid = false` AND `module IN ['CLIENTS', 'FOURNISSEURS']`. Include entity name. Return sorted by `issueDate asc`. Add test:

  ```ts
  it('returns only unpaid documents from CLIENTS and FOURNISSEURS', async () => {
    const res = await GET(authenticatedRequest('/api/dashboard/outstanding'));
    const data = await res.json();
    expect(data.every((d: any) => d.isPaid === false)).toBe(true);
    expect(data.every((d: any) => ['CLIENTS', 'FOURNISSEURS'].includes(d.module))).toBe(true);
  });
  ```

- [ ] **Step 2: Implement Trésorerie pages**

  - `/tresorerie/page.tsx`: two sections — "Documents" (list of TRESORERIE module docs) and "Factures impayées" (reconciliation view rendering data from `/api/dashboard/outstanding` with a `<PaidToggle>` per row).
  - `/tresorerie/nouveau-document/page.tsx`: renders `<DocumentUploadForm module="TRESORERIE" entityId={null} onSuccess={...} />`.

- [ ] **Step 3: Commit**

  ```bash
  git add src/ && git commit -m "feat: tresorerie module — bank documents and outstanding invoices view"
  ```

---

## Task 13: Fiscalité & Administration Module

**Files:**
- Create: `src/app/(app)/fiscalite/page.tsx`
- Create: `src/app/(app)/fiscalite/nouveau-document/page.tsx`

**Interfaces:**
- Consumes: `POST /api/documents` with `module: 'FISCALITE'`, `entityId: null`.

- [ ] **Step 1:** Mirror Trésorerie structure. Document list shows all FISCALITE module docs grouped by `documentType` label. No reconciliation view. "Nouveau document" scoped to `module: 'FISCALITE'`.

- [ ] **Step 2: Commit**

  ```bash
  git add src/ && git commit -m "feat: fiscalite module — tax and social document archive"
  ```

---

## Task 14: Document Linking

**Files:**
- Create: `src/app/api/documents/[id]/links/route.ts`
- Create: `src/components/documents/document-link-widget.tsx`

**Interfaces:**
- Produces: `GET /api/documents/[id]/links` — returns all documents linked to `[id]` (both directions).
- Produces: `POST /api/documents/[id]/links` — body `{ targetId: string }`. Creates `DocumentLink`. Returns 409 if already linked.
- Produces: `DELETE /api/documents/[id]/links` — body `{ targetId: string }`. Removes the link.
- Produces: `<DocumentLinkWidget documentId={string} />` — replaces placeholder in `DocumentDetailPanel`.

- [ ] **Step 1: Write failing tests**

  ```ts
  // src/app/api/documents/[id]/links/route.test.ts
  it('GET returns linked documents in both directions', async () => {
    // Create docA, docB, link A→B
    await db.documentLink.create({ data: { documentAId: 'A', documentBId: 'B' } });
    const resA = await GET(authenticatedRequest('/api/documents/A/links'));
    const dataA = await resA.json();
    expect(dataA.some((d: any) => d.id === 'B')).toBe(true);

    // B should also see A (symmetric)
    const resB = await GET(authenticatedRequest('/api/documents/B/links'));
    const dataB = await resB.json();
    expect(dataB.some((d: any) => d.id === 'A')).toBe(true);
  });

  it('POST returns 409 when link already exists', async () => {
    await db.documentLink.create({ data: { documentAId: 'A', documentBId: 'B' } });
    const res = await POST(authenticatedRequest('/api/documents/A/links', { targetId: 'B' }));
    expect(res.status).toBe(409);
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Expected: FAIL.

- [ ] **Step 3: Implement `/api/documents/[id]/links` routes**

  - `GET`: query `DocumentLink` where `documentAId = id OR documentBId = id`. Collect the "other" document id from each link. Fetch those documents. Return as `DocumentSummary[]`.
  - `POST`: validate `targetId` is not the same as `id`. Try `create`. Catch unique constraint violation → 409.
  - `DELETE`: delete where `(documentAId=id AND documentBId=targetId) OR (documentAId=targetId AND documentBId=id)`.

- [ ] **Step 4: Run tests to verify they pass**

  Expected: PASS.

- [ ] **Step 5: Implement `document-link-widget.tsx`**

  - Fetches and displays linked documents as a compact list inside `DocumentDetailPanel`.
  - A "Lier un document" button opens a search-and-select `Dialog` (uses the same `/api/search` endpoint). Selecting a document calls `POST /api/documents/[id]/links`.
  - Each linked document has an "×" button calling `DELETE`. Clicking a linked document opens its `DocumentDetailPanel`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/ && git commit -m "feat: document linking — symmetric many-to-many with link widget"
  ```

---

## Task 15: Dashboard — Tableau de Suivi des Échéances

**Files:**
- Create: `src/lib/deadlines.ts`
- Create: `src/app/api/dashboard/deadlines/route.ts`
- Create: `src/app/api/dashboard/manual-deadlines/route.ts`
- Create: `src/app/api/dashboard/manual-deadlines/[id]/route.ts`
- Create: `src/components/dashboard/calendar-alerts-section.tsx`
- Create: `src/components/dashboard/document-alerts-section.tsx`
- Create: `src/components/dashboard/manual-deadline-form.tsx`
- Create: `src/components/dashboard/outstanding-invoices-section.tsx`
- Create: `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: `GET /api/dashboard/outstanding` (Task 12).
- Produces: `computeCalendarAlerts(now: Date): CalendarAlert[]` from `deadlines.ts`.
- Produces: `GET /api/dashboard/deadlines` — returns `{ calendarAlerts: CalendarAlert[], documentAlerts: DocumentAlert[] }`.
- Produces: Dashboard home page.

- [ ] **Step 1: Write failing tests**

  ```ts
  // src/lib/deadlines.test.ts
  it('G50: returns yellow alert on the 10th of the month', () => {
    const alerts = computeCalendarAlerts(new Date('2026-10-10'));
    const g50 = alerts.find(a => a.type === 'G50');
    expect(g50?.severity).toBe('yellow');
  });

  it('G50: returns red alert on the 17th of the month', () => {
    const alerts = computeCalendarAlerts(new Date('2026-10-17'));
    const g50 = alerts.find(a => a.type === 'G50');
    expect(g50?.severity).toBe('red');
  });

  it('G50: returns no alert on the 5th of the month', () => {
    const alerts = computeCalendarAlerts(new Date('2026-10-05'));
    const g50 = alerts.find(a => a.type === 'G50');
    expect(g50).toBeUndefined();
  });

  it('G50: returns red alert on the 1st of the month (next due date is 20th, which is 19 days away — within red threshold... wait, G50 due is the 20th; on the 17th it\'s 3 days away = red. On the 1st it\'s 19 days away = no alert)', () => {
    const alerts = computeCalendarAlerts(new Date('2026-10-01'));
    const g50 = alerts.find(a => a.type === 'G50');
    expect(g50).toBeUndefined();
  });

  it('CNAS: returns yellow alert 15 days before quarter end', () => {
    // Q3 ends Sept 30. 15 days before = Sept 15.
    const alerts = computeCalendarAlerts(new Date('2026-09-15'));
    const cnas = alerts.find(a => a.type === 'CNAS');
    expect(cnas?.severity).toBe('yellow');
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx jest src/lib/deadlines.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/deadlines.ts`**

  Export type `CalendarAlert { type: 'G50' | 'CNAS' | 'IBS_G40', severity: 'yellow' | 'red', label: string, dueDate: Date }`.

  Export `computeCalendarAlerts(now: Date): CalendarAlert[]`:

  - **G50**: due date = 20th of current month. If `now.getDate() >= G50_RED_DAY (17)` → red. Else if `>= G50_WARN_DAY (10)` → yellow. Else no alert.
  - **CNAS**: quarter end dates = March 31, June 30, September 30, December 31. Find the next quarter end from `now`. If `daysUntil <= CNAS_RED_DAYS (5)` → red. Else if `<= CNAS_WARN_DAYS (15)` → yellow. Else no alert.
  - **IBS/G40**: due date = April 30 of current year (or next year if past). If `daysUntil <= IBS_RED_DAYS (10)` → red. Else if `<= IBS_WARN_DAYS (30)` → yellow. Else no alert.

  Export type `DocumentAlert { documentId, title, entityName, documentType, dueDate, severity: 'yellow' | 'red' | 'overdue' }`.

  Export `computeDocumentSeverity(dueDate: Date, now: Date, warnDays: number, redDays: number): 'yellow' | 'red' | 'overdue' | null`:
  - If `dueDate < now` → `'overdue'`.
  - If `daysUntil <= redDays` → `'red'`.
  - If `daysUntil <= warnDays` → `'yellow'`.
  - Else `null`.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx jest src/lib/deadlines.test.ts`
  Expected: PASS.

- [ ] **Step 5: Implement `GET /api/dashboard/deadlines`**

  1. Verify session — 401 if missing.
  2. Call `computeCalendarAlerts(new Date())`.
  3. Query all documents with a `dueDate` (any module). For each, call `computeDocumentSeverity` using `MACHINE_WARN_DAYS`/`MACHINE_RED_DAYS` for `ASSURANCE`/`CONTROLE_TECHNIQUE`, `DEFAULT_WARN_DAYS`/`DEFAULT_RED_DAYS` for all others. Include only non-null results.
  4. Return `{ calendarAlerts, documentAlerts }`.

- [ ] **Step 6: Implement `GET/POST /api/dashboard/manual-deadlines` and `DELETE /api/dashboard/manual-deadlines/[id]`**

  Standard CRUD on `ManualDeadline`. POST validates `label (required)`, `dueDate (required)`, optional `yellowDaysBefore`, `redDaysBefore`.

- [ ] **Step 7: Implement dashboard page components and `/page.tsx`**

  - `calendar-alerts-section.tsx`: renders `CalendarAlert[]` as cards with yellow/red background based on severity. Uses `ALERT_THRESHOLDS` labels.
  - `document-alerts-section.tsx`: renders `DocumentAlert[]` sorted by `dueDate asc`. Overdue items get an "En retard" badge.
  - `manual-deadline-form.tsx`: a small inline form (label, date, optional thresholds) that POSTs to `/api/dashboard/manual-deadlines`.
  - `outstanding-invoices-section.tsx`: fetches `/api/dashboard/outstanding`, renders a table with entity name, document title, amount, issue date, and `<PaidToggle>`.
  - `/page.tsx`: server component that fetches all three endpoints in parallel (`Promise.all`). Renders the four sections.

- [ ] **Step 8: Commit**

  ```bash
  git add src/ && git commit -m "feat: dashboard — calendar alerts, document deadlines, manual deadlines, outstanding invoices"
  ```

---

## Task 16: End-to-End Verification

- [ ] **Step 1: Run full test suite**

  Run: `npx jest --coverage`
  Expected: all tests pass.

- [ ] **Step 2: Manual smoke test**

  1. Log in. Verify redirect to dashboard. Verify G50 alert is visible if today is between the 10th and 20th of the month.
  2. Create a client. Upload a Facture de vente (with amount and no dueDate). Verify it appears in the client profile.
  3. Create a supplier. Upload a Facture d'achat. Mark it as "Impayé". Verify it appears in the Trésorerie reconciliation view.
  4. Create a machine. Try uploading an Assurance without a dueDate. Verify the form rejects it. Upload with dueDate 5 days from now. Verify a red alert appears on the dashboard.
  5. Open the Facture d'achat. Link it to the client's Facture de vente. Open the link. Verify both docs show the link.
  6. Go to Recherche. Search by client name. Verify only that client's documents appear.
  7. Open a PDF. Wait 13 minutes (or mock the expiry). Refocus the tab. Verify the PDF still shows.

- [ ] **Step 3: Final commit**

  ```bash
  git add . && git commit -m "chore: end-to-end verification complete"
  ```
