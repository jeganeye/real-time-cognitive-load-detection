import React from 'react';
import { BrainCircuit } from 'lucide-react';

const OutputDisplay = ({ loadLevel }) => {
  const getLevelColor = (level) => {
    switch(level) {
      case 'Low': return 'var(--color-green)';
      case 'Medium': return 'var(--color-yellow)';
      case 'High': return 'var(--color-red)';
      case 'Offline': return 'var(--text-secondary)';
      default: return 'var(--color-green)';
    }
  };

  const currentColor = getLevelColor(loadLevel);
  
  let barWidth = '0%';
  if (loadLevel === 'High') barWidth = '90%';
  else if (loadLevel === 'Medium') barWidth = '50%';
  else if (loadLevel === 'Low') barWidth = '15%';

  return (
    <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        <BrainCircuit size={20} />
        Cognitive Load Level
      </h3>
      
      <div className="load-indicator">
        <div key={loadLevel} className="level-text fade-in-scale" style={{ color: currentColor, textShadow: loadLevel === 'Offline' ? 'none' : `0 0 15px ${currentColor}` }}>
          {loadLevel}
        </div>
        
        <div className="level-bar-container">
          <div 
            className="level-bar-fill transition-bar"
            style={{ 
              width: barWidth,
              background: currentColor,
              boxShadow: loadLevel === 'Offline' ? 'none' : `0 0 15px ${currentColor}`
            }}
          />
        </div>
      </div>

      <style>{`
        .load-indicator {
          margin-top: 24px;
          text-align: center;
        }
        .level-text {
          font-size: 3.5rem;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .level-bar-container {
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
        }
        .transition-bar {
          height: 100%;
          border-radius: 10px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1), background-color 1s ease;
        }
        .fade-in-scale {
          animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default OutputDisplay;
