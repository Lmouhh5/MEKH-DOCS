export const Module = {
  CLIENTS: 'Clients',
  FOURNISSEURS: 'Fournisseurs',
  MATERIEL: 'Matériel & Engins',
  PERSONNEL: 'Personnel',
  TRESORERIE: 'Trésorerie',
  FISCALITE: 'Fiscalité',
} as const

export type ModuleKey = keyof typeof Module
export const MODULE_LABELS = Module

export const DocumentType = {
  FACTURE_VENTE: 'Facture de vente',
  BON_DE_LIVRAISON: 'Bon de livraison',
  CONTRAT_CLIENT: 'Contrat client',
  DEVIS: 'Devis',
  FACTURE_ACHAT: "Facture d'achat",
  BON_DE_COMMANDE: 'Bon de commande',
  BON_DE_RECEPTION: 'Bon de réception',
  CARTE_GRISE: 'Carte grise',
  ASSURANCE: 'Assurance',
  CONTROLE_TECHNIQUE: 'Contrôle technique',
  D10: 'D10',
  FACTURE_REPARATION: 'Facture de réparation',
  FICHE_DE_PAIE: 'Fiche de paie',
  CONTRAT_TRAVAIL: 'Contrat de travail',
  PIECE_IDENTITE: "Pièce d'identité",
  RELEVE_BANCAIRE: 'Relevé bancaire',
  RECU_PAIEMENT: 'Reçu de paiement',
  REGISTRE_COMMERCE: 'Registre du commerce',
  G50: 'G50',
  G4: 'G4',
  G12: 'G12',
  G40: 'G40',
  ETAT_104: 'État 104',
  CNAS_DECLARATION: 'Déclaration CNAS',
  CASNOS: 'CASNOS',
  CACOBATPH: 'CACOBATPH',
} as const

export type DocumentTypeKey = keyof typeof DocumentType
export const DOCUMENT_TYPE_LABELS = DocumentType

export const DOCUMENT_TYPES_BY_MODULE: Record<ModuleKey, DocumentTypeKey[]> = {
  CLIENTS: ['FACTURE_VENTE', 'BON_DE_LIVRAISON', 'CONTRAT_CLIENT', 'DEVIS'],
  FOURNISSEURS: ['FACTURE_ACHAT', 'BON_DE_COMMANDE', 'BON_DE_RECEPTION'],
  MATERIEL: ['CARTE_GRISE', 'ASSURANCE', 'CONTROLE_TECHNIQUE', 'D10', 'FACTURE_REPARATION'],
  PERSONNEL: ['FICHE_DE_PAIE', 'CONTRAT_TRAVAIL', 'PIECE_IDENTITE'],
  TRESORERIE: ['RELEVE_BANCAIRE', 'RECU_PAIEMENT'],
  FISCALITE: [
    'REGISTRE_COMMERCE',
    'G50',
    'G4',
    'G12',
    'G40',
    'ETAT_104',
    'CNAS_DECLARATION',
    'CASNOS',
    'CACOBATPH',
  ],
}

export const ALERT_THRESHOLDS = {
  G50_WARN_DAY: 10,
  G50_RED_DAY: 17,
  CNAS_WARN_DAYS: 15,
  CNAS_RED_DAYS: 5,
  IBS_WARN_DAYS: 30,
  IBS_RED_DAYS: 10,
  MACHINE_WARN_DAYS: 30,
  MACHINE_RED_DAYS: 7,
  DEFAULT_WARN_DAYS: 30,
  DEFAULT_RED_DAYS: 7,
} as const
