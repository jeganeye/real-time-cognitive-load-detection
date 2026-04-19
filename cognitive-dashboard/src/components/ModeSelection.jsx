import React from 'react';
import { Car, BookOpen, Briefcase, GraduationCap, Headphones } from 'lucide-react';

const modes = [
  { id: 'Driving', icon: Car, label: 'Driving 🚗' },
  { id: 'Study', icon: BookOpen, label: 'Study 📚' },
  { id: 'Work', icon: Briefcase, label: 'Work 💼' },
  { id: 'Classroom', icon: GraduationCap, label: 'Classroom 🏫' },
  { id: 'Online Meeting', icon: Headphones, label: 'Online Meeting 🎧' },
];

const ModeSelection = ({ activeMode, setActiveMode }) => {
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Current Mode
      </h3>
      <div style={{ display: 'grid', gap: '12px' }}>
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`mode-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>
      
      <style>{`
        .mode-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .mode-btn:hover {
          transform: scale(1.02);
          background: rgba(34, 211, 238, 0.1);
          border-color: rgba(34, 211, 238, 0.3);
          box-shadow: 0 0 15px rgba(34, 211, 238, 0.2);
        }
        .mode-btn.active {
          background: linear-gradient(90deg, rgba(34, 211, 238, 0.2), rgba(167, 139, 250, 0.2));
          border-color: var(--accent-cyan);
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.3);
        }
        .mode-btn.active::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          background: var(--accent-cyan);
          box-shadow: 0 0 10px var(--accent-cyan);
        }
      `}</style>
    </div>
  );
};

export default ModeSelection;
