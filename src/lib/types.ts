export interface DocumentSummary {
  id: string;
  title: string;
  documentType: string;
  module: string;
  issueDate: string;
  dueDate?: string;
  amount?: number;
  isPaid?: boolean;
  entityName?: string;
}

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
