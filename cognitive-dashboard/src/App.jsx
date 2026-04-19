import React, { useState } from 'react';
import Header from './components/Header';
import ModeSelection from './components/ModeSelection';
import WebcamSection from './components/WebcamSection';
import OutputDisplay from './components/OutputDisplay';
import AlertBox from './components/AlertBox';
import GraphSection from './components/GraphSection';
import './index.css';

function App() {
  const [activeMode, setActiveMode] = useState('Driving');
  const [loadLevel, setLoadLevel] = useState('Offline');
  const [hasPermission, setHasPermission] = useState(false);
  const [realTimeScore, setRealTimeScore] = useState(0);

  // Purely driven by WebcamSection now
  React.useEffect(() => {
    if (!hasPermission) {
      setLoadLevel('Offline');
      setRealTimeScore(0);
    }
  }, [hasPermission]);

  return (
    <div className="dashboard-container animate-fade-in">
      <Header />
      
      <div className="dashboard-main">
        {/* Left Sidebar */}
        <div className="left-sidebar animate-slide-left delay-100">
          <ModeSelection activeMode={activeMode} setActiveMode={setActiveMode} />
          <OutputDisplay loadLevel={loadLevel} />
        </div>

        {/* Center Canvas / Webcam */}
        <div className="center-section animate-slide-up delay-200">
          <WebcamSection 
            activeMode={activeMode} 
            hasPermission={hasPermission} 
            setHasPermission={setHasPermission} 
            setLoadLevel={setLoadLevel}
            setRealTimeScore={setRealTimeScore}
          />
        </div>

        {/* Right Sidebar */}
        <div className="right-sidebar animate-slide-right delay-300">
          <AlertBox loadLevel={loadLevel} />
          <GraphSection loadLevel={loadLevel} realTimeScore={realTimeScore} />
        </div>
      </div>
    </div>
  );
}

export default App;
