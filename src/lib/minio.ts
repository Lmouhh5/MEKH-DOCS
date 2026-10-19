// MinIO client stub - to be implemented in Task 4

export async function uploadFile(file: Buffer, key: string, mimetype: string): Promise<void> {
  void file
  void key
  void mimetype
  throw new Error('Not implemented yet - planned for Task 4')
}

export async function getSignedUrl(key: string): Promise<string> {
  void key
  throw new Error('Not implemented yet - planned for Task 4')
}

export function generateKey(module: string, entityId: string | null | undefined, filename: string): string {
  return `${module}/${entityId ?? 'global'}/${Date.now()}-${filename}`
}
