import React from 'react';

const Test = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Test Page - Styling Check</h1>
        
        {/* Test Tailwind Classes */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Basic Styling Test</h2>
            <p className="text-gray-600 mb-4">This should have proper styling if Tailwind is working.</p>
            
            <div className="flex space-x-4">
              <button className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200">
                Primary Button
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors duration-200">
                Secondary Button
              </button>
            </div>
          </div>

          {/* Test Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-500 text-white p-4 rounded-lg">
              <h3 className="font-semibold">Card 1</h3>
              <p>Blue card with white text</p>
            </div>
            <div className="bg-green-500 text-white p-4 rounded-lg">
              <h3 className="font-semibold">Card 2</h3>
              <p>Green card with white text</p>
            </div>
            <div className="bg-purple-500 text-white p-4 rounded-lg">
              <h3 className="font-semibold">Card 3</h3>
              <p>Purple card with white text</p>
            </div>
          </div>

          {/* Test Form Elements */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Form Elements Test</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Input Field</label>
                <input 
                  type="text" 
                  placeholder="Enter some text..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Dropdown</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;
