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
        <div className="text-red-500 mb-4">
          Error: {errorMessage}
        </div>
      )}
      {messages.map(message => (
        <div
          key={message.id}
          className="whitespace-pre-wrap"
          style={{ color: message.role === 'user' ? 'white' : 'green' }}
        >
          <strong>{`${message.role}: `}</strong>
          {message.content}
          <br />
          <br />
        </div>
      ))}

      <form onSubmit={handleSubmitWithError}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
} 