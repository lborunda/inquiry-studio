import React, { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { InquiryStage, ChatMessage, UploadedFile, ConceptNode, Project, OrbAction } from './types';
import { generateTutorResponse, summarizeFile, generateOrbResponse, checkAssumptions, generateResearchArgument, generateSemanticMap, generateSuggestions, generateVisualizationImage } from './services/geminiService';
import { getRagFilesForSection } from './services/ragService';
import PointCloud from './components/PointCloud';
import TutorShell from './components/TutorShell';
import ReferencesModal from './components/ReferencesModal';
import WelcomeModal from './components/WelcomeModal';
import AboutModal from './components/AboutModal';
import ConceptMapModal from './components/ConceptMapModal';
import FormattingToolbar from './components/FormattingToolbar';
import ImageGallery from './components/ImageGallery';
import SocialModal from './components/SocialModal';
import TutorialModal from './components/TutorialModal';
import ProjectsModal from './components/ProjectsModal';
import VisualAnalysisModal from './components/VisualAnalysisModal';
import { WandIcon, ReferenceIcon, SendIcon, InfoIcon, ChevronLeftIcon, ChevronRightIcon, BookmarkIcon, ChevronDownIcon, LayoutHorizontalIcon, LayoutVerticalIcon, MapIcon, ImageIcon, FormatIcon, UsersIcon } from './components/icons';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('vertical');

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
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isVisualAnalysisModalOpen, setIsVisualAnalysisModalOpen] = useState(false);
  const [visualizationImage, setVisualizationImage] = useState<string | null>(null);
  const [isVisualizationImageOpen, setIsVisualizationImageOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
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
    setIsTutorialOpen(true);
    const savedProjects = localStorage.getItem('site_projects');
    const savedActiveId = localStorage.getItem('site_activeProjectId');
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      setProjects(parsedProjects);
      if (savedActiveId && parsedProjects.some((p: Project) => p.id === savedActiveId)) {
        setActiveProjectId(savedActiveId);
      } else if (parsedProjects.length > 0) {
        setActiveProjectId(parsedProjects[0].id);
      } else {
        createNewProject();
      }
    } else {
      createNewProject();
    }
    
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsWelcomeOpen(true);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeProject?.chatHistory]);

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
      versions: [],
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

  const handleTextFormat = (command: string, value?: string) => {
      if(writingAreaRef.current) {
        document.execCommand(command, false, value);
        updateActiveProject({ writingText: writingAreaRef.current.innerHTML });
      }
  };

  const handleTutorReview = useCallback(async () => {
    if (!activeProject || isLoading) return;
    const plainText = stripHtml(activeProject.writingText);
    if (!plainText.trim()) {
        console.log("Writing area is empty. Nothing to review.");
        return;
    }

    const reviewPrompt = `Review my current draft. I am focusing on the '${activeStage}' stage. Please provide critique and suggestions based on my text below:\n\n---\n\n${plainText}`;
    handleTutorRequest(reviewPrompt);
    
    // Fetch suggestions
    const newSuggestions = await generateSuggestions(plainText);
    setSuggestions(newSuggestions);
  }, [activeProject, isLoading, activeStage, handleTutorRequest]);
  
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
  
  const renderFormattedMessage = (content: string) => {
    const parts = content.split(/(\*.*?\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i} className="font-normal not-italic bg-yellow-100/70 px-0.5 py-0.5 rounded-sm">{part.slice(1, -1)}</em>;
        }
        return part;
    });
  };

  const onboardingPlaceholder = `Start your inquiry here...\n\n• Drag & drop files (PDFs, images) to your desk.\n• Highlight any text to get contextual actions.\n• Use Cmd/Ctrl + Enter to have Inquiry Studio review your work.`;

  const isWritingAreaEmpty = !activeProject || (!stripHtml(activeProject.writingText).trim() && !activeProject.writingText.includes('<img'));

  const handleSaveVersion = () => {
    if (!activeProject) return;
    const newVersion = {
      id: `v-${Date.now()}`,
      timestamp: Date.now(),
      text: activeProject.writingText
    };
    updateActiveProject({
      versions: [...(activeProject.versions || []), newVersion]
    });
    // Optional: show a toast or temporary success state
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
         <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectionPopover(null); }} className="px-2 py-2 text-sm hover:bg-gray-700 rounded-r-md">&times;</button>
      </div>


      <main className="flex-1 flex h-full min-h-0 w-full max-w-screen-2xl mx-auto z-10">
        {/* Left Collapsible Sidebar */}
        <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out bg-gray-50/70 backdrop-blur-sm border-r border-gray-200/80 flex flex-col overflow-hidden ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
           <div className={`p-6 overflow-y-auto h-full space-y-8 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div>
                <h2 className="text-sm font-semibold uppercase text-gray-500 mb-3">Inquiry Stage</h2>
                <div className="space-y-1">{Object.values(InquiryStage).map(stage => (
                    <button key={stage} onClick={() => handleStageChange(stage)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeStage === stage ? 'bg-gray-800 text-white' : 'hover:bg-gray-200'}`}>{stage}</button>
                ))}</div>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase text-gray-500 mb-3">Tutor Orientation</h2>
                <div className="space-y-4 px-2">
                    <div>
                        <div className="flex justify-between text-xs text-gray-600"><span>Practice-Oriented</span><span>Research-Oriented</span></div>
                        <input type="range" min="0" max="100" step="25" value={practiceResearchRatio} onChange={(e) => setPracticeResearchRatio(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"/>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                          <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                          <strong>Practice:</strong> Focuses on design and making.<br/>
                          <strong>Research:</strong> Focuses on theory and methods.
                        </p>
                    </div>
                </div>
              </div>
              
              <div>
                 <h2 className="text-sm font-semibold uppercase text-gray-500 mb-3">Knowledge Base</h2>
                 <div className="space-y-2">
                    <button onClick={() => setIsReferencesModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-800 hover:text-gray-800 transition-colors">
                        <ReferenceIcon className="w-4 h-4" />DESK & References
                    </button>
                    <button onClick={() => setIsMapModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-800 hover:text-gray-800 transition-colors">
                        <MapIcon className="w-4 h-4" />Inquiry Map
                    </button>
                    <button onClick={() => setIsSocialModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-800 hover:text-gray-800 transition-colors">
                        <UsersIcon className="w-4 h-4" />Researcher Network
                    </button>
                 </div>
              </div>
              
              <div>
                 <h2 className="text-sm font-semibold uppercase text-gray-500 mb-3">About</h2>
                 <button onClick={() => setIsAboutModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-800 hover:text-gray-800 transition-colors">
                    <InfoIcon className="w-4 h-4" />About Inquiry Studio
                 </button>
              </div>
              
          </div>
        </aside>
        
        <div className={`flex-1 flex relative min-w-0 bg-white/50 backdrop-blur-sm shadow-sm ${layoutMode === 'horizontal' ? 'flex-col' : 'flex-row'}`}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"} className="absolute top-1/2 -translate-y-1/2 -left-3 z-20 bg-white border border-gray-300 rounded-full p-1 shadow-md hover:bg-gray-100 transition-all">
            {isSidebarOpen ? <ChevronLeftIcon className="w-5 h-5 text-gray-600" /> : <ChevronRightIcon className="w-5 h-5 text-gray-600" />}
          </button>
          
          <div className="flex-1 flex flex-col min-h-0">
             <div className="p-4 border-b border-gray-200/80 flex justify-between items-center flex-shrink-0 gap-4">
               <div className="flex items-center gap-2">
                 <h1 className="text-lg font-bold truncate">{activeProject?.name || 'Loading...'}</h1>
                 <ProjectSwitcher />
                 {activeProject && (
                   <span className="text-xs text-gray-500 ml-2">
                     {stripHtml(activeProject.writingText).trim().split(/\s+/).filter(w => w.length > 0).length} words
                   </span>
                 )}
               </div>
               <div className="flex items-center gap-4 flex-shrink-0">
                 <button 
                   onClick={handleSaveVersion}
                   className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors border border-gray-200 flex items-center gap-1"
                   title="Save current draft version"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                   Save Version
                 </button>
                 <div className="relative group">
                   <button 
                     className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors border border-gray-200 flex items-center gap-1"
                     title="View saved versions"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                     Versions ({activeProject?.versions?.length || 0})
                   </button>
                   <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-64 overflow-y-auto">
                     {activeProject?.versions && activeProject.versions.length > 0 ? (
                       activeProject.versions.map((v, i) => (
                         <button 
                           key={v.id}
                           onClick={() => updateActiveProject({ writingText: v.text })}
                           className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                         >
                           Version {i + 1} - {new Date(v.timestamp).toLocaleTimeString()}
                         </button>
                       ))
                     ) : (
                       <div className="px-4 py-3 text-xs text-gray-500 text-center">No versions saved</div>
                     )}
                   </div>
                 </div>
                 <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
                    <button onClick={() => setLayoutMode('horizontal')} title="Horizontal Layout" className={`p-1 rounded transition-colors ${layoutMode === 'horizontal' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}>
                        <LayoutHorizontalIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => setLayoutMode('vertical')} title="Vertical Layout" className={`p-1 rounded transition-colors ${layoutMode === 'vertical' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}>
                        <LayoutVerticalIcon className="w-5 h-5" />
                    </button>
                 </div>
                 <div className="w-px h-6 bg-gray-200"></div>
                 <FormattingToolbar onFormat={handleTextFormat} />
                 <div className="w-px h-6 bg-gray-200"></div>
                 <button onClick={() => setIsImageGalleryOpen(true)} title="Image Desk" className="text-gray-500 hover:text-gray-900"><ImageIcon className="w-5 h-5" /></button>
                 <button onClick={() => setIsReferencesModalOpen(true)} title="References" className="text-gray-500 hover:text-gray-900"><ReferenceIcon className="w-5 h-5" /></button>
               </div>
             </div>
             
            <div className="flex-1 p-8 md:p-12 min-h-0 relative flex flex-col">
               {isWritingAreaEmpty && (
                <div className="absolute top-8 md:top-12 left-8 md:left-12 text-gray-400 text-base font-spacemono whitespace-pre-wrap pointer-events-none" aria-hidden="true">
                  {onboardingPlaceholder}
                </div>
               )}
              <EditableCanvas
                ref={writingAreaRef}
                html={activeProject?.writingText || ''}
                onChange={(html: string) => updateActiveProject({ writingText: html })}
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

          <div className={`flex-shrink-0 flex flex-col bg-gray-50 ${layoutMode === 'horizontal' ? 'h-1/3 max-h-[50vh] border-t border-gray-200/80' : 'w-[450px] max-w-[40%] border-l border-gray-200/80'}`}>
            <div className="p-3 flex items-center gap-4 border-b border-gray-200/80 flex-shrink-0">
              <div className="flex gap-2 w-full justify-center">
                <button 
                  onClick={handleTutorReview} 
                  disabled={isLoading || !activeProject} 
                  title="Analyze full text (Cmd/Ctrl + Enter)" 
                  className="cursor-pointer disabled:cursor-not-allowed flex flex-col items-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <TutorShell progress={shellProgress} isThinking={isLoading} />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 font-medium uppercase tracking-wider">Analyze full text</span>
                </button>
                
                <button 
                  onClick={() => setIsVisualAnalysisModalOpen(true)}
                  disabled={isLoading || !activeProject}
                  title="Visual Analysis Tool"
                  className="cursor-pointer disabled:cursor-not-allowed flex flex-col items-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-50 border-2 border-purple-200 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <MapIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 font-medium uppercase tracking-wider">Visual Tool</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-100 min-h-0">
               {(!activeProject || activeProject.chatHistory.length === 0) && <div className="text-center text-sm text-gray-500 h-full flex items-center justify-center">Chat history will appear here.</div>}
               {activeProject?.chatHistory.map((msg, index) => (
                  <div key={msg.id} className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative max-w-md lg:max-w-lg rounded-lg px-4 py-2 text-sm whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-gray-800 text-white' : msg.isError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-white border'}`}>
                          {msg.role === 'model' ? (
                            <div onMouseUp={(e) => handleChatTextSelection(e, msg.content)}>
                              {renderFormattedMessage(msg.content)}
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

            <div className="p-4 border-t border-gray-200/80 bg-white">
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
      <VisualAnalysisModal 
        isOpen={isVisualAnalysisModalOpen} 
        onClose={() => setIsVisualAnalysisModalOpen(false)} 
        onSelectOption={async (option) => {
          if (!activeProject) return;
          const plainText = stripHtml(activeProject.writingText);
          
          if (option === 'mental_map') {
            setIsMapModalOpen(true);
          } else if (option === 'research_argument') {
            setIsLoading(true);
            const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: "Generate a Toulmin Research Argument analysis." };
            
            try {
              // Generate text and image in parallel
              const [response, image] = await Promise.all([
                generateResearchArgument(plainText),
                generateVisualizationImage(plainText, 'research_argument')
              ]);
              
              const modelMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: response };
              updateActiveProject({ chatHistory: [...activeProject.chatHistory, userMsg, modelMsg] });
              
              if (image) {
                setVisualizationImage(image);
                setIsVisualizationImageOpen(true);
              }
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
              // Generate text and image in parallel
              const [response, image] = await Promise.all([
                generateSemanticMap(plainText),
                generateVisualizationImage(plainText, 'semantic_map')
              ]);
              
              const modelMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: response };
              updateActiveProject({ chatHistory: [...activeProject.chatHistory, userMsg, modelMsg] });
              
              if (image) {
                setVisualizationImage(image);
                setIsVisualizationImageOpen(true);
              }
            } catch (error: any) {
              console.error("Error generating visual analysis:", error);
              const errorMsg: ChatMessage = { id: `model-${Date.now()}`, role: 'model', content: `I encountered an error while generating the visual analysis (${error.message || String(error)}). Please try again.`, isError: true };
              updateActiveProject({ chatHistory: [...activeProject.chatHistory, userMsg, errorMsg] });
            } finally {
              setIsLoading(false);
            }
          }
          
          if (plainText.trim()) {
            const newSuggestions = await generateSuggestions(plainText);
            setSuggestions(newSuggestions);
          }
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
              <span>Generated by Gemini 2.5 Flash Image</span>
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
    </div>
  );
};

export default App;
