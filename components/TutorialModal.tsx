import React from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Welcome to Inquiry Studio</h2>
        <p className="text-gray-600 mb-6">Here are the 5 main features to help you get started:</p>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">1</div>
            <div>
              <h3 className="font-semibold text-gray-900">Write or Paste</h3>
              <p className="text-sm text-gray-600">Use the central area to write or paste the work you want to inquire about.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">2</div>
            <div>
              <h3 className="font-semibold text-gray-900">Select and Explore</h3>
              <p className="text-sm text-gray-600">Select a piece of text to delve deeper or contextualize more broadly (using "Tell me more" vs "Explore").</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">3</div>
            <div>
              <h3 className="font-semibold text-gray-900">Visual Summary & Literature Analysis</h3>
              <p className="text-sm text-gray-600">Press the blobs on the right for a full breakdown analysis, including literature review and visual analysis tools.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">4</div>
            <div>
              <h3 className="font-semibold text-gray-900">Research Chat</h3>
              <p className="text-sm text-gray-600">Chat on specific research-bounded conversations using the right pane.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">5</div>
            <div>
              <h3 className="font-semibold text-gray-900">Inquiry Types & Projects</h3>
              <p className="text-sm text-gray-600">Select the type of inquiry on the left pane. Manage your projects, formatting, and references from the top toolbar.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors">Get Started</button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
