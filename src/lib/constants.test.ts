import { Module, DocumentType, DOCUMENT_TYPES_BY_MODULE, ALERT_THRESHOLDS } from '@/lib/constants'

describe('Application Constants', () => {
  it('defines all required modules', () => {
    expect(Module.CLIENTS).toBe('Clients')
    expect(Module.FOURNISSEURS).toBe('Fournisseurs')
    expect(Module.MATERIEL).toBe('Matériel & Engins')
    expect(Module.PERSONNEL).toBe('Personnel')
    expect(Module.TRESORERIE).toBe('Trésorerie')
    expect(Module.FISCALITE).toBe('Fiscalité')
    expect(Module.ARCHIVES).toBe('Archives')
  })

  it('defines document types with French labels', () => {
    expect(DocumentType.FACTURE_VENTE).toBe('Facture de vente')
    expect(DocumentType.BON_DE_LIVRAISON).toBe('Bon de livraison')
    expect(DocumentType.FACTURE_ACHAT).toBe("Facture d'achat")
    expect(DocumentType.G50).toBe('G50')
    expect(DocumentType.ARCHIVE_DOCUMENT).toBe("Document d'archive")
  })

  it('maps allowed document types for each module', () => {
    expect(DOCUMENT_TYPES_BY_MODULE.CLIENTS).toContain('FACTURE_VENTE')
    expect(DOCUMENT_TYPES_BY_MODULE.CLIENTS).toContain('BON_DE_LIVRAISON')
    expect(DOCUMENT_TYPES_BY_MODULE.FOURNISSEURS).toContain('FACTURE_ACHAT')
    expect(DOCUMENT_TYPES_BY_MODULE.MATERIEL).toContain('ASSURANCE')
    expect(DOCUMENT_TYPES_BY_MODULE.MATERIEL).toContain('CONTROLE_TECHNIQUE')
    expect(DOCUMENT_TYPES_BY_MODULE.PERSONNEL).toContain('FICHE_DE_PAIE')
    expect(DOCUMENT_TYPES_BY_MODULE.TRESORERIE).toContain('RELEVE_BANCAIRE')
    expect(DOCUMENT_TYPES_BY_MODULE.FISCALITE).toContain('G50')
    expect(DOCUMENT_TYPES_BY_MODULE.ARCHIVES).toEqual(['ARCHIVE_DOCUMENT'])
  })

  it('has exact compliance alert thresholds from spec', () => {
    expect(ALERT_THRESHOLDS.G50_WARN_DAY).toBe(10)
    expect(ALERT_THRESHOLDS.G50_RED_DAY).toBe(17)
    expect(ALERT_THRESHOLDS.CNAS_WARN_DAYS).toBe(15)
    expect(ALERT_THRESHOLDS.CNAS_RED_DAYS).toBe(5)
    expect(ALERT_THRESHOLDS.IBS_WARN_DAYS).toBe(30)
    expect(ALERT_THRESHOLDS.IBS_RED_DAYS).toBe(10)
    expect(ALERT_THRESHOLDS.MACHINE_WARN_DAYS).toBe(30)
    expect(ALERT_THRESHOLDS.MACHINE_RED_DAYS).toBe(7)
    expect(ALERT_THRESHOLDS.DEFAULT_WARN_DAYS).toBe(30)
    expect(ALERT_THRESHOLDS.DEFAULT_RED_DAYS).toBe(7)
  })
})
