export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-4xl font-bold mb-4 text-blue-700 dark:text-blue-400">311 Agent</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
          Welcome to the future of city service requests! Our AI-powered 311 agent streamlines the process of reporting and managing city issues, leveraging advanced analytics and automation to deliver faster, smarter, and more transparent public service.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/chat"
            className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition"
          >
            Chat with 311 Agent
          </a>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition"
          >
            311 Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
