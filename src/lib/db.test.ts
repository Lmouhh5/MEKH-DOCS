/**
 * @jest-environment node
 */
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

  it('supports Document linked to ArchiveCluster with ARCHIVES module and ARCHIVE_DOCUMENT type', async () => {
    const cluster = await db.archiveCluster.create({
      data: { name: 'Cluster Test Document' },
    })
    const doc = await db.document.create({
      data: {
        title: 'Document Test Archive',
        documentType: 'ARCHIVE_DOCUMENT',
        module: 'ARCHIVES',
        issueDate: new Date(),
        fileKey: 'archives/test/sample.pdf',
        archiveClusterId: cluster.id,
      },
    })
    expect(doc.archiveClusterId).toBe(cluster.id)
    expect(doc.module).toBe('ARCHIVES')
    expect(doc.documentType).toBe('ARCHIVE_DOCUMENT')

    // Clean up
    await db.document.delete({ where: { id: doc.id } })
    await db.archiveCluster.delete({ where: { id: cluster.id } })
  })
})
