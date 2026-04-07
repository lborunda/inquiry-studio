import React, { useState, useEffect } from 'react';
import TutorPointCloud from './TutorPointCloud';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const slides = [
    {
        title: "Welcome to SITE",
        text: "An AI-powered spatial companion designed to mentor you in academic writing. This is an instrument for thinking, a virtual-physical environment for learning."
    },
    {
        title: "How It Works",
        text: "Select a focus area and start writing. Highlight text to explore ideas with the AI, and bookmark key insights from the companion in your chat. The AI grounds its advice in instructor-provided materials."
    },
    {
        title: "Your Evolving Ideas",
        text: "The main text area is your canvas. The SITE Companion helps you build, critique, and refine. Every interaction maps your research trajectory.\n\nBefore you start, consider some questions:\n\n• How can design challenge assumptions?\n• What unseen forces shape our built world?\n• Where does your inquiry lead?\n\nLet's begin."
    }
];

const Typewriter = ({ text, onFinished }: { text: string, onFinished?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText(''); // Reset on text change

        let animationFrameId: number;
        let startTimestamp: number | null = null;
        const charInterval = 25; // ms per character, faster

        const type = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const elapsedTime = timestamp - startTimestamp;
            const charsToShow = Math.min(text.length, Math.floor(elapsedTime / charInterval));

            setDisplayedText(text.substring(0, charsToShow));

            if (charsToShow < text.length) {
                animationFrameId = requestAnimationFrame(type);
            } else {
                if (onFinished) onFinished();
            }
        };

        const startTimeout = window.setTimeout(() => {
            animationFrameId = requestAnimationFrame(type);
        }, 250);

        return () => {
            window.clearTimeout(startTimeout);
            cancelAnimationFrame(animationFrameId);
        };
    }, [text, onFinished]);

    return <p className="text-base text-gray-300 font-spacemono leading-relaxed whitespace-pre-wrap">{displayedText}</p>;
};


const WelcomeModal = ({ isOpen, onClose }: WelcomeModalProps) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex items-center justify-center p-4 text-white" aria-modal="true" role="dialog">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-4xl font-bold p-6 leading-none">&times;</button>
            <div className="relative z-10 w-full max-w-2xl text-center flex flex-col items-center">
                <div className="w-64 h-64 mb-6">
                    <TutorPointCloud />
                </div>

                <h1 className="text-4xl font-bold mb-4 font-inter">{slides[currentSlide].title}</h1>
                <div className="min-h-[150px] w-full text-left">
                  <Typewriter text={slides[currentSlide].text} key={currentSlide} />
                </div>
                
                <div className="mt-8 flex justify-center items-center gap-4">
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">Skip</button>
                    <button 
                        onClick={handleNext} 
                        className="px-6 py-2 bg-white text-gray-900 font-bold rounded-md hover:bg-gray-200 transition-colors"
                    >
                        {currentSlide === slides.length - 1 ? "Start Writing" : "Next"}
                    </button>
                </div>

                <div className="mt-6 flex justify-center gap-2" role="tablist">
                    {slides.map((_, index) => (
                        <div key={index} className={`w-2 h-2 rounded-full transition-colors ${index === currentSlide ? 'bg-white' : 'bg-gray-600'}`} role="tab" aria-selected={index === currentSlide}></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;