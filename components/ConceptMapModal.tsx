
import React from 'react';
import { ConceptNode } from '../types';
import { BookmarkIcon, WandIcon, ReferenceIcon } from './icons';

interface ConceptMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ConceptNode[];
}

const NodeIcon = ({ type }: { type: ConceptNode['type'] }) => {
    const className = "w-5 h-5 flex-shrink-0";
    switch (type) {
        case 'ai_bookmark':
            return <BookmarkIcon className={`${className} text-purple-500`} filled />;
        case 'user_selection':
            return <WandIcon className={`${className} text-blue-500`} />;
        case 'user_reference':
            return <ReferenceIcon className={`${className} text-green-500`} />;
        case 'tension':
            return <BookmarkIcon className={`${className} text-red-500`} />;
        case 'variable':
            return <WandIcon className={`${className} text-indigo-500`} />;
        case 'hypothesis':
            return <WandIcon className={`${className} text-purple-600`} />;
        case 'evidence':
            return <ReferenceIcon className={`${className} text-teal-500`} />;
        case 'assumption':
            return <BookmarkIcon className={`${className} text-orange-500`} />;
        default:
            return <BookmarkIcon className={`${className} text-gray-400`} />;
    }
};

const ConceptMapModal = ({ isOpen, onClose, nodes }: ConceptMapModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] flex flex-col relative text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          Inquiry Map
        </h2>
        <p className="text-sm text-gray-500 mb-6">A collection of your bookmarked ideas, references, and insights.</p>
        
        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
              Your map is empty. Bookmark insights from the tutor or highlight text in your writing to add concepts here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...nodes].reverse().map(node => (
                <div key={node.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                     <NodeIcon type={node.type} />
                     <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">{node.type.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed break-words">{node.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConceptMapModal;
