
import React from 'react';
import { BoldIcon, ItalicIcon, ListIcon } from './icons';

export type FormatCommand = 'bold' | 'italic' | 'insertUnorderedList' | 'formatBlock';

interface FormattingToolbarProps {
  onFormat: (formatType: FormatCommand, value?: string) => void;
}

const FormattingToolbar = ({ onFormat }: FormattingToolbarProps) => {
  const handleFormat = (e: React.MouseEvent, command: FormatCommand, value?: string) => {
    e.preventDefault(); // Prevent loss of selection
    onFormat(command, value);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
      <button onMouseDown={(e) => handleFormat(e, 'formatBlock', 'H1')} title="Heading 1" className="px-2 py-1 rounded hover:bg-gray-200 transition-colors text-sm font-bold text-gray-700">
        H1
      </button>
      <button onMouseDown={(e) => handleFormat(e, 'formatBlock', 'H2')} title="Heading 2" className="px-2 py-1 rounded hover:bg-gray-200 transition-colors text-sm font-bold text-gray-700">
        H2
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1"></div>
      <button onMouseDown={(e) => handleFormat(e, 'bold')} title="Bold" className="p-1.5 rounded hover:bg-gray-200 transition-colors">
        <BoldIcon className="w-4 h-4 text-gray-700" />
      </button>
      <button onMouseDown={(e) => handleFormat(e, 'italic')} title="Italic" className="p-1.5 rounded hover:bg-gray-200 transition-colors">
        <ItalicIcon className="w-4 h-4 text-gray-700" />
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1"></div>
      <button onMouseDown={(e) => handleFormat(e, 'insertUnorderedList')} title="Bulleted List" className="p-1.5 rounded hover:bg-gray-200 transition-colors">
        <ListIcon className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
};

export default FormattingToolbar;