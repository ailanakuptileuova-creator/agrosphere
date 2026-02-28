import React, { useState } from 'react';
import { MapView } from './components/MapView';
import { StatsPanel} from './components/StatsPanel';
import { AIAssistant } from './components/AIAssistant';

function App() {
  const [user] = useState({ username: 'Farmer' });

  const handleLogout = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-emerald-950 overflow-hidden font-inter">
      <StatsPanel onLogout={handleLogout} username={user.username} />
      
      <main className="flex-1 flex flex-col relative">
        <header className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          <div className="bg-emerald-900/80 backdrop-blur-md border border-emerald-500/30 px-4 py-2 rounded-xl pointer-events-auto">
            <h1 className="text-xl font-bold text-emerald-50">
              AgroSphere <span className="text-emerald-400">AI</span>
            </h1>
          </div>
        </header>

        <div className="flex-1 relative">
          <MapView />
        </div>
        
        <AIChat />
      </main>
    </div>
  );
}

export default App;