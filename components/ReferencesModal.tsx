import React, { useState, useEffect } from 'react';
import { UploadedFile, InquiryStage } from '../types';
import { FileIcon, UploadIcon, ChevronLeftIcon } from './icons';

interface ReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentFiles: UploadedFile[];
  instructorFiles: UploadedFile[];
  onStudentFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSummarize: (file: UploadedFile) => void;
  onInsertReference: (file: UploadedFile) => void;
  activeSection: InquiryStage;
}

type ActiveTab = 'DESK' | 'REFERENCE' | 'AI Model';

const ReferencesModal = ({ isOpen, onClose, studentFiles, instructorFiles, onStudentFileChange, onSummarize, onInsertReference, activeSection }: ReferencesModalProps) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DESK');
  const [viewingPdf, setViewingPdf] = useState<UploadedFile | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setViewingPdf(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderFileList = (files: UploadedFile[], type: 'student' | 'instructor') => (
    <ul className="space-y-3">
      {files.map(file => (
        <li key={file.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {file.type === 'image' && file.dataUrl ? (
                <img src={file.dataUrl} alt={file.name} className="w-12 h-12 object-cover rounded-md border flex-shrink-0" />
              ) : (
                <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
              )}
              {type === 'student' && file.type === 'pdf' && file.objectUrl ? (
                  <button onClick={() => setViewingPdf(file)} className="text-sm font-medium text-gray-800 truncate hover:underline text-left">
                    {file.name}
                  </button>
                ) : (
                  <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {type === 'student' && (
                 <button onClick={() => onInsertReference(file)} className="text-xs font-semibold text-gray-800 hover:underline">Insert Ref</button>
              )}
               <a href={file.dataUrl || file.objectUrl || '#'} download={file.name} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-gray-800 hover:underline">Download</a>
              {type === 'student' && (
                <button
                    onClick={() => onSummarize(file)}
                    disabled={file.summaryLoading}
                    className="text-xs font-semibold text-gray-800 hover:underline disabled:opacity-50 disabled:cursor-wait"
                >
                    {file.summaryLoading ? 'Summarizing...' : 'Summarize'}
                </button>
              )}
            </div>
          </div>
          {file.summary && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
              <p className="font-semibold text-gray-700">Summary:</p>
              <p className="whitespace-pre-wrap">{file.summary}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] flex flex-col relative text-gray-800">
        
        {viewingPdf && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col">
                <div className="flex-shrink-0 p-4 border-b flex items-center gap-4 bg-gray-50">
                    <button 
                        onClick={() => setViewingPdf(null)} 
                        className="p-2 rounded-full hover:bg-gray-200"
                        aria-label="Back to files"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <h3 className="font-semibold text-gray-800 truncate">{viewingPdf.name}</h3>
                </div>
                <div className="flex-1 bg-gray-200">
                    <embed src={viewingPdf.objectUrl} type="application/pdf" width="100%" height="100%" />
                </div>
            </div>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold z-20">&times;</button>
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          References
        </h2>
        <p className="text-sm text-gray-500 mb-6">Manage your sources, course materials, and understand the AI's training.</p>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button onClick={() => setActiveTab('DESK')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'DESK' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              DESK <span className="bg-gray-200 text-gray-700 text-xs font-semibold ml-2 px-2 py-0.5 rounded-full">{studentFiles.length}</span>
            </button>
             <button onClick={() => setActiveTab('REFERENCE')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'REFERENCE' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              REFERENCE <span className="bg-gray-200 text-gray-700 text-xs font-semibold ml-2 px-2 py-0.5 rounded-full">{instructorFiles.length}</span>
            </button>
             <button onClick={() => setActiveTab('AI Model')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'AI Model' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              AI Model
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          {activeTab === 'DESK' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Your Desk</h3>
              <p className="text-sm text-gray-500 mb-4">Upload your personal references, images, or documents. You can insert these into your writing. (Max 10 files)</p>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-800 hover:text-gray-800 transition-colors cursor-pointer mb-6">
                <UploadIcon className="w-5 h-5" />
                <span>Upload a File</span>
                <input type="file" multiple className="hidden" onChange={onStudentFileChange} disabled={studentFiles.length >= 10} />
              </label>
              {renderFileList(studentFiles, 'student')}
            </div>
          )}
          {activeTab === 'REFERENCE' && (
             <div>
              <h3 className="text-lg font-semibold mb-2">Course Reference Materials</h3>
              <p className="text-sm text-gray-500 mb-4">These are instructor-provided materials that ground the AI's responses for the current focus area: <span className="font-semibold text-gray-700">{activeSection}</span>.</p>
              {instructorFiles.length > 0 ? (
                renderFileList(instructorFiles, 'instructor')
              ) : (
                <p className="text-sm text-center text-gray-500 bg-gray-50 p-4 rounded-md">No specific reference materials found for this section in the manifest.</p>
              )}
            </div>
          )}
          {activeTab === 'AI Model' && (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-2">AI Model Transparency</h3>
              <div className="space-y-4 text-gray-700">
                 <div>
                  <h4 className="font-semibold">Model</h4>
                  <p>This application uses Google's <code className="text-sm bg-gray-100 p-1 rounded">gemini-3.1-pro-preview</code> model. It's a powerful, multimodal model optimized for complex reasoning. An additional 2.5-flash model is used for image generation.</p>
                </div>
                <div>
                  <h4 className="font-semibold">Function</h4>
                  <p>The AI acts as a 'spatial companion' to assist in academic writing for architecture. It's designed to be an instrument for thinking, helping you to build, critique, and refine your ideas based on different pedagogical styles (Socratic, Collaborator, Editor).</p>
                </div>
                 <div>
                  <h4 className="font-semibold">Versions</h4>
                  <p>Model Version: <code className="text-sm bg-gray-100 p-1 rounded">gemini-3.1-pro-preview</code><br/>Application Version: <code className="text-sm bg-gray-100 p-1 rounded">Inquiry Studio v2.7</code></p>
                </div>
                <div>
                  <h4 className="font-semibold">Fine-Tuning Data & Grounding</h4>
                  <p>The model is not permanently fine-tuned on any single dataset. Instead, its behavior is guided in real-time by a detailed "system instruction" and grounding on the documents provided in the 'REFERENCE' tab. This ensures its advice is relevant to your course context. This contextual data is pulled from an external manifest file (`rag_manifest.csv`). No personal data from your session is used to train the global model.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferencesModal;