import React, { useState } from 'react';
import { Project } from '../types';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
}

const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const handleRenameSubmit = (id: string) => {
    if (editName.trim()) {
      onRenameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col relative text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Projects</h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
          {projects.map(project => (
            <div 
              key={project.id} 
              className={`flex items-center justify-between p-3 rounded-md border transition-colors ${project.id === activeProjectId ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
            >
              {editingId === project.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(project.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                  />
                  <button onClick={() => handleRenameSubmit(project.id)} className="text-xs bg-gray-800 text-white px-2 py-1 rounded">Save</button>
                </div>
              ) : (
                <button 
                  className="flex-1 text-left font-medium text-sm truncate"
                  onClick={() => {
                    onSelectProject(project.id);
                    onClose();
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(project.id);
                    setEditName(project.name);
                  }}
                  title="Double-click to rename"
                >
                  {project.name}
                  <div className="text-xs text-gray-500 mt-1">
                    Last updated: {new Date(project.lastModified).toLocaleDateString()}
                  </div>
                </button>
              )}
              
              {projects.length > 1 && !editingId && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700 p-1"
                  title="Delete Project"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        
        <button 
          onClick={() => {
            onCreateProject();
            onClose();
          }} 
          className="w-full py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors font-medium text-sm"
        >
          + New Project
        </button>
      </div>
    </div>
  );
};

export default ProjectsModal;
