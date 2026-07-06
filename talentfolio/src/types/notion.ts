export interface NotionIntegrationPublic {
  connected: boolean;
  workspaceName: string | null;
  dataSourceId: string | null;
  propertyMapping: NotionPropertyMapping;
}

export interface NotionPropertyMapping {
  name: string;
  overallScore: string;
  verdict: string;
  ceoSummary: string;
  matchedSkills: string;
  talentfolioLink: string;
  externalId: string;
}

export interface NotionSyncResult {
  synced: number;
  failed: number;
  pages: { candidateId: string; notionPageId: string; created: boolean }[];
  errors?: string[];
}
