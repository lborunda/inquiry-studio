import React, { useState } from 'react';
import { Project, VersionEvent, CritiqueEvent } from '../types';
import VersionDiff from './VersionDiff';

interface InquiryTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onRestore: (versionText: string) => void;
  currentText: string;
}

const InquiryTrailModal: React.FC<InquiryTrailModalProps> = ({ isOpen, onClose, project, onRestore, currentText }) => {
  const [selectedVersion, setSelectedVersion] = useState<VersionEvent | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  if (!isOpen || !project) return null;

  // Combine VersionEvents and CritiqueEvents into a single timeline
  const timelineNodes = [
    ...(project.versionEvents || []).map(v => ({ ...v, _type: 'version' as const })),
    ...(project.critiqueEvents || []).map(c => ({ ...c, _type: 'critique' as const }))
  ].sort((a, b) => b.timestamp - a.timestamp); // Descending

  const handleRestoreClick = () => {
    if (selectedVersion) {
      if (window.confirm("Are you sure you want to restore this version? Your current work will be saved as a manual version.")) {
        onRestore(selectedVersion.text);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden">
        {/* Left Sidebar - Timeline */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold">Inquiry Trail</h2>
            <p className="text-xs text-gray-500">History of revisions and critiques</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {timelineNodes.length === 0 && <p className="text-sm text-gray-500">No trail history yet.</p>}
            {timelineNodes.map((node) => {
              if (node._type === 'version') {
                const v = node as any as VersionEvent;
                const isSelected = selectedVersion?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVersion(v); setShowDiff(false); }}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${isSelected ? 'border-gray-800 bg-gray-100 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'} focus:outline-none focus:ring-2 focus:ring-gray-400`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-800 line-clamp-1">{v.label || 'Version'}</span>
                      <span className="text-[10px] text-gray-500">{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-xs text-gray-600 flex justify-between">
                       <span>{v.trigger}</span>
                       {(v.addressedFeedbackItems?.length ?? 0) > 0 && (
                          <span className="bg-green-100 text-green-800 px-1 rounded-sm text-[10px]">
                            {v.addressedFeedbackItems?.length} items addressed
                          </span>
                       )}
                    </div>
                  </button>
                );
              } else {
                const c = node as any as CritiqueEvent;
                // Count addressed by seeing if any subsequent VersionEvent has the critique item id
                const subsequentVersions = (project.versionEvents || []).filter(v => v.timestamp > c.timestamp);
                const allAddressedItems = new Set<string>();
                subsequentVersions.forEach(v => {
                    v.addressedFeedbackItems?.forEach(id => allAddressedItems.add(id));
                });
                
                const addressedCount = c.items.filter(i => allAddressedItems.has(i.index.toString())).length;
                return (
                  <div key={c.id} className="w-full text-left p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-blue-800">AI Critique</span>
                      <span className="text-[10px] text-blue-500">{new Date(c.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-xs text-blue-600">
                      {c.items.length} critique items ({addressedCount} addressed)
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Right Content - Preview/Diff */}
        <div className="w-2/3 flex flex-col h-full bg-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 z-10 font-bold text-xl">&times;</button>
          
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white pr-12">
            <h3 className="font-bold text-lg">
              {selectedVersion ? (showDiff ? 'Compare Version' : 'Preview Version') : 'Select a node'}
            </h3>
            {selectedVersion && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={showDiff} onChange={(e) => setShowDiff(e.target.checked)} />
                  Compare to Current
                </label>
                <button
                  onClick={handleRestoreClick}
                  className="ml-4 px-4 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
                >
                  Restore Version
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
            {!selectedVersion ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Select a version from the timeline to preview.
              </div>
            ) : showDiff ? (
              <VersionDiff oldVersion={selectedVersion} newVersion={null} currentText={currentText} />
            ) : (
              <div 
                 className="p-4 bg-white rounded-lg border border-gray-200 min-h-[500px]"
                 dangerouslySetInnerHTML={{ __html: selectedVersion.text }} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InquiryTrailModal;
