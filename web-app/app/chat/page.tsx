import Chat from '@/components/Chat';

export default function ChatPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-2 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl w-full space-y-4">
        {/* Instructions Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">How to Submit a 311 Request</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please describe the issue you'd like to report. Include as much detail as possible:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
            <li>What is the problem?</li>
            <li>Where is it located? (address, nearest intersection, or landmark)</li>
            <li>When did you notice it?</li>
            <li>Any additional details that might help us respond faster.</li>
          </ul>
        </div>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-4 text-blue-700 dark:text-blue-400 text-center">311 Chat</h1>
          <Chat />
        </div>
      </div>
    </main>
  );
} 