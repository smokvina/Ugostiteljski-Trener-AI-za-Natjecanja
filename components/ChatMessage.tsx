import React from 'react';
import { ChatMessage } from '../types';

interface ChatMessageProps {
  message: ChatMessage;
}

const ModelIcon = () => (
    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
    </div>
);

const UserIcon = () => (
    <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.788 1.84L10 5.382l6.606 2.038a1 1 0 00.788-1.84l-7-3.5zM3 9.418l7 3.5 7-3.5v3.582l-7 3.5-7-3.5V9.418z" />
        </svg>
    </div>
);

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex items-start gap-3 my-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
      {isModel && <ModelIcon />}
      <div className={`max-w-xl p-4 rounded-lg shadow-md ${isModel ? 'bg-gray-700 text-gray-200 rounded-tl-none' : 'bg-amber-700 text-white rounded-tr-none'}`}>
        {message.content && (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-pre:bg-gray-800 prose-pre:p-3 prose-pre:rounded-md">
                {message.content.split('```').map((part, index) =>
                    index % 2 === 1 ? (
                        <pre key={index} className="whitespace-pre-wrap font-mono text-sm"><code>{part}</code></pre>
                    ) : (
                        <p key={index} className="whitespace-pre-wrap">{part}</p>
                    )
                )}
            </div>
        )}
        {message.image && (
          <div>
            <img src={message.image} alt="Generated content" className="mt-2 rounded-lg max-w-full h-auto" />
          </div>
        )}
      </div>
      {!isModel && <UserIcon />}
    </div>
  );
};

export default ChatMessageComponent;
