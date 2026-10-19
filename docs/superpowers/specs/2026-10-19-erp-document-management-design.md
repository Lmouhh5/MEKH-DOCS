# Design Document — Système de Gestion Documentaire & ERP
**Date:** 2026-10-19  
**Version:** 1.0  
**Author:** Antigravity (from conversation with Administration Manager)

---

## 1. Intent & Why

The enterprise currently manages hundreds of physical documents (invoices, delivery notes, tax declarations, machine certificates) with no enforced organizational structure. Documents are misfiled — a quotation ends up in the machine folder — making retrieval take 30 minutes instead of 30 seconds.

The system's primary job is **fast document retrieval**: given a client/supplier name, a rough date, and a document type, any document must be findable in under 30 seconds. Everything else — compliance tracking, linking, fleet management — is secondary to this goal.

The compliance dashboard is a genuine need but not a crisis fix; the team already never misses a deadline. It will reduce the mental overhead of tracking deadlines manually.

The system serves one company, operated by one primary user (Administration Manager), with room for read-only or restricted roles for future collaborators (auditors, consultants).

---

## 2. Goals

- **G1:** Retrieve any document in under 30 seconds by filtering on entity (client/supplier/machine), date range, and document type.
- **G2:** Enforce correct categorization at upload time so misfiling becomes structurally impossible.
- **G3:** Provide a compliance dashboard showing upcoming tax, social, and fleet expiration deadlines.
- **G4:** Link related documents (purchase order → delivery note → invoice) so the full chain is visible when resolving payment disputes.
- **G5:** Track invoice payment status (paid / outstanding) manually.

---

## 3. Non-Goals

- Automated invoice or payroll calculation.
- Multi-company management.
- Granular machine hour-meter or GPS site tracking.
- Automated payroll processing.
- Any integration with Algerian government systems.

---

## 4. Anti-Goals (What Would Make This a Failure)

- A system where documents can still be uploaded to the wrong module with no guardrails.
- A search interface that requires knowing the exact filename.
- A dashboard so busy with alerts that real deadlines get lost in noise.
- PDF files accessible via a raw URL without authentication.

---

## 5. Constraints

