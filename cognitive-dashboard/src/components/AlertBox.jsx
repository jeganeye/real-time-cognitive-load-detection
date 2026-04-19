import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

const AlertBox = ({ loadLevel }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "System Initialized", type: 'info' }
  ]);

  useEffect(() => {
    if (loadLevel === 'Offline') {
      setMessages([{
        id: Date.now(),
        text: "Sensor Offline - Waiting for Camera",
        type: 'warning'
      }]);
      return;
    }

    let newMsg = null;
    if (loadLevel === 'High') {
      const highMsgs = ["Driver is Drowsy ⚠️", "Take a Break", "Low Attention Detected"];
      newMsg = {
        id: Date.now(),
        text: highMsgs[Math.floor(Math.random() * highMsgs.length)],
        type: 'danger'
      };
    } else if (loadLevel === 'Medium') {
      newMsg = {
        id: Date.now(),
        text: "Relax for a moment",
        type: 'warning'
      };
    } else {
      newMsg = {
        id: Date.now(),
        text: "Stay Focused",
        type: 'info'
      };
    }

    setMessages(prev => [newMsg, ...prev].slice(0, 3));
  }, [loadLevel]);

  return (
    <div className="glass-panel" style={{ padding: '24px', flex: '0 0 auto', minHeight: '220px' }}>
      <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)' }}>
        <AlertTriangle size={20} />
        System Alerts
      </h3>
      
      <div className="alerts-container">
        {messages.map((msg, index) => (
          <div 
            key={msg.id} 
            className={`alert-item slide-in ${msg.type === 'danger' ? 'danger shake' : msg.type === 'warning' ? 'warning' : 'info'}`}
            style={{ opacity: 1 - (index * 0.3) }}
          >
            {msg.type === 'danger' ? <AlertTriangle size={18} /> : <Info size={18} />}
            <span>{msg.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        .alerts-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .alert-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 500;
          border-left: 4px solid transparent;
        }
        .alert-item.danger {
          background: rgba(239, 68, 68, 0.1);
          border-left-color: var(--color-red);
          color: #fca5a5;
        }
        .alert-item.warning {
          background: rgba(234, 179, 8, 0.1);
          border-left-color: var(--color-yellow);
          color: #fde047;
        }
        .alert-item.info {
          background: rgba(34, 197, 94, 0.1);
          border-left-color: var(--color-green);
          color: #86efac;
        }
      `}</style>
    </div>
  );
};

export default AlertBox;
