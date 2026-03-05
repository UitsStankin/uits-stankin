function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
          🎉 Всё работает!
        </h1>
        <p className="text-gray-600 text-center mb-6">
          React + TypeScript + Tailwind CSS настроены и готовы к работе
        </p>
        
        <div className="space-y-3">
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-105">
            Primary Button
          </button>
          
          <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition duration-200">
            Secondary Button
          </button>
        </div>

        <div className="mt-6 flex justify-center space-x-2">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            React
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            TypeScript
          </span>
          <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
            Tailwind
          </span>
        </div>
      </div>
    </div>
  )
}

export default App