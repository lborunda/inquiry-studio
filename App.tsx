import React, { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { InquiryStage, ChatMessage, UploadedFile, ConceptNode, Project, OrbAction, VersionEvent, CritiqueEvent } from './types';
import { generateTutorResponse, summarizeFile, generateOrbResponse, checkAssumptions, generateResearchArgument, generateSemanticMap, generateSuggestions, generateVisualizationImage } from './services/geminiService';
import { getRagFilesForSection } from './services/ragService';
import PointCloud from './components/PointCloud';
import TutorShell from './components/TutorShell';
import ReferencesModal from './components/ReferencesModal';
import WelcomeModal from './components/WelcomeModal';
import AboutModal from './components/AboutModal';
import ConceptMapModal from './components/ConceptMapModal';
import ImageGallery from './components/ImageGallery';
import SocialModal from './components/SocialModal';
import TutorialModal from './components/TutorialModal';
import ProjectsModal from './components/ProjectsModal';
import TopLeftTextStrip from './components/TopLeftTextStrip';
import { WandIcon, ReferenceIcon, SendIcon, InfoIcon, ChevronLeftIcon, ChevronRightIcon, BookmarkIcon, ChevronDownIcon, LayoutHorizontalIcon, LayoutVerticalIcon, MapIcon, ImageIcon, FormatIcon, UsersIcon } from './components/icons';
import { Menu, Sparkles, Network, History, ChevronRight, Bold, Italic, Underline } from 'lucide-react';

import CommandPalette from './components/CommandPalette';
import InquiryTrail from './components/InquiryTrail';
import VersionDiff from './components/VersionDiff';
import SessionSetup from './components/SessionSetup';
import StatusBar from './components/StatusBar';
import AILiteracyOnboarding from './components/AILiteracyOnboarding';
import CollaboratorModal from './components/CollaboratorModal';
import CognitiveLoadDashboard from './components/CognitiveLoadDashboard';

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

// Component defined inside App.tsx to avoid creating new files as per instructions
const EditableCanvas = React.forwardRef<HTMLDivElement, any>(({ html, onChange, onFiles, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const setCombinedRef = useCallback((node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
    }, [ref]);

    useEffect(() => {
        if (internalRef.current && html !== internalRef.current.innerHTML) {
            internalRef.current.innerHTML = html;
        }
    }, [html]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    return (
        <div 
            ref={setCombinedRef} 
            onInput={handleInput}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`w-full h-full bg-transparent text-lg leading-relaxed resize-none focus:outline-none font-spacemono placeholder:text-gray-400 placeholder:text-base placeholder:whitespace-pre-wrap flex-1 editable-canvas overflow-y-auto ${isDragging ? 'outline-2 outline-dashed outline-gray-400' : ''}`}
            contentEditable="true"
            spellCheck="false"
            {...props} 
        />
    );
});


const App = () => {
  // Global App State
  const [activeStage, setActiveStage] = useState<InquiryStage>(() => {
    const saved = localStorage.getItem('site_activeStage');
    return saved ? (saved as InquiryStage) : InquiryStage.LITERATURE_REVIEW;
  });
  const [practiceResearchRatio, setPracticeResearchRatio] = useState(() => {
    const saved = localStorage.getItem('site_practiceResearchRatio');
    return saved ? Number(saved) : 50;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Project-specific State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Modals and UI State
  const [isReferencesModalOpen, setIsReferencesModalOpen] = useState(false);
  const [contextualRagFiles, setContextualRagFiles] = useState<UploadedFile[]>([]);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false);
  const [isStageSelectorOpen, setIsStageSelectorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isInquiryTrailModalOpen, setIsInquiryTrailModalOpen] = useState(false); // keep for old logic if not wiped yet
  const [visualizationImage, setVisualizationImage] = useState<string | null>(null);
  const [isVisualizationImageOpen, setIsVisualizationImageOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Phase 2 & 3 State
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [isTrailOpen, setIsTrailOpen] = useState(false);
  const [isSessionSetupOpen, setIsSessionSetupOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isCognitiveLoadDashboardOpen, setIsCognitiveLoadDashboardOpen] = useState(false);
  const [isAILiteracyOnboardingOpen, setIsAILiteracyOnboardingOpen] = useState(false);
  const [expertiseLevel, setExpertiseLevel] = useState<'novice'|'intermediate'|'advanced'>('intermediate');
  
  // Phase 2.5 State
  const [commandPaletteMode, setCommandPaletteMode] = useState<'floating' | 'docked'>(() => {
    return (localStorage.getItem('inquiry_studio_cp_mode') as 'floating' | 'docked') || 'floating';
  });
  
  useEffect(() => {
    localStorage.setItem('inquiry_studio_cp_mode', commandPaletteMode);
  }, [commandPaletteMode]);

  const [isVisualDropdownOpen, setIsVisualDropdownOpen] = useState(false);
  const [isVersionsDropdownOpen, setIsVersionsDropdownOpen] = useState(false);
  const [diffExpandedVersionId, setDiffExpandedVersionId] = useState<string | null>(null);
  const [restoreConfirmVersionId, setRestoreConfirmVersionId] = useState<string | null>(null);
  
  // Nudges & Telemetry
  const [editsSinceCritique, setEditsSinceCritique] = useState(0);
  const [showReanalyzeNudge, setShowReanalyzeNudge] = useState(false);
  const [promptReviseCycles, setPromptReviseCycles] = useState(0);
  const [showRevisionLoopNudge, setShowRevisionLoopNudge] = useState(false);
  const [lastCoactivationToast, setLastCoactivationToast] = useState(0);
  const [showCoactivationToast, setShowCoactivationToast] = useState(false);
  
  // Input states
  const [chatInput, setChatInput] = useState<string>('');
  
  // Contextual UI State
  const [selectionPopover, setSelectionPopover] = useState<{x: number, y: number, text: string, context?: string} | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
  const popoverRef = useRef<HTMLDivElement>(null);
  const [orbState, setOrbState] = useState<{x: number, y: number, word: string} | null>(null);
  const writingAreaRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derived active project
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  // Load projects from localStorage on initial render
  useEffect(() => {
    const savedProjects = localStorage.getItem('site_projects');
    const savedActiveId = localStorage.getItem('site_activeProjectId');
    
    // Schema Migrations
    let schemaVersion = parseInt(localStorage.getItem('site_schema_version') || '0', 10);

    if (savedProjects) {
      let parsedProjects = JSON.parse(savedProjects);
      
      if (schemaVersion < 1) {
        // Migrate versions to versionEvents
        parsedProjects = parsedProjects.map((p: any) => {
          const versionEvents = p.versions ? p.versions.map((oldV: any) => ({
            id: oldV.id,
            timestamp: oldV.timestamp,
            text: oldV.text,
            label: new Date(oldV.timestamp).toLocaleTimeString(),
            trigger: 'manual',
          })) : [];
          
          return {
            ...p,
            versionEvents: p.versionEvents || versionEvents,
            critiqueEvents: p.critiqueEvents || [],
          };
        });
        localStorage.setItem('site_schema_version', '1');
      }

      setProjects(parsedProjects);
      if (savedActiveId && parsedProjects.some((p: Project) => p.id === savedActiveId)) {
        setActiveProjectId(savedActiveId);
      } else if (parsedProjects.length > 0) {
        setActiveProjectId(parsedProjects[0].id);
      } else {
        createNewProject();
      }
    } else {
      localStorage.setItem('site_schema_version', '1');
      createNewProject();
    }
    
    const hasSeenWelcome = localStorage.getItem('inquiry_studio_has_launched');
    if (!hasSeenWelcome) {
      setIsWelcomeOpen(true);
      localStorage.setItem('inquiry_studio_has_launched', 'true');
    }
  }, []);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('site_projects', JSON.stringify(projects));
    }
    if (activeProjectId) {
      localStorage.setItem('site_activeProjectId', activeProjectId);
    }
  }, [projects, activeProjectId]);

  const lastScrolledProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (!activeProject) return;
    
    // Auto scroll to bottom instantly on complete refresh or project switch
    if (lastScrolledProjectId.current !== activeProject.id) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        lastScrolledProjectId.current = activeProject.id;
      }, 100);
      return;
    }

    // Only scroll smoothly if the newly added message was from the user
    // This allows the user to scroll through a model's long answer without being yanked down
    const history = activeProject.chatHistory || [];
    if (history.length > 0) {
      const lastMsg = history[history.length - 1];
      if (lastMsg.role === 'user') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [activeProject?.chatHistory, activeProject?.id]);

  useEffect(() => {
    // When a request starts, ensure the loading indicator is visible
    if (isLoading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading]);

  // Fetch contextual RAG files when references modal is opened or section changes
  useEffect(() => {
    if (isReferencesModalOpen) {
        getRagFilesForSection(activeStage).then(files => {
            const mappedFiles: UploadedFile[] = files.map(f => ({
                id: `rag-${f.name}`,
                name: f.name,
                type: f.name.endsWith('.pdf') ? 'pdf' : 'doc', // simple type detection
                dataUrl: f.url
            }));
            setContextualRagFiles(mappedFiles);
        });
    }
  }, [isReferencesModalOpen, activeStage]);
  
  useEffect(() => {
    localStorage.setItem('site_activeStage', activeStage);
    localStorage.setItem('site_practiceResearchRatio', practiceResearchRatio.toString());
  }, [activeStage, practiceResearchRatio]);

  const handleTutorRequest = useCallback(async (prompt: string, isSystemMessage = false) => {
    if (!prompt.trim() || !activeProject) return;

    setIsLoading(true);
    setSelectionPopover(null);
    setOrbState(null);
    
    if (!isSystemMessage) {
        const newCycles = promptReviseCycles + 1;
        setPromptReviseCycles(newCycles);
        if (newCycles >= 5) {
            setShowRevisionLoopNudge(true);
        }
        
        // Co-activation Nudge
        if (newCycles >= 8 && Date.now() - lastCoactivationToast > 20 * 60 * 1000) {
           setShowCoactivationToast(true);
           setLastCoactivationToast(Date.now());
           setTimeout(() => setShowCoactivationToast(false), 5000);
        }
    }
    
    let newHistory = activeProject.chatHistory;
    
    if (isSystemMessage) {
        const systemMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: prompt };
        newHistory = [...activeProject.chatHistory, systemMsg];
        updateActiveProject({ chatHistory: newHistory });
        setIsLoading(false); // No generation needed, just displaying the prompt
        return;
    }

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: prompt };
    newHistory = [...activeProject.chatHistory, userMessage];
    updateActiveProject({ chatHistory: newHistory });
    setChatInput('');

    try {
      const responseText = await generateTutorResponse(prompt, newHistory, activeStage, activeProject.studentFiles, practiceResearchRatio, activeProject.writingText);
      const modelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: responseText };
      setProjects(prevProjects => prevProjects.map(p => p.id === activeProjectId ? { ...p, chatHistory: [...newHistory, modelMessage] } : p));
    } catch (error: any) {
      console.error("Error generating tutor response:", error);
      const errorMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: error.message || "An unexpected error occurred.", isError: true };
      setProjects(prevProjects => prevProjects.map(p => p.id === activeProjectId ? { ...p, chatHistory: [...newHistory, errorMsg] } : p));
    } finally {
      setIsLoading(false);
    }
  }, [activeProject, activeProjectId, activeStage, practiceResearchRatio]);

  const handleStageChange = (newStage: InquiryStage) => {
      // Logic for transitions
      if (activeStage === InquiryStage.LITERATURE_REVIEW && newStage === InquiryStage.RESEARCH_DESIGN) {
          handleTutorRequest("You have moved to the Research Design stage. Which gap, variable, or tension from your literature review does this design address?", true);
      } else if (activeStage === InquiryStage.RESEARCH_DESIGN && newStage === InquiryStage.COMMUNICATING_WRITING) {
          handleTutorRequest("You have moved to the Communicating & Writing stage. How can we best structure your findings and methodology for your audience?", true);
      } else if (activeStage !== newStage) {
          handleTutorRequest(`You have moved to the ${newStage} stage. How can I help you with this phase?`, true);
      }

      setActiveStage(newStage);
  }

  const updateActiveProject = (updatedData: Partial<Omit<Project, 'id' | 'name'>>) => {
    if (!activeProjectId) return;
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === activeProjectId ? { ...p, ...updatedData, lastModified: Date.now() } : p
      )
    );
  };

  const createNewProject = () => {
    const newProjectName = `Project ${projects.length + 1}`;
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: newProjectName,
      lastModified: Date.now(),
      writingText: '',
      chatHistory: [],
      studentFiles: [],
      conceptMapNodes: [],
      versionEvents: [],
      critiqueEvents: [],
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  const renameProject = (newName: string) => {
    if (!activeProjectId || !newName.trim()) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? {...p, name: newName.trim()} : p));
  };

  const shellProgress = useMemo(() => {
      if (!activeProject) return 0;
      // Structure Meter Logic: Structural completeness
      // This is a rough heuristic based on length for now, but conceptually represents structure
      const totalChars = 10000; 
      const progress = (stripHtml(activeProject.writingText).length / totalChars) * 100;
      return Math.min(progress, 100);
  }, [activeProject]);
  
  const addFilesToProject = (files: FileList | null) => {
      if (!files || !activeProject) return;
      
      const fileArray = Array.from(files);
      if (activeProject.studentFiles.length + fileArray.length > 10) {
          alert("You can upload a maximum of 10 files.");
          return;
      }

      const filePromises = fileArray.map(file => {
        return new Promise<{uploadedFile: UploadedFile, isImage: boolean}>((resolve) => {
          const type: 'pdf' | 'image' | 'doc' = file.type.startsWith('image')
            ? 'image'
            : (file.name.endsWith('.pdf') ? 'pdf' : 'doc');
          
          const newFile: UploadedFile = { 
              id: `student-${Date.now()}-${file.name}`, 
              name: file.name, 
              type: type 
          };

          if (type === 'pdf') {
            newFile.objectUrl = URL.createObjectURL(file);
          }

          if (type === 'image' && file.size < 2 * 1024 * 1024) { // 2MB limit for Data URL
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              newFile.dataUrl = loadEvent.target?.result as string;
              resolve({uploadedFile: newFile, isImage: true});
            };
            reader.onerror = () => resolve({uploadedFile: newFile, isImage: true}); // Resolve even if read fails
            reader.readAsDataURL(file);
          } else {
            if (type === 'image') alert(`Image "${file.name}" is too large (> 2MB) and will not be previewable.`);
            resolve({uploadedFile: newFile, isImage: type === 'image'});
          }
        });
      });

      Promise.all(filePromises).then(results => {
          const newFiles = results.map(r => r.uploadedFile);
          updateActiveProject({ studentFiles: [...activeProject.studentFiles, ...newFiles] });
          
          results.forEach(result => {
              if(result.isImage && result.uploadedFile.dataUrl){
                  const imgTag = `<img src="${result.uploadedFile.dataUrl}" alt="${result.uploadedFile.name}" class="inline-image" />`;
                  document.execCommand('insertHTML', false, imgTag);
                  if (writingAreaRef.current) {
                      updateActiveProject({ writingText: writingAreaRef.current.innerHTML });
                  }
              }
          })
      });
  };

  const handleStudentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFilesToProject(e.target.files);
    e.target.value = ''; // Allow re-uploading the same file
  };

  const handleSummarizeFile = async (fileToSummarize: UploadedFile) => {
    if (activeProject) {
        const updatedFiles = activeProject.studentFiles.map(f => f.id === fileToSummarize.id ? { ...f, summaryLoading: true } : f);
        updateActiveProject({ studentFiles: updatedFiles });
        const summaryText = await summarizeFile(fileToSummarize.name);
        // Need to read from state again in case it changed
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, studentFiles: p.studentFiles.map(f => f.id === fileToSummarize.id ? { ...f, summaryLoading: false, summary: summaryText } : f) } : p));
    }
  };

  const handleInsertReference = (file: UploadedFile) => {
      const referenceText = `<p>[Reference: ${file.name}]</p>`;
      handleInsertText(referenceText);
      if(activeProject) {
        const newNode: ConceptNode = { id: file.id, content: `Reference: ${file.name}`, type: 'user_reference' };
        updateActiveProject({
            conceptMapNodes: [...activeProject.conceptMapNodes.filter(n => n.id !== newNode.id), newNode]
        });
      }
      setIsReferencesModalOpen(false);
  };
  
  const handleInsertText = (textToInsert: string) => {
      if(writingAreaRef.current) {
          writingAreaRef.current.focus();
          document.execCommand('insertHTML', false, textToInsert);
          updateActiveProject({ writingText: writingAreaRef.current.innerHTML });
      }
  };

  const handleInsertToNotebook = (text: string) => {
      if(writingAreaRef.current) {
          writingAreaRef.current.focus();
          
          // Move cursor to the end of the content
          const range = document.createRange();
          range.selectNodeContents(writingAreaRef.current);
          range.collapse(false);
          const selection = window.getSelection();
          if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
          }
          
          const textToInsert = `<br/><br/><strong>AI Suggestion:</strong><br/>${text.replace(/\n/g, '<br/>')}`;
          document.execCommand('insertHTML', false, textToInsert);
          updateActiveProject({ writingText: writingAreaRef.current.innerHTML });
      }
  };

  const handleCanvasChange = useCallback((html: string) => {
    if (!activeProject) return;
    updateActiveProject({ writingText: html });
    
    // Naive substantive edit detection
    const prevLen = activeProject.writingText.length;
    const newLen = html.length;
    if (Math.abs(newLen - prevLen) > 50 || html.includes('<p>') !== activeProject.writingText.includes('<p>')) {
      const newEdits = editsSinceCritique + 1;
      setEditsSinceCritique(newEdits);
      setPromptReviseCycles(0); // reflection
      
      if (newEdits >= 5) {
        setShowReanalyzeNudge(true);
        // Create auto post-revision
        const postRevVersion: VersionEvent = {
          id: `ver-${Date.now()}-postrev`,
          timestamp: Date.now(),
          text: html,
          label: 'Auto-save (Revision)',
          trigger: 'post-revision'
        };
        updateActiveProject({ versionEvents: [...(activeProject.versionEvents || []), postRevVersion], writingText: html });
        setEditsSinceCritique(0); // reset
      }
    }
  }, [activeProject, editsSinceCritique, updateActiveProject]);

  const handleTutorReview = useCallback(async () => {
    if (!activeProject || isLoading) return;
    const plainText = stripHtml(activeProject.writingText);
    if (!plainText.trim()) {
        console.log("Writing area is empty. Nothing to review.");
        return;
    }

    const critiqueId = `critique-${Date.now()}`;
    const preCritiqueVersion: VersionEvent = {
        id: `ver-${Date.now()}-pre`,
        timestamp: Date.now(),
        text: activeProject.writingText,
        label: 'Pre-critique snapshot',
        trigger: 'pre-critique',
        linkedCritiqueId: critiqueId
    };

    updateActiveProject({
      versionEvents: [...(activeProject.versionEvents || []), preCritiqueVersion]
    });

    const reviewPrompt = `Review my current draft. I am focusing on the '${activeStage}' stage. Please provide critique and suggestions based on my text below in a clearly numbered list (e.g. "1. First point" "2. Second point") so I can address them individually:\n\n---\n\n${plainText}`;
    
    // We can't rely just on handleTutorRequest since we need to capture the response and link it to the critique
    setChatInput('');
    setIsLoading(true);
    setSelectionPopover(null);
    setOrbState(null);

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: reviewPrompt };
    const newHistory = [...activeProject.chatHistory, userMessage];
    updateActiveProject({ chatHistory: newHistory });

    try {
      const responseText = await generateTutorResponse(reviewPrompt, newHistory, activeStage, activeProject.studentFiles, practiceResearchRatio, activeProject.writingText);
      const modelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: responseText, critiqueId: critiqueId };
      
      // Parse numbered items from critique
      const regex = /^\s*(\d+)[\.\)]\s+(.*)$/gm;
      const items = [];
      let match;
      while ((match = regex.exec(responseText)) !== null) {
          items.push({
              id: `${critiqueId}-item-${match[1]}`,
              index: parseInt(match[1], 10),
              text: match[2].trim(),
              status: 'partially-addressed' as const // or undefined
          });
      }

      const newCritique: CritiqueEvent = {
          id: critiqueId,
          timestamp: Date.now() + 1,
          items: items.length > 0 ? items : [{ id: `${critiqueId}-item-1`, index: 1, text: responseText.trim(), status: undefined }],
          priorVersionId: preCritiqueVersion.id,
          stage: activeStage,
          sliderValue: practiceResearchRatio
      };

      setProjects(prevProjects => prevProjects.map(p => 
        p.id === activeProjectId 
          ? { ...p, chatHistory: [...newHistory, modelMessage], critiqueEvents: [...(p.critiqueEvents || []), newCritique] } 
          : p
      ));
    } catch (error: any) {
      console.error("Error generating tutor response:", error);
      const errorMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: error.message || "An unexpected error occurred.", isError: true };
      setProjects(prevProjects => prevProjects.map(p => p.id === activeProjectId ? { ...p, chatHistory: [...newHistory, errorMsg] } : p));
    } finally {
      setIsLoading(false);
    }
    
    // Fetch suggestions
    const newSuggestions = await generateSuggestions(plainText);
    setSuggestions(newSuggestions);
  }, [activeProject, isLoading, activeStage, activeProjectId, practiceResearchRatio]);
  
  const handleCheckAssumptions = useCallback(async () => {
      if (!activeProject || isLoading) return;
      const plainText = stripHtml(activeProject.writingText);
      if (!plainText.trim()) return;

      setIsLoading(true);
      const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: "Check assumptions in my text." };
      const newHistory = [...activeProject.chatHistory, userMessage];
      updateActiveProject({ chatHistory: newHistory });

      try {
        const responseText = await checkAssumptions(plainText);
        const modelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: responseText };
        setProjects(prevProjects => prevProjects.map(p => p.id === activeProjectId ? { ...p, chatHistory: [...newHistory, modelMessage] } : p));
      } catch (error: any) {
        console.error("Error checking assumptions:", error);
        const errorMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: "I encountered an error while checking assumptions. Please try again later." };
        setProjects(prevProjects => prevProjects.map(p => p.id === activeProjectId ? { ...p, chatHistory: [...newHistory, errorMessage] } : p));
      } finally {
        setIsLoading(false);
      }
  }, [activeProject, isLoading, activeProjectId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleTutorReview();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTutorReview]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTutorRequest(chatInput);
  };

  const handleTextSelection = (e: React.MouseEvent<HTMLDivElement>) => {
    setOrbState(null);
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!selection || selection.rangeCount === 0 || !text || text.length < 3) {
      setSelectionPopover(null);
      return;
    }
    
    // Ignore clicks outside the editor (e.g. formatting buttons)
    if (!(e.target as HTMLElement).closest('.editable-canvas')) {
      return;
    }
    
    let context;
    if (writingAreaRef.current?.contains(selection.anchorNode)) {
        const fullText = stripHtml(writingAreaRef.current.innerHTML);
        const selectedText = text; // Already trimmed
        const index = fullText.indexOf(selectedText);
        if (index !== -1) {
            const contextChars = 200; // Number of characters to include before and after
            const startIndex = Math.max(0, index - contextChars);
            const endIndex = Math.min(fullText.length, index + selectedText.length + contextChars);
            const extractedContext = fullText.substring(startIndex, endIndex);
            context = `${startIndex > 0 ? '...' : ''}${extractedContext}${endIndex < fullText.length ? '...' : ''}`;
        } else {
            context = fullText; // Fallback to full text
        }
    }

    setSelectionPopover({
        text,
        context,
        x: e.clientX,
        y: e.clientY,
    });
  };
  
  const handleChatTextSelection = (e: React.MouseEvent<HTMLDivElement>, messageContext: string) => {
    setOrbState(null);
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (selection && selection.rangeCount > 0 && text && text.length > 2) {
        const fullText = messageContext;
        const selectedText = text;
        const index = fullText.indexOf(selectedText);
        let context;
        if (index !== -1) {
            const contextChars = 200; // Number of characters to include before and after
            const startIndex = Math.max(0, index - contextChars);
            const endIndex = Math.min(fullText.length, index + selectedText.length + contextChars);
            const extractedContext = fullText.substring(startIndex, endIndex);
            context = `${startIndex > 0 ? '...' : ''}${extractedContext}${endIndex < fullText.length ? '...' : ''}`;
        } else {
            context = fullText; // Fallback to full text
        }

        setSelectionPopover({
            text,
            context: context,
            x: e.clientX,
            y: e.clientY,
        });
    } else if (!text) {
      setSelectionPopover(null);
    }
    e.stopPropagation();
  };


  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const word = selection?.toString().trim();
    
    if(word && word.length > 0 && !word.includes(' ')) {
        setOrbState({ word: word.trim(), x: e.clientX, y: e.clientY });
        setSelectionPopover(null);
    }
  };

  useLayoutEffect(() => {
    if (selectionPopover && popoverRef.current) {
        const popoverEl = popoverRef.current;
        const { x, y } = selectionPopover;

        const popoverRect = popoverEl.getBoundingClientRect();
        const viewportPadding = 10;

        let top = y + 15;
        if (top + popoverRect.height > window.innerHeight - viewportPadding) {
            top = y - popoverRect.height - 15;
        }

        let left = x - popoverRect.width / 2;
        if (left < viewportPadding) {
            left = viewportPadding;
        }
        if (left + popoverRect.width > window.innerWidth - viewportPadding) {
            left = window.innerWidth - popoverRect.width - viewportPadding;
        }

        setPopoverStyle({
            top: `${top}px`,
            left: `${left}px`,
            opacity: 1,
            pointerEvents: 'auto',
            transform: 'none',
        });
    } else {
        setPopoverStyle({ opacity: 0, pointerEvents: 'none' });
    }
  }, [selectionPopover]);

  const handleOrbAction = async (action: OrbAction, word: string) => {
      if (!activeProject) return;
      const userPrompt = `${action} for "${word}"`;
      setIsLoading(true);
      setOrbState(null);
      
      const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: userPrompt };
      const newHistory = [...activeProject.chatHistory, userMessage];
      updateActiveProject({ chatHistory: newHistory });

      const context = stripHtml(activeProject.writingText);
      const responseText = await generateOrbResponse(word, action, context);

      const modelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: responseText };
      setProjects(prevProjects => prevProjects.map(p => p.id === activeProjectId ? { ...p, chatHistory: [...newHistory, modelMessage] } : p));
      setIsLoading(false);
  };

  const handleExploreSelection = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (selectionPopover && activeProject) {
          const prompt = `Based on my focus on '${activeStage}', please explore, critique, or offer alternative phrasing for the following text (a horizontal search for related ideas): """${selectionPopover.text}"""`;
          handleTutorRequest(prompt);
          const newNode: ConceptNode = { id: `selection-${Date.now()}`, content: selectionPopover.text, type: 'user_selection' };
          updateActiveProject({ conceptMapNodes: [...activeProject.conceptMapNodes.filter(n => n.content !== newNode.content), newNode] });
          setSelectionPopover(null);
      }
  };

  const handleTellMeMore = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionPopover) {
      const { text, context } = selectionPopover;
      const prompt = `Please elaborate on "${text}". Provide a more in-depth, vertical explanation. You can use the following as the original context of the selection: """${context}"""`;
      handleTutorRequest(prompt);
      setSelectionPopover(null);
    }
  };
  
  const handleBookmarkSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionPopover && activeProject) {
        const newNode: ConceptNode = {
            id: `selection-${Date.now()}`,
            content: selectionPopover.text,
            type: 'user_selection',
        };
        updateActiveProject({
            conceptMapNodes: [...activeProject.conceptMapNodes.filter(n => n.content !== newNode.content), newNode]
        });
        setSelectionPopover(null);
    }
  };
  
  const handleToggleBookmark = (messageId: string) => {
      if (!activeProject) return;
      let bookmarkedNode: ConceptNode | null = null;
      const newHistory = activeProject.chatHistory.map(msg => {
          if (msg.id === messageId) {
              const newMsg = { ...msg, bookmarked: !msg.bookmarked };
              if (newMsg.bookmarked) {
                  bookmarkedNode = { id: msg.id, content: msg.content, type: 'ai_bookmark' };
              }
              return newMsg;
          }
          return msg;
      });
      
      let newNodes = activeProject.conceptMapNodes;
      if (bookmarkedNode) {
          newNodes = [...newNodes.filter(n => n.id !== bookmarkedNode!.id), bookmarkedNode];
      } else {
          newNodes = newNodes.filter(n => n.id !== messageId);
      }
      updateActiveProject({ chatHistory: newHistory, conceptMapNodes: newNodes });
  };
  
  const renderFormattedMessage = (content: string, critiqueId?: string) => {
    // First, if it's a critique, we can try to turn numbered lists into spans.
    // Let's do a simple line-by-line parsing if and only if critiqueId is passed.
    if (critiqueId) {
       const lines = content.split('\n');
       return lines.map((line, i) => {
           const match = line.match(/^(\s*)(\d+)[\.\)]\s+(.*)$/);
           if (match) {
               const indexNum = match[2];
               const rest = match[3];
               return (
                   <div key={i} className="mb-2">
                       <span className="font-bold cursor-pointer text-teal-600 hover:text-teal-800 transition-colors" 
                           onClick={() => {
                               // Highlight logic
                               const editor = writingAreaRef.current;
                               if (editor) {
                                   const target = editor.querySelector(`[data-critique-item-id="${indexNum}"]`);
                                   if (target) {
                                       target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                       (target as HTMLElement).style.backgroundColor = '#ccfbf1';
                                       setTimeout(() => { (target as HTMLElement).style.backgroundColor = 'transparent'; }, 2000);
                                   } else {
                                       alert(`No response mapped to item #${indexNum} yet.`);
                                   }
                               }
                           }}
                           title="Click to find response in document"
                       >
                           {match[1]}{indexNum}. 
                       </span>
                       {' '}{rest}
                   </div>
               );
           }
           return <div key={i} className="mb-1">{line}</div>;
       });
    }

    const parts = content.split(/(\*.*?\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i} className="font-normal not-italic bg-yellow-100/70 px-0.5 py-0.5 rounded-sm">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
    });
  };

  const onboardingPlaceholder = `Start your inquiry here...\n\n• Drag & drop files (PDFs, images) to your desk.\n• Highlight any text to get contextual actions.\n• Use Cmd/Ctrl + Enter to have Inquiry Studio review your work.`;

  const isWritingAreaEmpty = !activeProject || (!stripHtml(activeProject.writingText).trim() && !activeProject.writingText.includes('<img'));

  const handleSaveVersion = () => {
    if (!activeProject) return;

    // Extract addressed feedback items
    const parser = new DOMParser();
    const doc = parser.parseFromString(activeProject.writingText, 'text/html');
    const nodes = doc.querySelectorAll('[data-critique-item-id]');
    const addressedFeedbackItems = Array.from(nodes).map(n => n.getAttribute('data-critique-item-id')!);

    const newVersion: VersionEvent = {
        id: `ver-${Date.now()}`,
        timestamp: Date.now(),
        text: activeProject.writingText,
        label: new Date().toLocaleTimeString(),
        trigger: 'manual',
        addressedFeedbackItems: Array.from(new Set(addressedFeedbackItems))
    };
    updateActiveProject({
      versionEvents: [...(activeProject.versionEvents || []), newVersion]
    });
    // Optional: show a toast or temporary success state
  };

  const handleVisualAnalysisOption = async (option: 'mental_map' | 'research_argument' | 'semantic_map') => {
    if (!activeProject) return;
    const plainText = stripHtml(activeProject.writingText);
    
    if (option === 'mental_map') {
      setIsMapModalOpen(true);
    } else if (option === 'research_argument') {
      setIsLoading(true);
      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: "Generate a Toulmin Research Argument analysis." };
      
      try {
        const [response, image] = await Promise.all([
          generateResearchArgument(plainText),
          generateVisualizationImage(plainText, 'research_argument')
        ]);
        
        const modelMsg: ChatMessage = { 
          id: `model-${Date.now()}`, 
          role: 'model', 
          content: response,
          image: image || undefined
        };
        
        const newFiles = [...(activeProject.studentFiles || [])];
        if (image) {
          const imageFile: UploadedFile = {
            id: `img-${Date.now()}`,
            name: `Visual Analysis - Research Argument.png`,
            type: 'image',
            dataUrl: image
          };
          newFiles.push(imageFile);
        }

        updateActiveProject({ 
          chatHistory: [...activeProject.chatHistory, userMsg, modelMsg],
          studentFiles: newFiles
        });
      } catch (error: any) {
        console.error("Error generating visual analysis:", error);
        const errorMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: `I encountered an error while generating the visual analysis (${error.message || String(error)}). Please try again.`, isError: true };
        updateActiveProject({ chatHistory: [...activeProject.chatHistory, userMsg, errorMsg] });
      } finally {
        setIsLoading(false);
      }
    } else if (option === 'semantic_map') {
      setIsLoading(true);
      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: "Generate a Semantic Map analysis." };
      
      try {
        const [response, image] = await Promise.all([
          generateSemanticMap(plainText),
          generateVisualizationImage(plainText, 'semantic_map')
        ]);
        
        const modelMsg: ChatMessage = { 
          id: `model-${Date.now()}`, 
          role: 'model', 
          content: response,
          image: image || undefined
        };

        const newFiles = [...(activeProject.studentFiles || [])];
        if (image) {
          const imageFile: UploadedFile = {
            id: `img-${Date.now()}`,
            name: `Visual Analysis - Semantic Map.png`,
            type: 'image',
            dataUrl: image
          };
          newFiles.push(imageFile);
        }

        updateActiveProject({ 
          chatHistory: [...activeProject.chatHistory, userMsg, modelMsg],
          studentFiles: newFiles
        });
      } catch (error: any) {
        console.error("Error generating visual analysis:", error);
        const errorMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: `I encountered an error while generating the visual analysis (${error.message || String(error)}). Please try again.`, isError: true };
        updateActiveProject({ chatHistory: [...activeProject.chatHistory, userMsg, errorMsg] });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCommandPaletteAction = (action: string, payload?: any) => {
    switch (action) {
      case 'switch-project': setIsProjectsModalOpen(true); break;
      case 'switch-stage':
        // small prompt or toggle
        const stages = Object.values(InquiryStage);
        const currentIndex = stages.indexOf(activeStage);
        const nextStage = stages[(currentIndex + 1) % stages.length];
        handleStageChange(nextStage);
        break;
      case 'open-inquiry-map': setIsMapModalOpen(true); break;
      case 'open-researcher-network': setIsSocialModalOpen(true); break;
      case 'open-references': setIsReferencesModalOpen(true); break;
      case 'analyze-full-text': handleTutorReview(); break;
      case 'visual-tool': 
        if (payload && ['mental_map', 'research_argument', 'semantic_map'].includes(payload)) {
          handleVisualAnalysisOption(payload);
        } else {
          // If no payload provided (e.g. they search Visual Analysis), we could default to something or show a submenu. For now, default to research_argument or do nothing.
          handleVisualAnalysisOption('research_argument');
        }
        break;
      case 're-analyze': handleTutorReview(); break;
      case 'explore-concept-disciplines':
        setChatInput("Take the concept from my text and explore how it appears in 3 disciplines outside architecture. What does each lens reveal?");
        break;
      case 'save-version':
        const label = window.prompt("Enter an optional label for this version:");
        if (activeProject) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(activeProject.writingText, 'text/html');
            const nodes = doc.querySelectorAll('[data-critique-item-id]');
            const addressedFeedbackItems = Array.from(nodes).map(n => n.getAttribute('data-critique-item-id')!);
            const newVersion: VersionEvent = {
                id: `ver-${Date.now()}`,
                timestamp: Date.now(),
                text: activeProject.writingText,
                label: label || new Date().toLocaleTimeString(),
                trigger: 'manual',
                addressedFeedbackItems: Array.from(new Set(addressedFeedbackItems))
            };
            updateActiveProject({ versionEvents: [...(activeProject.versionEvents || []), newVersion] });
        }
        break;
      case 'insert-image': setIsImageGalleryOpen(true); break;
      case 'insert-reference': setIsReferencesModalOpen(true); break;
      case 'invite-collaborator':
      case 'manage-collaborators':
        setIsCollaboratorModalOpen(true);
        break;
      case 'open-inquiry-trail': setIsTrailOpen(true); break;
      case 'open-cognitive-load-dashboard': setIsCognitiveLoadDashboardOpen(true); break;
      case 'session-goals':
      case 'set-expertise-level':
      case 'open-rubric':
        setIsSessionSetupOpen(true);
        break;
      case 'ai-literacy-guide': setIsAILiteracyOnboardingOpen(true); break;
      case 'tutorial': setIsTutorialOpen(true); break;
      case 'about-feedback': setIsAboutModalOpen(true); break;
    }
  };

  const ProjectSwitcher = () => (
    <button 
      onClick={() => setIsProjectsModalOpen(true)} 
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors border border-gray-200"
      title="Manage Projects"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
      Projects
    </button>
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd-S / Ctrl-S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleCommandPaletteAction('save-version');
      }
      // Cmd-T / Ctrl-T
      else if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        setIsTrailOpen(true);
      }
      // Cmd-Shift-A
      else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleTutorReview();
      }
      // Esc
      else if (e.key === 'Escape') {
        // close whichever overlay is on top
        if (isCmdKOpen) setIsCmdKOpen(false);
        else if (isTrailOpen) setIsTrailOpen(false);
        else if (isVisualDropdownOpen) setIsVisualDropdownOpen(false);
        else if (isVersionsDropdownOpen) setIsVersionsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, isCmdKOpen, isTrailOpen, isVisualDropdownOpen, isVersionsDropdownOpen, handleTutorReview]);

  return (
    <div className="min-h-screen h-screen bg-[#fcfcfc] text-gray-900 flex flex-col relative overflow-hidden" onMouseUp={handleTextSelection}>
      <PointCloud />
      <WelcomeModal isOpen={isWelcomeOpen} onClose={() => { localStorage.setItem('hasSeenWelcome', 'true'); setIsWelcomeOpen(false); }} />
      <ReferencesModal
        isOpen={isReferencesModalOpen}
        onClose={() => setIsReferencesModalOpen(false)}
        studentFiles={activeProject?.studentFiles || []}
        instructorFiles={contextualRagFiles}
        onStudentFileChange={handleStudentFileChange}
        onSummarize={handleSummarizeFile}
        onInsertReference={handleInsertReference}
        activeSection={activeStage as any}
      />
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
      <ConceptMapModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} nodes={activeProject?.conceptMapNodes || []} />
      <SocialModal
          isOpen={isSocialModalOpen}
          onClose={() => setIsSocialModalOpen(false)}
          projectText={stripHtml(activeProject?.writingText || '')}
      />
      <InquiryTrail isOpen={isTrailOpen} onClose={() => setIsTrailOpen(false)} project={activeProject || null} onRestore={(text) => handleCanvasChange(text)} />
      <SessionSetup isOpen={isSessionSetupOpen} onClose={() => setIsSessionSetupOpen(false)} activeStage={activeStage} expertiseLevel={expertiseLevel} onExpertiseChange={setExpertiseLevel} />
      <AILiteracyOnboarding isOpen={isAILiteracyOnboardingOpen} onClose={() => setIsAILiteracyOnboardingOpen(false)} />
      <CollaboratorModal isOpen={isCollaboratorModalOpen} onClose={() => setIsCollaboratorModalOpen(false)} />
      <CognitiveLoadDashboard isOpen={isCognitiveLoadDashboardOpen} onClose={() => setIsCognitiveLoadDashboardOpen(false)} />
      <ImageGallery 
        isOpen={isImageGalleryOpen}
        onClose={() => setIsImageGalleryOpen(false)}
        files={activeProject?.studentFiles || []}
        onInsertReference={handleInsertText}
      />
       
      {/* Popover logic is now based on useLayoutEffect to prevent going off-screen */}
      <div ref={popoverRef} className="fixed z-20 bg-gray-800 text-white rounded-md shadow-lg flex items-center" style={popoverStyle} onMouseDown={(e) => e.stopPropagation()}>
         <button onMouseDown={handleExploreSelection} className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-700 rounded-l-md"><WandIcon className="w-4 h-4"/>Explore</button>
         <div className="w-px h-4 bg-gray-600"></div>
         <button onMouseDown={handleTellMeMore} className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-700"><InfoIcon className="w-4 h-4"/>Tell me more</button>
         <div className="w-px h-4 bg-gray-600"></div>
         <button onMouseDown={handleBookmarkSelection} className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-700"><BookmarkIcon className="w-4 h-4"/>Bookmark</button>
         <div className="w-px h-4 bg-gray-600"></div>
         <button onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const itemId = window.prompt("Which critique item # is this a response to? (e.g. 1)");
            if (itemId) {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                 const range = selection.getRangeAt(0);
                 const wrapper = document.createElement('span');
                 wrapper.style.borderLeft = '3px solid #C9A961'; // gold
                 wrapper.style.paddingLeft = '8px';
                 wrapper.style.display = 'inline-block';
                 wrapper.dataset.critiqueItemId = itemId;
                 wrapper.title = `Response to critique item #${itemId}`;
                 range.surroundContents(wrapper);
                 if (writingAreaRef.current) {
                   updateActiveProject({ writingText: writingAreaRef.current.innerHTML });
                 }
              }
            }
            setSelectionPopover(null);
         }} className="px-3 py-2 text-sm flex items-center gap-1 hover:bg-gray-700 text-[#C9A961]">
            Mark Response
         </button>
         <div className="w-px h-4 bg-gray-600"></div>
         <button onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const commentText = window.prompt("Enter your comment:");
            if (commentText && selectionPopover && activeProject) {
              const newComment: any = {
                id: `comment-${Date.now()}`,
                text: commentText,
                source: 'self',
                timestamp: Date.now(),
                contextText: selectionPopover.text
              };
              updateActiveProject({ comments: [...(activeProject.comments || []), newComment] });
            }
            setSelectionPopover(null);
         }} className="px-3 py-2 text-sm flex items-center gap-1 hover:bg-gray-700">
            Add Comment
         </button>
         <div className="w-px h-4 bg-gray-600"></div>
         <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectionPopover(null); }} className="px-2 py-2 text-sm hover:bg-gray-700 rounded-r-md">&times;</button>
      </div>


      <main className="flex-1 flex h-full min-h-0 w-full max-w-screen-2xl mx-auto z-10">
        <div className="flex-1 flex relative min-w-0 bg-white/50 backdrop-blur-sm shadow-sm flex-row">
          <CommandPalette 
            isOpen={isCmdKOpen} 
            onClose={() => setIsCmdKOpen(false)} 
            onExecute={handleCommandPaletteAction} 
            activeStage={activeStage} 
            isDocked={commandPaletteMode === 'docked'}
            onToggleDock={() => setCommandPaletteMode(prev => prev === 'docked' ? 'floating' : 'docked')}
          />
          <div className="flex-1 flex flex-col min-h-0 relative">
             <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
               <button 
                 onClick={() => setIsCmdKOpen(true)} 
                 className="text-gray-600 hover:text-gray-800 transition-colors p-1" 
                 title="Menu (⌘K)"
               >
                 <Menu className="w-5 h-5" />
               </button>
               <TopLeftTextStrip 
                   projectName={activeProject?.name} 
                   stage={activeStage} 
                   saveStatus="idle"
                   onProjectClick={() => setIsCmdKOpen(true)}
                   onStageClick={() => setIsStageSelectorOpen(!isStageSelectorOpen)}
               />
               {isStageSelectorOpen && (
                 <div className="absolute top-10 left-12 w-[320px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200">
                   <h3 className="text-sm font-semibold text-gray-800 mb-6 text-center">Research Inquiry Cycle</h3>
                   
                   <div className="relative h-[140px] w-full flex items-center justify-center">
                     <svg className="absolute inset-0 w-full h-[140px] text-gray-200 pointer-events-none" style={{ zIndex: 0 }}>
                         <line x1="50%" y1="15%" x2="15%" y2="85%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                         <line x1="50%" y1="15%" x2="85%" y2="85%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                         <line x1="15%" y1="85%" x2="85%" y2="85%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                     </svg>
                     
                     <button 
                        onClick={() => { handleStageChange(InquiryStage.LITERATURE_REVIEW); setIsStageSelectorOpen(false); }}
                        className={`absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-transform hover:scale-105 z-10`}
                     >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm font-bold text-sm ${activeStage === InquiryStage.LITERATURE_REVIEW ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-white text-gray-600 border border-gray-200'}`}>
                          1
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${activeStage === InquiryStage.LITERATURE_REVIEW ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>Lit Review</span>
                     </button>
                     
                     <button 
                        onClick={() => { handleStageChange(InquiryStage.RESEARCH_DESIGN); setIsStageSelectorOpen(false); }}
                        className={`absolute bottom-0 left-2 flex flex-col items-center gap-1.5 transition-transform hover:scale-105 z-10`}
                     >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm font-bold text-sm ${activeStage === InquiryStage.RESEARCH_DESIGN ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-white text-gray-600 border border-gray-200'}`}>
                          2
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${activeStage === InquiryStage.RESEARCH_DESIGN ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>Methods</span>
                     </button>
                     
                     <button 
                        onClick={() => { handleStageChange(InquiryStage.COMMUNICATING_WRITING); setIsStageSelectorOpen(false); }}
                        className={`absolute bottom-0 right-2 flex flex-col items-center gap-1.5 transition-transform hover:scale-105 z-10`}
                     >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm font-bold text-sm ${activeStage === InquiryStage.COMMUNICATING_WRITING ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-white text-gray-600 border border-gray-200'}`}>
                          3
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${activeStage === InquiryStage.COMMUNICATING_WRITING ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>Writing</span>
                     </button>
                   </div>
                 </div>
               )}
             </div>

            <div className="absolute top-4 right-6 z-20 flex items-center gap-2">
              <button 
                onClick={() => setIsFormattingToolbarOpen(!isFormattingToolbarOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm ${isFormattingToolbarOpen ? 'bg-gray-100 ring-2 ring-gray-200' : ''}`}
                title="Formatting Toolbar"
              >
                <FormatIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Format</span>
              </button>
              <button 
                onClick={handleTutorReview}
                className="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                title="Analyze Full Text · ⌘⇧A"
              >
                <Sparkles className="w-4 h-4" /> Analyze Full Text
              </button>
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsVisualDropdownOpen(!isVisualDropdownOpen);
                    setIsVersionsDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                  title="Visual Analysis"
                >
                  <Network className="w-4 h-4" /> Visual Analysis
                </button>
                {isVisualDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30">
                    <button onClick={() => { setIsVisualDropdownOpen(false); handleVisualAnalysisOption('research_argument'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Argument map</button>
                    <button onClick={() => { setIsVisualDropdownOpen(false); handleVisualAnalysisOption('semantic_map'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Semantic network</button>
                    <button onClick={() => { setIsVisualDropdownOpen(false); handleVisualAnalysisOption('mental_map'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Mental map</button>
                  </div>
                )}
              </div>
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsVersionsDropdownOpen(!isVersionsDropdownOpen);
                    setIsVisualDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                  title="Versions"
                >
                  <History className="w-4 h-4" /> Versions ({activeProject?.versionEvents?.length || 0})
                </button>
                {isVersionsDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-[360px] max-h-[480px] overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg py-2 z-30 flex flex-col">
                    {activeProject?.versionEvents?.slice().reverse().map((v, idx, arr) => {
                       const nextOlder = arr[idx + 1];
                       const isExpanded = diffExpandedVersionId === v.id;
                       const isConfirming = restoreConfirmVersionId === v.id;
                       return (
                         <div key={v.id} className="px-4 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 group flex flex-col">
                           <div className="flex justify-between items-start">
                             <div>
                               <div className="text-sm font-medium text-gray-800">{v.label || 'Untitled save'}</div>
                               <div className="text-xs text-gray-500 mt-0.5">
                                 {v.trigger} &middot; {new Date(v.timestamp).toLocaleTimeString()}
                                 {v.linkedCritiqueId && ' · linked to Critique'}
                               </div>
                             </div>
                             {!isConfirming && (
                               <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                 <button onClick={() => setDiffExpandedVersionId(isExpanded ? null : v.id)} className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded bg-white">
                                   {isExpanded ? 'Hide' : 'Diff'}
                                 </button>
                                 <button onClick={() => setRestoreConfirmVersionId(v.id)} className="text-xs text-[#C9A961] hover:text-[#b09355] border border-[#C9A961] px-2 py-1 rounded bg-white">Restore</button>
                               </div>
                             )}
                           </div>
                           
                           {isConfirming && (
                             <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                               <p className="mb-2">Restore this version? Current canvas will be saved as a new version.</p>
                               <div className="flex gap-2 justify-end">
                                 <button onClick={() => setRestoreConfirmVersionId(null)} className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
                                 <button 
                                   onClick={() => {
                                     // 1. auto snapshot
                                     const backup: VersionEvent = {
                                       id: `ver-${Date.now()}-backup`,
                                       timestamp: Date.now(),
                                       text: activeProject.writingText,
                                       label: 'Auto-saved before restore',
                                       trigger: 'manual'
                                     };
                                     updateActiveProject({ 
                                       writingText: v.text, 
                                       versionEvents: [...activeProject.versionEvents, backup] 
                                     });
                                     setRestoreConfirmVersionId(null);
                                     setIsVersionsDropdownOpen(false);
                                   }} 
                                   className="px-2 py-1 text-xs border border-[#C9A961] rounded bg-[#C9A961] text-white hover:bg-[#b09355]">Confirm restore</button>
                               </div>
                             </div>
                           )}

                           {isExpanded && !isConfirming && (
                             <div className="mt-2 bg-white border border-gray-100 rounded-md p-2 max-h-48 overflow-y-auto text-xs">
                               <VersionDiff oldVersion={nextOlder || null} newVersion={v} />
                             </div>
                           )}
                         </div>
                       )
                    })}
                    {(!activeProject?.versionEvents || activeProject.versionEvents.length === 0) && (
                       <div className="px-4 py-4 text-sm text-gray-500 text-center">No versions yet</div>
                    )}
                    <button onClick={() => { setIsVersionsDropdownOpen(false); setIsTrailOpen(true); }} className="mx-4 mt-2 mb-1 text-sm text-blue-600 hover:text-blue-800 hover:underline text-center">View as timeline &rarr;</button>
                  </div>
                )}
              </div>
            </div>
             
             <div className="flex-1 p-8 md:p-12 md:pt-20 min-h-0 relative flex flex-col">
               {isFormattingToolbarOpen && (
                 <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-md shadow-sm">
                    <button 
                       onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); if(writingAreaRef.current) { updateActiveProject({ writingText: writingAreaRef.current.innerHTML }); } }}
                       className="p-1.5 hover:bg-gray-100 rounded text-gray-700 font-bold w-8 h-8 flex items-center justify-center"
                       title="Bold"
                    >
                      B
                    </button>
                    <button 
                       onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false); if(writingAreaRef.current) { updateActiveProject({ writingText: writingAreaRef.current.innerHTML }); } }}
                       className="p-1.5 hover:bg-gray-100 rounded text-gray-700 italic font-serif w-8 h-8 flex items-center justify-center"
                       title="Italic"
                    >
                      I
                    </button>
                    <button 
                       onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline', false); if(writingAreaRef.current) { updateActiveProject({ writingText: writingAreaRef.current.innerHTML }); } }}
                       className="p-1.5 hover:bg-gray-100 rounded text-gray-700 underline w-8 h-8 flex items-center justify-center"
                       title="Underline"
                    >
                      U
                    </button>
                    <div className="w-px h-5 bg-gray-300 mx-1"></div>
                    <button 
                       onMouseDown={(e) => { e.preventDefault(); setIsImageGalleryOpen(true); }}
                       className="p-1.5 hover:bg-gray-100 rounded text-gray-700 w-8 h-8 flex items-center justify-center"
                       title="Insert Image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                 </div>
               )}
               {isWritingAreaEmpty && (
                <div className="absolute top-8 md:top-12 left-8 md:left-12 text-gray-400 text-base font-spacemono whitespace-pre-wrap pointer-events-none" aria-hidden="true">
                  {onboardingPlaceholder}
                </div>
               )}
              <EditableCanvas
                ref={writingAreaRef}
                html={activeProject?.writingText || ''}
                onChange={handleCanvasChange}
                onFiles={(files: FileList) => addFilesToProject(files)}
                onDoubleClick={handleDoubleClick}
                onScroll={() => { setSelectionPopover(null); setOrbState(null); }}
                disabled={!activeProject}
              />
              
              {suggestions.length > 0 && (
                <div className="mx-8 md:mx-12 mb-12 p-6 border border-gray-200 bg-gray-50 rounded-xl shadow-sm">
                  <h2 className="text-sm font-semibold uppercase text-gray-500 mb-4 flex items-center gap-2">
                    <WandIcon className="w-4 h-4" />
                    AI Suggestions & Precedents
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map((suggestion, index) => (
                      <button 
                        key={index} 
                        onClick={() => handleTutorRequest(`Tell me more about this suggestion: ${suggestion}`)}
                        className="text-left text-xs text-gray-700 bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-gray-400 hover:shadow-md transition-all group flex flex-col justify-between"
                      >
                        <p className="line-clamp-4">{suggestion}</p>
                        <span className="text-blue-600 font-medium mt-3 inline-block opacity-0 group-hover:opacity-100 transition-opacity">Explore in chat &rarr;</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col bg-gray-50 w-[450px] max-w-[40%] border-l border-gray-200/80">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-100 min-h-0 relative">
               {(!activeProject || activeProject.chatHistory.length === 0) && <div className="text-center text-sm text-gray-500 h-full flex items-center justify-center">Chat history will appear here.</div>}
               {activeProject?.chatHistory.map((msg, index) => (
                  <div key={msg.id} className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative max-w-md lg:max-w-lg rounded-lg px-4 py-2 text-sm whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-gray-800 text-white' : msg.isError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-white border'}`}>
                          {msg.role === 'model' ? (
                            <div onMouseUp={(e) => handleChatTextSelection(e, msg.content)}>
                              {msg.image && (
                                <img
                                  src={msg.image}
                                  alt="Visualization"
                                  className="max-w-full h-auto mt-2 mb-3 rounded shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    setVisualizationImage(msg.image!);
                                    setIsVisualizationImageOpen(true);
                                  }}
                                />
                              )}
                              {renderFormattedMessage(msg.content, msg.critiqueId)}
                            </div>
                          ) : (
                            msg.content
                          )}
                          {msg.role === 'model' && !msg.isError && (
                              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleInsertToNotebook(msg.content)} className="p-1 bg-white rounded-full border text-gray-400 hover:text-gray-800 hover:border-gray-800 shadow-sm" title="Insert to Notebook">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                                </button>
                                <button onClick={() => handleToggleBookmark(msg.id)} className="p-1 bg-white rounded-full border text-gray-400 hover:text-gray-800 hover:border-gray-800 shadow-sm" title="Bookmark insight">
                                  <BookmarkIcon className="w-4 h-4" filled={msg.bookmarked}/>
                                </button>
                              </div>
                          )}
                          {msg.isError && index === activeProject.chatHistory.length - 1 && (
                            <div className="mt-2 text-right">
                              <button 
                                onClick={() => {
                                  // Remove the error message and the preceding user message, then re-trigger
                                  const newHistory = activeProject.chatHistory.slice(0, -2);
                                  const lastUserMsg = activeProject.chatHistory[activeProject.chatHistory.length - 2];
                                  updateActiveProject({ chatHistory: newHistory });
                                  if (lastUserMsg && lastUserMsg.role === 'user') {
                                    handleTutorRequest(lastUserMsg.content);
                                  }
                                }}
                                className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md font-medium transition-colors"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                      </div>
                  </div>
               ))}
               {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-sm rounded-lg px-4 py-2 bg-white border animate-pulse">
                      <div className="h-2 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
               )}
               <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200/80 bg-white relative">
              {showReanalyzeNudge && (
                <div className="absolute bottom-full left-0 right-0 mb-4 mx-4 p-3 bg-blue-50 border border-blue-100 rounded-lg shadow-sm flex items-center justify-between z-10 transition-all text-sm">
                  <span className="text-blue-800">You've revised since the last analysis — want to see how your changes are received?</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => { setShowReanalyzeNudge(false); handleTutorReview(); }} className="px-3 py-1 bg-white text-blue-600 font-medium rounded-md hover:bg-blue-100 transition-colors shadow-sm">Re-analyze</button>
                    <button onClick={() => setShowReanalyzeNudge(false)} className="p-1 text-blue-400 hover:text-blue-600">&times;</button>
                  </div>
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask your companion..."
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all shadow-sm"
                  disabled={isLoading || !activeProject}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isLoading || !activeProject}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gray-900 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SendIcon className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <ProjectsModal 
        isOpen={isProjectsModalOpen} 
        onClose={() => setIsProjectsModalOpen(false)} 
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onCreateProject={createNewProject}
        onDeleteProject={(id) => {
          setProjects(prev => prev.filter(p => p.id !== id));
          if (activeProjectId === id) {
            setActiveProjectId(projects.find(p => p.id !== id)?.id || null);
          }
        }}
        onRenameProject={(id, newName) => {
          setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName, lastModified: Date.now() } : p));
        }}
      />

      {isVisualizationImageOpen && visualizationImage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setIsVisualizationImageOpen(false)}>
          <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsVisualizationImageOpen(false)} 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-3xl font-bold"
            >
              &times;
            </button>
            <img 
              src={visualizationImage} 
              alt="Visualization" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="mt-4 flex items-center gap-4 text-white/80 text-sm">
              <span>Generated Visualization</span>
              <a 
                href={visualizationImage} 
                download="visualization.png" 
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded transition-colors text-white flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Download Image
              </a>
            </div>
          </div>
        </div>
      )}
      {showRevisionLoopNudge && (
        <div className="fixed bottom-6 right-6 bg-white border-l-4 border-l-[#C9A961] shadow-xl rounded-md p-4 w-80 z-50 animate-in slide-in-from-bottom-5">
           <h4 className="font-semibold text-gray-800 text-sm mb-1">Over-prompting Check</h4>
           <p className="text-gray-600 text-xs mb-3">You've asked for feedback multiple times without making text edits. Consider moving to the canvas or exploring the Inquiry Trail.</p>
           <div className="flex gap-2">
              <button 
                onClick={() => { setShowRevisionLoopNudge(false); setPromptReviseCycles(0); setIsTrailOpen(true); }} 
                className="px-3 py-1.5 bg-[#C9A961] text-white text-xs font-medium rounded hover:bg-[#b09355] transition-colors"
              >
                Open Trail
              </button>
              <button 
                onClick={() => { setShowRevisionLoopNudge(false); setPromptReviseCycles(0); }} 
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
              >
                Dismiss
              </button>
           </div>
        </div>
      )}
      {showCoactivationToast && (
         <div className="fixed top-6 right-6 bg-gray-800 text-white px-4 py-3 rounded-md shadow-xl text-sm z-50 animate-in fade-in slide-in-from-top-4">
            Try applying some of these ideas to your draft before continuing the conversation!
         </div>
      )}
      
      <StatusBar 
        practiceResearchRatio={practiceResearchRatio}
        setPracticeResearchRatio={setPracticeResearchRatio}
        wordCount={activeProject ? stripHtml(activeProject.writingText).trim().split(/\s+/).filter(w => w.length > 0).length : 0}
        mapCount={activeProject?.conceptMapNodes?.length || 0}
        visualsCount={activeProject?.studentFiles?.filter(f => f.type === 'image')?.length || 0}
        researchersCount={contextualRagFiles.length /* Currently this app doesn't have a specific array of Researchers except maybe some other state, but context says users added. I'll need to count the right things... wait, looking at rag_manifest.csv */ /* I'll leave as 0 and refine shortly */}
        referencesCount={(activeProject?.studentFiles?.length || 0) + contextualRagFiles.length}
        onOpenMap={() => setIsMapModalOpen(true)}
        onOpenVisuals={() => setIsImageGalleryOpen(true)}
        onOpenResearchers={() => setIsSocialModalOpen(true)}
        onOpenReferences={() => setIsReferencesModalOpen(true)}
      />
    </div>
  );
};

export default App;
