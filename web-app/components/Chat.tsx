'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useRef(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }).current;

  useEffect(() => {
    scrollToBottom();
    textareaRef.current?.focus();
  }, [scrollToBottom]);

  const handleSubmitWithError = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      setErrorMessage(null);
      await handleSubmit(e);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="flex flex-col">
      {errorMessage && (
        <div className="text-red-500 dark:text-red-400 mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
          Error: {errorMessage}
        </div>
      )}
      
      <div className="flex-1 space-y-4 mb-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`p-4 rounded-lg max-w-[80%] ${
              message.role === 'user' 
                ? 'bg-blue-500 dark:bg-blue-600 text-white ml-auto' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            <span className="whitespace-pre-wrap">{message.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form 
        onSubmit={handleSubmitWithError} 
        className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
      >
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 resize-none min-h-[60px] max-h-[200px]"
              value={input}
              placeholder="Submit your 311 request"
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <button
              type="submit"
              className="self-end px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!input.trim()}
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 