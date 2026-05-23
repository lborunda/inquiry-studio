
import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../types';

interface ImageGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    files: UploadedFile[];
    onInsertReference: (text: string) => void;
}

const ImageGallery = ({ isOpen, onClose, files, onInsertReference }: ImageGalleryProps) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const imageFiles = files.filter(f => f.type === 'image' && f.dataUrl);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
               onClose();
               setSelectedImage(null);
           }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <>
            <div 
                className={`fixed inset-y-0 right-0 z-[100] w-80 bg-white/80 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-gray-200 flex flex-col`}
                aria-modal="true"
                role="dialog"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200/80">
                    <h3 className="font-semibold text-lg text-gray-800">Image Desk</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {imageFiles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[...imageFiles].reverse().map(file => (
                                <div key={file.id} className="group relative border rounded-md overflow-hidden aspect-square bg-gray-100">
                                    <img 
                                        src={file.dataUrl} 
                                        alt={file.name} 
                                        className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                        onClick={() => setSelectedImage(file.dataUrl!)}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="truncate font-medium">{file.name}</p>
                                        <button 
                                            onClick={() => onInsertReference(`\n[Image: ${file.name}]\n`)} 
                                            className="text-white font-bold hover:underline"
                                        >
                                            Insert Ref
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 text-sm h-full flex items-center justify-center p-4">
                            No images uploaded to your desk yet.
                        </div>
                    )}
                </div>
            </div>
            
            <div 
              className={`fixed inset-0 bg-black/50 z-[90] transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={onClose}
            ></div>

            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <img src={selectedImage} alt="Selected" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                    <button className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl font-light">&times;</button>
                </div>
            )}
        </>
    );
};

export default ImageGallery;
