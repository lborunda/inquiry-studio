
export enum InquiryStage {
  LITERATURE_REVIEW = "Literature Review",
  RESEARCH_DESIGN = "Research Design",
  COMMUNICATING_WRITING = "Communicating & Writing",
}

export enum OrbAction {
    SYNONYMS = "Synonyms in Context",
    POTENTIAL_ISSUES = "Potential Issues",
    RESEARCH = "Research Connections",
    DEFINITION = "Definition",
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  bookmarked?: boolean;
  isError?: boolean;
}

export interface UploadedFile {
  id:string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  summary?: string;
  summaryLoading?: boolean;
  dataUrl?: string;
  objectUrl?: string;
}

export interface ConceptNode {
    id: string;
    content: string;
    type: 'tension' | 'variable' | 'hypothesis' | 'evidence' | 'assumption' | 'user_selection' | 'ai_bookmark' | 'user_reference';
}

export interface ProjectVersion {
  id: string;
  timestamp: number;
  text: string;
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  writingText: string;
  chatHistory: ChatMessage[];
  studentFiles: UploadedFile[];
  conceptMapNodes: ConceptNode[];
  versions?: ProjectVersion[];
}

export interface Researcher {
  name: string;
  researchGateUrl: string;
  linkedInUrl: string;
}

export interface Topic {
  topicName: string;
  researchers: Researcher[];
}
