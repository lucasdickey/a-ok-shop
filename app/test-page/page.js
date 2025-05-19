'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data from /api/gallery...');
        const response = await fetch('/api/gallery');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Response data:', result);
        setData(result);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">API Response:</h2>
        {error ? (
          <div className="text-red-600">Error: {error}</div>
        ) : data ? (
          <pre className="bg-white p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div>Loading...</div>
        )}
      </div>
      
      <div className="p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Console Logs:</h2>
        <p>Check your browser's developer console for detailed logs.</p>
      </div>
    </div>
  );
}
