import Chat from '@/components/Chat';

export default function ChatPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4 text-blue-700 dark:text-blue-400 text-center">311 Chat</h1>
        <Chat />
      </div>
    </main>
  );
} 