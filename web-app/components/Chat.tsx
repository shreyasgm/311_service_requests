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
        <div className="text-red-500 dark:text-red-400 mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
          Error: {errorMessage}
        </div>
      )}
      <div className="space-y-4 mb-20">
        {messages.map(message => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 dark:bg-blue-600 text-white ml-auto' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            <strong className="font-semibold">{`${message.role}: `}</strong>
            <span className="whitespace-pre-wrap">{message.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmitWithError} className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto">
          <input
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
            value={input}
            placeholder="Submit your 311 request"
            onChange={handleInputChange}
            autoFocus
          />
        </div>
      </form>
    </div>
  );
} 