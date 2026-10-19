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
