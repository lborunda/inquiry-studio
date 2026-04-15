
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SurveyStep = 'intro' | 'part1' | 'prompt' | 'part2' | 'thanks';

const surveyPart1Questions = [
    { id: 'q1', text: 'I find writing research ideas easy.' },
    { id: 'q2', text: 'AI has helped clarify my thinking.' },
    { id: 'q3', text: 'Inquiry Studio helped me structure my argument.' },
    { id: 'q4', text: 'Inquiry Studio helped me see something I hadn’t considered.' },
    { id: 'q5', text: 'I trust AI to support—not replace—my reasoning.' },
];
const surveyPart2Questions = [
    { id: 'tlx1', text: 'Mental effort required:', options: ['Very Low', 'Low', 'Medium', 'High', 'Very High'] },
    { id: 'tlx2', text: 'Time pressure or urgency:', options: ['None', 'Low', 'Moderate', 'High', 'Extreme'] },
    { id: 'tlx3', text: 'Perceived success (in clarifying your ideas):', options: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
    { id: 'tlx4', text: 'Amount of effort required to stay focused:', options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'] },
    { id: 'tlx5', text: 'Level of frustration experienced:', options: ['None', 'Low', 'Moderate', 'High', 'Extreme'] },
];

const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
  const [step, setStep] = useState<SurveyStep>('intro');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addDoc(collection(db, 'feedback'), {
        ...formData,
        timestamp: Date.now()
      });
      console.log("Survey submitted successfully");
      setStep('thanks');
    } catch (error: any) {
      console.error("Error submitting survey:", error);
      setSubmitError("There was an error submitting your feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderIntro = () => (
    <>
      <div className="prose prose-sm max-w-none text-gray-700 mb-8">
        <h3 className="text-xl font-bold text-gray-900">Inquiry Studio</h3>
        <p className="font-semibold">Structured Research & Thesis Development</p>
        <p>Inquiry Studio is an AI-supported environment for writing, research, and epistemic inquiry. Designed as an instrument for thinking—not automation—Inquiry Studio scaffolds the complex, situated process of knowledge formation. It helps researchers articulate questions, structure arguments, and reflect on method, context, and clarity of thought.</p>
        <p>Rooted in architectural reasoning and learning sciences, Inquiry Studio treats writing as a spatial and temporal construction. Ideas are not merely recorded but composed—iteratively, through interruption, dialogue, and revision.</p>
        <p>Learning is not just structured—it emerges. Insight often arrives not through instruction, but through friction, rhythm, and surprise. In the classroom, knowledge takes shape in space and time. Can AI make space for that?</p>
        <p>We’re studying how researchers engage with AI tools like Inquiry Studio to better understand how cognition, writing, and machine intelligence co-evolve. Your reflections help inform this inquiry.</p>
        <div className="mt-6 border-t pt-4">
            <p className="font-semibold">Developed by Dr. Luis Borunda</p>
            <p className="text-xs">Assistant Professor<br/>Virginia Tech | School of Architecture<br/>lborunda@vt.edu | www.luisborunda.com</p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={() => setStep('part1')} className="px-5 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Fill out a short survey</button>
      </div>
    </>
  );

  const renderSurveyPart1 = () => (
    <form onSubmit={(e) => { e.preventDefault(); setStep('prompt'); }}>
      <h3 className="text-xl font-bold mb-4">Part 1: Cognitive Reflection + AI Utility</h3>
      <div className="space-y-6">
        {surveyPart1Questions.map((q, index) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{index + 1}. {q.text}</label>
            <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
            </div>
            <div className="flex justify-between gap-2 mt-1">
              {[1, 2, 3, 4, 5].map(value => (
                <input key={value} required type="radio" name={q.id} value={value} onChange={handleInputChange} className="w-8 h-8 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-gray-800 checked:border-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-700 transition"/>
              ))}
            </div>
          </div>
        ))}
        <div className="space-y-4">
           <div>
             <label htmlFor="q6" className="block text-sm font-medium text-gray-700 mb-1">6. Where do you struggle most when writing?</label>
             <textarea id="q6" name="q6" rows={2} onChange={handleInputChange} className="w-full text-sm p-2 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-gray-800"/>
           </div>
           <div>
             <label htmlFor="q7" className="block text-sm font-medium text-gray-700 mb-1">7. What has Inquiry Studio helped you do more clearly or confidently?</label>
             <textarea id="q7" name="q7" rows={2} onChange={handleInputChange} className="w-full text-sm p-2 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-gray-800"/>
           </div>
           <div>
             <label htmlFor="q8" className="block text-sm font-medium text-gray-700 mb-1">8. One insight Inquiry Studio led you to:</label>
             <textarea id="q8" name="q8" rows={2} onChange={handleInputChange} className="w-full text-sm p-2 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-gray-800"/>
           </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-8">
        <button type="button" onClick={() => setStep('intro')} className="text-gray-600 hover:text-gray-900">Back</button>
        <button type="submit" className="px-5 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Next</button>
      </div>
    </form>
  );
  
  const renderPrompt = () => (
    <div className="text-center">
        <h3 className="text-xl font-bold mb-4">Thank you!</h3>
        <p className="text-gray-600 mb-6">Would you like to answer a few short questions about your mental effort and experience?</p>
        <div className="flex justify-center gap-4">
             <button onClick={handleSubmit} className="px-5 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100">Not Now</button>
             <button onClick={() => setStep('part2')} className="px-5 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Continue</button>
        </div>
    </div>
  );

  const renderSurveyPart2 = () => (
    <form onSubmit={handleSubmit}>
        <h3 className="text-xl font-bold mb-2">Part 2: Experience Rating</h3>
        <p className="text-sm text-gray-500 mb-6">Please rate the following while working with Inquiry Studio:</p>
        <div className="space-y-6">
            {surveyPart2Questions.map(q => (
                <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{q.text}</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {q.options.map(opt => (
                            <label key={opt} className="flex items-center space-x-2 cursor-pointer text-sm">
                                <input required type="radio" name={q.id} value={opt} onChange={handleInputChange} className="h-4 w-4 text-gray-800 border-gray-300 focus:ring-gray-700" />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
            <div>
             <label htmlFor="q_harder" className="block text-sm font-medium text-gray-700 mb-1">Optional: What made the process feel easier or harder?</label>
             <textarea id="q_harder" name="q_harder" rows={3} onChange={handleInputChange} className="w-full text-sm p-2 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-gray-800"/>
           </div>
        </div>
        <div className="flex flex-col items-end gap-3 mt-8">
          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('prompt')} className="text-gray-600 hover:text-gray-900" disabled={isSubmitting}>Back</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
    </form>
  );

  const renderThanks = () => (
     <div className="text-center">
        <h3 className="text-xl font-bold mb-4">Feedback Submitted</h3>
        <p className="text-gray-600 mb-6">Thank you for your valuable input. It will help improve Inquiry Studio for everyone.</p>
        <button onClick={onClose} className="px-5 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Close</button>
    </div>
  );

  const renderContent = () => {
    switch(step) {
        case 'intro': return renderIntro();
        case 'part1': return renderSurveyPart1();
        case 'prompt': return renderPrompt();
        case 'part2': return renderSurveyPart2();
        case 'thanks': return renderThanks();
        default: return renderIntro();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative text-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
        {renderContent()}
      </div>
    </div>
  );
};

export default AboutModal;