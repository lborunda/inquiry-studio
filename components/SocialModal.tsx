
import React, { useState, useEffect } from 'react';
import { Topic, Researcher } from '../types';
import { generateSocialConnections } from '../services/geminiService';
import { GraduationCapIcon, LinkedInIcon, UsersIcon } from './icons';

interface SocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectText: string;
}

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
    </div>
);

const ResearcherCard = ({ researcher }: { researcher: Researcher }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
        <span className="font-semibold text-gray-800">{researcher.name}</span>
        <div className="flex items-center gap-4">
            <a href={researcher.researchGateUrl} target="_blank" rel="noopener noreferrer" title="ResearchGate" className="text-gray-500 hover:text-gray-900">
                <GraduationCapIcon className="w-6 h-6" />
            </a>
            <a href={researcher.linkedInUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="text-gray-500 hover:text-gray-900">
                <LinkedInIcon className="w-6 h-6" />
            </a>
        </div>
    </div>
);


const SocialModal = ({ isOpen, onClose, projectText }: SocialModalProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [topics, setTopics] = useState<Topic[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setError(null);
            setSelectedTopic(null);
            setTopics(null);

            generateSocialConnections(projectText)
                .then(data => {
                    setTopics(data);
                    if (data && data.length > 0) {
                        setSelectedTopic(data[0]);
                    }
                })
                .catch(err => {
                    setError(err.message || "An unknown error occurred.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, projectText]);

    if (!isOpen) return null;
    
    const hasContent = topics && topics.length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-5xl h-[90vh] flex flex-col relative text-gray-800">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
                <div className="flex-shrink-0 mb-6">
                    <h2 className="text-2xl font-bold mb-1 flex items-center gap-3">
                        <UsersIcon className="w-7 h-7" />
                        Researcher Network
                    </h2>
                    <p className="text-sm text-gray-500">Discover researchers who share your interests, based on your current work.</p>
                </div>
                
                <div className="flex-1 flex gap-8 min-h-0">
                    {/* Left: Topic Bubbles */}
                    <div className="w-1/3 flex-shrink-0 overflow-y-auto pr-4 -mr-4 border-r border-gray-200">
                        <h3 className="font-semibold text-lg mb-4 sticky top-0 bg-white pb-2">Related Topics</h3>
                        {isLoading && <LoadingSpinner />}
                        {error && <div className="text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}
                        {!isLoading && !error && !hasContent && (
                            <div className="text-center text-gray-500 p-4">
                                <p>No connections found.</p>
                                <p className="text-sm">Try writing more in the canvas to generate connections.</p>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-3">
                            {topics?.map(topic => (
                                <button
                                    key={topic.topicName}
                                    onClick={() => setSelectedTopic(topic)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ease-in-out transform hover:scale-105 ${selectedTopic?.topicName === topic.topicName ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-800'}`}
                                >
                                    {topic.topicName}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Researcher Profiles */}
                    <div className="w-2/3 flex-1 overflow-y-auto">
                         <h3 className="font-semibold text-lg mb-4 sticky top-0 bg-white pb-2">Expand Your Network</h3>
                         {selectedTopic ? (
                             <div className="space-y-4">
                                {selectedTopic.researchers.map(researcher => (
                                    <ResearcherCard key={researcher.name} researcher={researcher} />
                                ))}
                             </div>
                         ) : (
                            !isLoading && !error && hasContent && (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    Select a topic to see researchers.
                                </div>
                            )
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialModal;
