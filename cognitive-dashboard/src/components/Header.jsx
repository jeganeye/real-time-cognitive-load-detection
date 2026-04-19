import React from 'react';
import { Activity } from 'lucide-react';

const Header = () => {
  return (
    <header className="glass-panel header animate-fade-in">
      <div className="header-title-wrapper">
        <h1 className="header-title neon-glow">AI Cognitive Load Detection</h1>
        <p className="header-subtitle">Real-Time Multi-Mode Monitoring</p>
      </div>
      <div className="header-status">
        <div className="status-dot"></div>
        <span>System Active</span>
        <Activity size={20} className="neon-glow" style={{ color: 'var(--accent-cyan)' }} />
      </div>
    </header>
  );
};

export default Header;
