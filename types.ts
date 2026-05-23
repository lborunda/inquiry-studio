
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
  image?: string;
  critiqueId?: string;
  isRefusal?: boolean;
  refusalReason?: string;
  hasCitations?: boolean;
}

export interface Comment {
  id: string;
  text: string;
  source: 'ai' | 'peer' | 'instructor' | 'self';
  timestamp: number;
  contextText: string;
  resolved?: boolean;
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

export interface VersionEvent {
  id: string;
  timestamp: number;
  text: string;
  label?: string;
  trigger: 'manual' | 'pre-critique' | 'post-revision' | 'phase-transition';
  linkedCritiqueId?: string;
  addressedFeedbackItems?: string[];
  rationale?: string;
}

export interface CritiqueItem {
  id: string;
  index: number;
  text: string;
  section?: string;
  status?: 'addressed' | 'partially-addressed' | 'disagreed';
}

export interface CritiqueEvent {
  id: string;
  timestamp: number;
  items: CritiqueItem[];
  priorVersionId: string;
  stage: string;
  sliderValue: number;
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  writingText: string;
  chatHistory: ChatMessage[];
  studentFiles: UploadedFile[];
  conceptMapNodes: ConceptNode[];
  versions?: any[]; // legacy
  versionEvents: VersionEvent[];
  critiqueEvents: CritiqueEvent[];
  comments?: Comment[];
  sessionGoals?: { text: string; checklist: {id: string; text: string; completed: boolean;}[] };
  expertiseLevel?: 'novice' | 'intermediate' | 'advanced';
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
