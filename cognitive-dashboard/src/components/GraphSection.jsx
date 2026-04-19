import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const GraphSection = ({ loadLevel, realTimeScore }) => {
  const [dataPoints, setDataPoints] = useState(Array.from({length: 15}, () => 0));
  const scoreRef = useRef(0);

  useEffect(() => {
    scoreRef.current = realTimeScore;
  }, [realTimeScore]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints(prev => {
        const newData = [...prev.slice(1)];
        if (loadLevel === 'Offline') {
          newData.push(0);
        } else {
          newData.push(scoreRef.current);
        }
        return newData;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [loadLevel]);

  const data = {
    labels: Array.from({length: 15}, (_, i) => i.toString()),
    datasets: [
      {
        fill: true,
        label: 'Cognitive Load',
        data: dataPoints,
        borderColor: 'rgba(34, 211, 238, 1)',
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { 
        display: true, 
        min: 0, 
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255,255,255,0.4)', stepSize: 25 }
      }
    },
    animation: {
      duration: 800,
      easing: 'linear'
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--accent-cyan)' }}>Real-time Trend</h3>
      <div style={{ flex: 1, minHeight: '150px', position: 'relative' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default GraphSection;
