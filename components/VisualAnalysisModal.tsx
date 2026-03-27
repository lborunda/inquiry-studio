import React, { useState } from 'react';

interface VisualAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'mental_map' | 'research_argument' | 'semantic_map') => void;
}

const VisualAnalysisModal: React.FC<VisualAnalysisModalProps> = ({ isOpen, onClose, onSelectOption }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg relative text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <h2 className="text-xl font-bold mb-6 text-center text-gray-900">Visual Analysis Tool</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => { onSelectOption('mental_map'); onClose(); }}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-800 hover:bg-gray-50 transition-all text-left"
          >
            <h3 className="font-bold text-lg mb-1">Mental Map</h3>
            <p className="text-sm text-gray-600">Visualize the conceptual relationships in your text.</p>
          </button>
          
          <button 
            onClick={() => { onSelectOption('research_argument'); onClose(); }}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-800 hover:bg-gray-50 transition-all text-left"
          >
            <h3 className="font-bold text-lg mb-1">Research Argument (Toulmin)</h3>
            <p className="text-sm text-gray-600">Break down your argument into Claim, Evidence, Warrant, and Assumptions.</p>
          </button>
          
          <button 
            onClick={() => { onSelectOption('semantic_map'); onClose(); }}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-800 hover:bg-gray-50 transition-all text-left"
          >
            <h3 className="font-bold text-lg mb-1">Semantic Map (Infranodus Style)</h3>
            <p className="text-sm text-gray-600">Identify patterns, gaps, and structural holes in your data.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualAnalysisModal;
