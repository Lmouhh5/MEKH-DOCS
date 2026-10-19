/**
 * @jest-environment node
 */
import { getSignedUrl, generateKey, uploadFile, deleteFile, minioClient, BUCKET } from './minio'

describe('minio file storage helper', () => {
  it('getSignedUrl returns a string URL for a valid key', async () => {
    const url = await getSignedUrl('test/sample.pdf')
    expect(typeof url).toBe('string')
    expect(url).toContain('test/sample.pdf')
  })

  it('generateKey formats key as module/entityId/timestamp-filename', () => {
    const keyWithEntity = generateKey('CLIENTS', 'client-123', 'facture.pdf')
    expect(keyWithEntity).toMatch(/^CLIENTS\/client-123\/\d+-facture\.pdf$/)

    const keyGlobal = generateKey('FISCALITE', null, 'g50.pdf')
    expect(keyGlobal).toMatch(/^FISCALITE\/global\/\d+-g50\.pdf$/)

    const keyUndefined = generateKey('TRESORERIE', undefined, 'releve.pdf')
    expect(keyUndefined).toMatch(/^TRESORERIE\/global\/\d+-releve\.pdf$/)
  })

  it('uploadFile calls minioClient.putObject with expected arguments', async () => {
    const putObjectSpy = jest.spyOn(minioClient, 'putObject').mockResolvedValueOnce({
      etag: 'test-etag',
      versionId: null,
    })

    const testBuffer = Buffer.from('hello pdf')
    await uploadFile(testBuffer, 'test/hello.pdf', 'application/pdf')

    expect(putObjectSpy).toHaveBeenCalledWith(
      BUCKET,
      'test/hello.pdf',
      testBuffer,
      testBuffer.length,
      { 'Content-Type': 'application/pdf' }
    )

    putObjectSpy.mockRestore()
  })

  it('deleteFile calls minioClient.removeObject with bucket and key', async () => {
    const removeObjectSpy = jest.spyOn(minioClient, 'removeObject').mockResolvedValueOnce()

    await deleteFile('test/hello.pdf')

    expect(removeObjectSpy).toHaveBeenCalledWith(BUCKET, 'test/hello.pdf')

    removeObjectSpy.mockRestore()
  })
})
