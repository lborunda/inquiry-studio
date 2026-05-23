import React, { useState } from 'react';
import { Network, Users, BookMarked, Image as ImageIcon } from 'lucide-react';

interface StatusBarProps {
  practiceResearchRatio: number;
  setPracticeResearchRatio: (val: number) => void;
  wordCount: number;
  mapCount: number;
  visualsCount: number;
  researchersCount: number;
  referencesCount: number;
  onOpenMap: () => void;
  onOpenVisuals: () => void;
  onOpenResearchers: () => void;
  onOpenReferences: () => void;
}

export default function StatusBar({
  practiceResearchRatio,
  setPracticeResearchRatio,
  wordCount,
  mapCount,
  visualsCount,
  researchersCount,
  referencesCount,
  onOpenMap,
  onOpenVisuals,
  onOpenResearchers,
  onOpenReferences
}: StatusBarProps) {
  const [showPopover, setShowPopover] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only snap on release usually, but for a standard input[type=range] we might want to update dynamically
    // Wait, the requirement says: "Discrete stops at 0, 25, 50, 75, 100 (snap on release)".
    // So we can use `step="25"` to automatically get those stops.
    setPracticeResearchRatio(parseInt(e.target.value, 10));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handled natively by input type range, but for custom shift+left/right:
    if (e.shiftKey) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPracticeResearchRatio(Math.max(0, practiceResearchRatio - 25));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPracticeResearchRatio(Math.min(100, practiceResearchRatio + 25));
      }
    } else {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPracticeResearchRatio(Math.max(0, practiceResearchRatio - 5));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPracticeResearchRatio(Math.min(100, practiceResearchRatio + 5));
      }
    }
  };

  const getSliderValueTooltip = () => {
    return `Knowing-How emphasizes practice and the design process.\nKnowing-That emphasizes systematic research, generating new knowledge, and making tacit design knowledge explicit.`;
  };

  const handleMouseUp = () => {
    // Snap to nearest 25
    const remainder = practiceResearchRatio % 25;
    if (remainder !== 0) {
      if (remainder >= 12.5) {
        setPracticeResearchRatio(Math.min(100, practiceResearchRatio + (25 - remainder)));
      } else {
        setPracticeResearchRatio(Math.max(0, practiceResearchRatio - remainder));
      }
    }
  };

  return (
    <div className="h-[36px] bg-gray-50 border-t border-gray-200 text-[12px] text-gray-700 px-4 flex items-center justify-between shrink-0 overflow-x-auto relative z-50" role="contentinfo">
      
      {/* LEFT: Practice-Research orientation slider */}
      <div className="flex items-center gap-3 relative mr-4" onMouseLeave={() => setShowPopover(false)}>
        <div className="hidden md:flex items-center gap-3" title={getSliderValueTooltip()}>
          <span className="text-gray-600 font-medium whitespace-nowrap">Knowing-How</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="5"
            value={practiceResearchRatio}
            onChange={handleSliderChange}
            onKeyDown={handleKeyDown}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="w-[200px] accent-[#C9A961] cursor-pointer"
            aria-label="Knowing-How to Knowing-That orientation"
          />
          <span className="text-gray-600 font-medium whitespace-nowrap">Knowing-That</span>
        </div>
        
        {/* Mobile orientation pill */}
        <div className="md:hidden">
          <button 
            className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 font-medium whitespace-nowrap"
            onClick={() => setShowPopover(!showPopover)}
          >
            KH↔KT: {practiceResearchRatio}%
          </button>
          
          {showPopover && (
             <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 shadow-lg rounded-md flex flex-col gap-2 z-50">
               <div className="text-xs text-gray-500 whitespace-pre-wrap">{getSliderValueTooltip()}</div>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-gray-600 font-medium text-xs whitespace-nowrap">Knowing-How</span>
                 <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={practiceResearchRatio}
                    onChange={handleSliderChange}
                    onKeyDown={handleKeyDown}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={handleMouseUp}
                    className="w-[150px] accent-[#C9A961]"
                    aria-label="Knowing-How to Knowing-That orientation"
                  />
                 <span className="text-gray-600 font-medium text-xs whitespace-nowrap">Knowing-That</span>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* CENTER: word count */}
      <div className="text-gray-600 whitespace-nowrap shrink-0 flex-1 text-center hidden sm:block">
        {wordCount} words
      </div>
      <div className="text-gray-600 whitespace-nowrap shrink-0 sm:hidden mx-4">
        {wordCount} w
      </div>

      {/* RIGHT: 4 KB chips */}
      <div className="flex flex-row gap-2 ml-auto shrink-0">
        <button 
          onClick={onOpenMap}
          aria-label="Map"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-gray-100 ${mapCount === 0 ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600'}`}
        >
          <Network className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-medium">Map</span>
          <span className="hidden md:inline text-gray-300">&middot;</span>
          <span className={mapCount === 0 ? "text-gray-400" : "text-gray-400 group-hover:text-gray-500"}>{mapCount}</span>
        </button>

        <button 
          onClick={onOpenVisuals}
          aria-label="Visuals"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-gray-100 ${visualsCount === 0 ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600'}`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-medium">Visuals</span>
          <span className="hidden md:inline text-gray-300">&middot;</span>
          <span className={visualsCount === 0 ? "text-gray-400" : "text-gray-400 group-hover:text-gray-500"}>{visualsCount}</span>
        </button>

        <button 
          onClick={onOpenResearchers}
          aria-label="Researchers"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-gray-100 ${researchersCount === 0 ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-medium">Researchers</span>
          <span className="hidden md:inline text-gray-300">&middot;</span>
          <span className={researchersCount === 0 ? "text-gray-400" : "text-gray-400 group-hover:text-gray-500"}>{researchersCount}</span>
        </button>

        <button 
          onClick={onOpenReferences}
          aria-label="References"
          className={`group flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-gray-100 ${referencesCount === 0 ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600'}`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-medium">References</span>
          <span className="hidden md:inline text-gray-300">&middot;</span>
          <span className={referencesCount === 0 ? "text-gray-400" : "text-gray-400 group-hover:text-gray-500"}>{referencesCount}</span>
        </button>
      </div>

    </div>
  );
}
