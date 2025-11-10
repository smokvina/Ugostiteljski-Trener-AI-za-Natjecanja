import React, { useState, useEffect, useRef } from 'react';
import { Chat } from "@google/genai";
import { ChatMessage, SendMessagePayload } from './types';
import { initializeChat, sendMessageToAI, generateImage } from './services/geminiService';
import ChatMessageComponent from './components/ChatMessage';
import ImageGenerationModal from './components/ImageGenerationModal';

//================================================================================
// Helper Functions
//================================================================================
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        // remove "data:application/pdf;base64," prefix
        const base64String = result.split(',')[1];
        resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });


//================================================================================
// Sub-components defined within App.tsx for encapsulation
//================================================================================

interface CompetitionModeToggleProps {
  mode: 'standard' | 'competition';
  onModeChange: (newMode: 'standard' | 'competition') => void;
  disabled: boolean;
}

const CompetitionModeToggle: React.FC<CompetitionModeToggleProps> = ({ mode, onModeChange, disabled }) => {
  const isCompetition = mode === 'competition';

  const handleToggle = () => {
    if (disabled) return;
    onModeChange(isCompetition ? 'standard' : 'competition');
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`text-sm font-medium transition-colors ${!isCompetition ? 'text-white' : 'text-gray-400'}`}>
        Standardni način
      </span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-500 ${disabled ? 'cursor-not-allowed' : ''}`}
        aria-pressed={isCompetition}
      >
        <span className="sr-only">Promijeni način rada</span>
        <span className={`${isCompetition ? 'bg-amber-600' : 'bg-gray-600'} absolute inset-0 rounded-full`}></span>
        <span
          className={`${
            isCompetition ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out`}
        />
      </button>
      <span className={`text-sm font-medium transition-colors ${isCompetition ? 'text-white' : 'text-gray-400'}`}>
        Natjecateljski
      </span>
    </div>
  );
};

interface PropositionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: string | File) => Promise<void>;
}

const PropositionsModal: React.FC<PropositionsModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [propositions, setPropositions] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setPropositions(''); // Clear text when file is selected
      } else {
        alert("Molimo odaberite PDF datoteku.");
        event.target.value = ''; // Reset file input
      }
    }
  };

  const handleCloseAndReset = () => {
    setPropositions('');
    setSelectedFile(null);
    onClose();
  };

  const handleSubmit = async () => {
    const data = selectedFile || propositions.trim();
    if (!data) return;
    setIsSubmitting(true);
    await onSubmit(data);
    setIsSubmitting(false);
    setPropositions('');
    setSelectedFile(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-700 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Unos Propozicija za Natjecanje</h2>
        <p className="text-gray-300 mb-4">
          Zalijepite tekst, opišite pravila ILI učitajte PDF dokument s propozicijama. AI će analizirati uneseno i pripremiti ciljani trening.
        </p>

        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isSubmitting || !!propositions.trim()}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting || !!propositions.trim()}
          className="w-full mb-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Učitaj PDF Propozicije
        </button>

        {selectedFile && (
          <div className="my-2 p-2 bg-gray-800 text-green-400 rounded-md text-sm text-center">
            Odabrana datoteka: {selectedFile.name}
          </div>
        )}
        
        <div className="relative flex items-center my-4">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">ILI</span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>
        
        <textarea
          value={propositions}
          onChange={(e) => {
            setPropositions(e.target.value);
            if (selectedFile) {
              setSelectedFile(null);
              if(fileInputRef.current) fileInputRef.current.value = '';
            }
          }}
          placeholder="Zalijepite propozicije ovdje..."
          className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150 ease-in-out h-40 resize-y"
          disabled={isSubmitting || !!selectedFile}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleCloseAndReset}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition disabled:opacity-50"
          >
            Odustani
          </button>
          <button
            onClick={handleSubmit}
            disabled={!propositions.trim() && !selectedFile || isSubmitting}
            className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analiziram...
              </>
            ) : 'Započni Analizu'}
          </button>
        </div>
      </div>
    </div>
  );
};


//================================================================================
// Main App Component
//================================================================================

const App: React.FC = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [mode, setMode] = useState<'standard' | 'competition'>('standard');
    const [isPropositionsModalOpen, setIsPropositionsModalOpen] = useState(false);
    const [arePropositionsSet, setArePropositionsSet] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const startNewChat = async () => {
        setIsLoading(true);
        setMessages([]);
        const chatInstance = initializeChat();
        if (chatInstance) {
            setChat(chatInstance);
            const initialMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: "Dobar dan. Krećemo s vježbom posluživanja. Očekujem potpunu pažnju i preciznost. Prvi zadatak: Što je 'mise en place' i zašto je važan?"
            };
            setMessages([initialMessage]);
        } else {
             const errorMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: "Greška: Inicijalizacija AI nije uspjela. Provjerite je li API ključ ispravno postavljen."
            };
            setMessages([errorMessage]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        startNewChat();
    }, []);
    
    const handleModeChange = (newMode: 'standard' | 'competition') => {
        if (newMode === mode) return;

        setMode(newMode);

        if (newMode === 'standard') {
            setArePropositionsSet(false);
            startNewChat();
        } else { // Switching to competition
            setIsPropositionsModalOpen(true);
        }
    };

    const handlePropositionsSubmit = async (data: string | File) => {
        if (!chat) return;
        
        setIsPropositionsModalOpen(false);
        setArePropositionsSet(true);
        setMessages([]); // Start with a clean slate for the competition session
        
        let userMessage: ChatMessage;
        let payload: SendMessagePayload;

        if (data instanceof File) {
            setIsLoading(true);
            const base64Data = await fileToBase64(data);
            
            payload = {
                text: "Spremam se za natjecanje. Ovdje su propozicije u priloženoj datoteci. Analiziraj ih i pripremi plan treninga.",
                file: { data: base64Data, mimeType: data.type }
            };
            userMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: `Propozicije poslane kao datoteka: ${data.name}`,
            };
        } else {
            const prompt = `Spremam se za natjecanje. Ovdje su propozicije. Analiziraj ih i pripremi plan treninga.\n\n---\n\n${data}`;
            payload = { text: prompt };
            userMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: prompt,
            };
        }
        
        setMessages([userMessage]);
        setIsLoading(true);

        const responseText = await sendMessageToAI(chat, payload);

        const modelMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
        };
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chat) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const responseText = await sendMessageToAI(chat, { text: input });

        const modelMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
        };
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };

    const handleGenerateImage = async (prompt: string) => {
        setIsLoading(true);
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: `Zahtjev za generiranje slike: "${prompt}"`,
        };
        setMessages(prev => [...prev, userMessage]);
        
        const imageUrl = await generateImage(prompt);
        
        const modelMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: imageUrl ? `Evo generirane slike za "${prompt}":` : `Nisam uspio generirati sliku za "${prompt}". Molimo pokušajte s drugačijim opisom.`,
            image: imageUrl ?? undefined,
        };
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-800 text-white">
            <header className="bg-gray-900 p-4 shadow-md z-10 flex justify-between items-center">
                 <div className="w-1/3"></div> {/* Spacer */}
                 <h1 className="text-xl font-bold text-center text-amber-400 w-1/3 whitespace-nowrap">Kolegij Šefova - Ugostiteljski Trener AI</h1>
                 <div className="w-1/3 flex justify-end">
                    <CompetitionModeToggle mode={mode} onModeChange={handleModeChange} disabled={isLoading} />
                 </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    {messages.map((msg) => (
                        <ChatMessageComponent key={msg.id} message={msg} />
                    ))}
                    {isLoading && messages.length > 0 && (
                        <div className="flex items-start gap-3 my-4 justify-start">
                             <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="max-w-xl p-4 rounded-lg shadow-md bg-gray-700 text-gray-200 rounded-tl-none">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                                    <span className="text-gray-300">Kolegij razmatra...</span>
                                </div>
                            </div>
                        </div>
                    )}
                     <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="bg-gray-900 p-4 border-t border-gray-700 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsImageModalOpen(true)}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-amber-400 transition flex-shrink-0"
                        title="Generiraj sliku"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e as any);
                            }
                        }}
                        placeholder="Upiši svoj odgovor..."
                        className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-150 ease-in-out resize-none"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="px-4 py-3 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </footer>

            <ImageGenerationModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                onGenerate={handleGenerateImage}
            />
            
            <PropositionsModal
                isOpen={isPropositionsModalOpen}
                onClose={() => {
                    setIsPropositionsModalOpen(false);
                    // Revert to standard mode if user closes modal without submitting
                    if (!arePropositionsSet) {
                       setMode('standard');
                    }
                }}
                onSubmit={handlePropositionsSubmit}
            />
        </div>
    );
};

export default App;