- **Single company:** no multi-tenant architecture needed.
- **Language:** French throughout the UI. Document type names use Algerian administrative vocabulary (Bon de livraison, Facture d'achat, G50, etc.).
- **Scale:** hundreds of documents (not tens of thousands). No exotic search engine required; PostgreSQL filtered queries are sufficient.
- **Physical location:** stored as metadata (for audits) but not used as a retrieval path. The PDF on screen is sufficient for daily work.

---

## 6. Tech Stack (Decided)

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| UI | React, Tailwind CSS, Shadcn UI |
| Auth | NextAuth.js (credentials provider — username + password with bcrypt) |
| Database | PostgreSQL via Prisma ORM |
| File Storage | MinIO, self-hosted on the office server |
| Language | French |

### 6.1 Deployment Environment

The system runs on a single computer inside the office, accessed over the local network (LAN) only. No internet exposure. This means:

- **MinIO** is the file storage backend (self-hosted, same machine or local server).
- **Authentication** uses a simple credentials provider (username + password, bcrypt-hashed). No OAuth or magic-link complexity needed.
- **HTTPS** is recommended but not strictly required for v1 on a trusted LAN.
- No CDN, no external DNS, no cloud infrastructure.

---

## 7. Architecture Overview

### 7.1 Core Concept: Module-Enforced Upload

Every document upload is **always made from within a module context** — you cannot upload a document from a neutral "upload" screen. You upload a Facture d'achat from within a supplier's profile, a Bon de livraison from within a client's profile, or an Assurance certificate from within a machine's profile. This makes misfiling structurally impossible because the module and entity are set before the file is chosen.

### 7.2 Document Record Schema (universal across all modules)

Every uploaded document, regardless of module, shares a common structure:

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | Free text name |
| `documentType` | Yes | Enum per module (see §8) |
| `issueDate` | Yes | Date of the document |
| `dueDate` | No | Used for deadline tracking |
| `amount` | No | Entered manually from the PDF |
| `isPaid` | No | Boolean toggle; only for invoices |
| `physicalLocation` | No | e.g., "Armoire A, Boîte 2" |
| `notes` | No | Free text |
| `fileUrl` | Yes | Signed S3/MinIO URL |
| `module` | Yes | System-set (Clients, Fournisseurs, etc.) |
| `entityId` | Yes | FK to client / supplier / machine / worker |

### 7.3 Search & Retrieval (Primary Feature)

A global search bar + filter panel, always visible, with three axes:

1. **Entité** — client name, supplier name, machine ID, or worker name (autocomplete)
2. **Période** — date range picker (issue date)
3. **Type de document** — dropdown of all document types across all modules

Results appear as a flat list ordered by issue date descending. Clicking a result opens the PDF viewer and the document's full metadata in a side panel. From there, linked documents are visible and clickable.

This is the most important screen in the application. It must be reachable in one click from anywhere.

---

## 8. Modules

### 8.1 Clients (Ventes)

**Entity data:** Nom, NIF, Téléphone, Adresse  
**Document types:** Facture de vente, Bon de livraison, Contrat, Devis (quotation)  
**Key behavior:** Factures de vente have `isPaid` toggle and optional `dueDate`.

### 8.2 Fournisseurs (Achats)

**Entity data:** Nom, NIF, Téléphone, Adresse  
**Document types:** Facture d'achat, Bon de commande, Bon de réception  
**Key behavior:** Bon de commande → Bon de réception → Facture d'achat is the canonical link chain. Factures d'achat have `isPaid` toggle.

### 8.3 Matériel & Engins (Flotte)

**Entity data:** ID machine, Marque/Modèle, Numéro de série / VIN, Matricule, Statut (Actif / En maintenance / Hors service)  
**Document types:** Carte grise, Assurance, Contrôle technique, D10 (Douane/Conformité), Facture de réparation (linked from Fournisseurs)  
**Key behavior:** Assurance and Contrôle technique always require a `dueDate` — this feeds the dashboard alerts. Factures de réparation are supplier invoices linked to a machine profile (cross-module link).

### 8.4 Personnel (RH)

**Entity data:** Nom, Numéro d'identification, Date de début de contrat, Numéro CNAS  
**Document types:** Fiche de paie (monthly), Contrat de travail, Scan de pièce d'identité  
**Key behavior:** Fiche de paie records are grouped and browsable by month/year.

### 8.5 Trésorerie & Banque

**No entity profiles.** Documents are uploaded directly to this module.  
**Document types:** Relevé bancaire, Reçu de paiement  
**Key behavior:** The "outstanding invoices" list (from Clients and Fournisseurs where `isPaid = false`) is surfaced here as a reconciliation view.

### 8.6 Fiscalité & Administration

**No entity profiles.** Documents are uploaded directly.  
**Document types:** Registre du commerce, G50, G4, G12, G40, État 104, CNAS, CASNOS, CACOBATPH  
**Key behavior:** All documents in this module that have a `dueDate` feed the dashboard deadline tracker.

---

## 9. Document Linking

Two documents can be linked to each other in a many-to-many relationship. The link has no direction enforced by the database — the UI presents the canonical chain (e.g., BC → BR → FA) as a visual suggestion, but the user assembles it manually.

**Use cases:**
- Resolve a supplier payment dispute: open the Facture d'achat, see the linked Bon de réception and Bon de commande instantly.
- Periodic audit: review a client's full transaction chain.

Linking is done from a document's detail view via a search-and-select widget (search by title, type, or entity name).

---

## 10. Dashboard — Tableau de Suivi des Échéances

The home page. Two sections:

### 10.1 Échéances à venir

The dashboard has **two independent sources** of deadline alerts:

#### A. Règles calendaires automatiques (hardcoded, always-on)

These fire automatically based on the current date — no document upload required. They represent fixed Algerian fiscal obligations.

| Obligation | Fréquence | Avertissement (jaune) | Alerte (rouge) |
|---|---|---|---|
| G50 (TVA/TAP) | Mensuel, dû le 20 | À partir du 10 du mois | À partir du 17 du mois |
| CNAS | Trimestriel | 15 jours avant fin de trimestre | 5 jours avant fin de trimestre |
| IBS / G40 | Annuel | 30 jours avant | 10 jours avant |

These alerts are always visible in the correct window, even if no document has been uploaded for that period yet.

#### B. Échéances manuelles (document-based + custom entries)

Two sub-sources feed this section:

1. **Documents avec une `dueDate`:** any document in the system with a due date (machine insurance, contrôle technique, any uploaded G50, CASNOS, etc.) appears here when it enters its alert window.
2. **Entrées manuelles:** a simple form on the dashboard lets the admin add a one-off deadline (label + date) without uploading a document. Useful for ad-hoc reminders.

| Alert type | Yellow (warning) | Red (urgent) |
|---|---|---|
| Assurance engin | 30 jours avant expiration | 7 jours avant expiration |
| Contrôle technique | 30 jours avant expiration | 7 jours avant expiration |
| Tout document avec dueDate | 30 jours avant | 7 jours avant (default) |
| Entrée manuelle | configurable | configurable |

Past-due items (any source) appear in red with a badge **"En retard"**.

### 10.2 Factures impayées

A persistent list of all documents where `isPaid = false`, from both Clients (receivables) and Fournisseurs (payables), with entity name, amount, and issue date. One-click toggle to mark paid.

**Performance target:** Dashboard must load in under 1.5 seconds. Both sections are simple indexed PostgreSQL queries — no computation needed at render time.

---

## 11. Security

- PDF files are stored on MinIO (self-hosted, local network). The database stores only the object key, never the raw URL.
- File access goes through a Next.js API route that verifies the user's session (NextAuth) before generating a short-lived signed URL (15-minute expiry).
- Direct object URLs are blocked at the MinIO bucket level (bucket is private, no public access policy).
- **Signed URL refresh strategy (builder call):** When the PDF viewer tab regains focus, the client fetches a fresh signed URL if the current one is within 2 minutes of expiry. This prevents the PDF going blank mid-session without requiring background polling.
- On a trusted LAN, the primary attack surface is unauthorized access to the app itself, not network interception. The credentials + session cookie model is sufficient.

---

## 12. Role-Based Access

| Role | Permissions |
|---|---|
| Admin | Full read, write, delete across all modules. Manage users. Configure alert thresholds. |
| Manager (future) | Read/write on assigned modules only. No user management. |
| Viewer (future) | Read-only across assigned modules. No upload or delete. |

Currently only the Admin role is needed. The RBAC structure is built in from the start so future roles require no architectural changes.

---

## 13. What Is Left to the Builder

- Exact Prisma schema field names and index strategy.
- Pagination strategy for the document list (cursor-based or offset).
- Exact Shadcn component choices for the PDF viewer (embed vs. iframe vs. react-pdf).
- MinIO vs. AWS S3 selection (same API; choose based on deployment environment).
- Exact signed URL expiry duration (15 minutes is a sensible default).
- Email or in-app notification strategy for deadline alerts (not specified; builder may omit notifications in v1 and rely on the dashboard alone).
- Deployment platform (Vercel, VPS, Docker — not specified).
