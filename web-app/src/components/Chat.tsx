'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmitWithError = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      setErrorMessage(null);
      await handleSubmit(e);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {errorMessage && (
        <div className="text-red-500 mb-4 p-4 bg-red-100 rounded-lg">
          Error: {errorMessage}
        </div>
      )}
      <div className="space-y-4 mb-20">
        {messages.map(message => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white ml-auto' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <strong className="font-semibold">{`${message.role}: `}</strong>
            <span className="whitespace-pre-wrap">{message.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmitWithError} className="fixed bottom-0 left-0 right-0 bg-background p-4">
        <div className="max-w-md mx-auto">
          <input
            className="w-full p-4 border border-gray-300 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            placeholder="Say something..."
            onChange={handleInputChange}
          />
        </div>
      </form>
    </div>
  );
} 