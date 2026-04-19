document.addEventListener('DOMContentLoaded', () => {
    // Initialize Particles.js background
    particlesJS("particles-js", {
        "particles": {
            "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": "#00e5ff" },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.4, "random": true },
            "size": { "value": 3, "random": true },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#00e5ff",
                "opacity": 0.3,
                "width": 1
            },
            "move": { "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": { "enable": true, "mode": "repulse" },
                "onclick": { "enable": true, "mode": "push" },
                "resize": true
            }
        },
        "retina_detect": true
    });

    const socket = io();
    let currentMode = "Driving";

    // Live Attention Graph Init
    const liveChartCanvas = document.getElementById('liveAttentionChart');
    let liveChartInstance = null;
    let liveLabels = [];
    let liveData = [];
    let lastGraphUpdate = 0;

    if (liveChartCanvas) {
        liveChartInstance = new Chart(liveChartCanvas, {
            type: 'line',
            data: {
                labels: liveLabels,
                datasets: [{
                    label: 'Attention Load',
                    data: liveData,
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    y: {
                        min: 0,
                        max: 4,
                        ticks: {
                            callback: function(value) {
                                if(value === 1) return 'LOW';
                                if(value === 2) return 'MED';
                                if(value === 3) return 'HIGH';
                                return '';
                            },
                            color: '#fff',
                            font: { size: 10 }
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: { display: false }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
    const modeButtons = document.querySelectorAll('.mode-btn');
    const loadValue = document.getElementById('load-value');
    const earValue = document.getElementById('ear-value');
    const blinkValue = document.getElementById('blink-value');
    const alertBox = document.getElementById('alert-box');
    const alertMessage = document.getElementById('alert-message');
    const suggestionList = document.getElementById('suggestion-list');
    const alertSound = document.getElementById('alert-sound');

    // Handle Mode Selection UI updating & Backend notifying
    modeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeButtons.forEach(b => b.classList.remove('active'));
            const clickedBtn = e.target;
            clickedBtn.classList.add('active');
            
            const newMode = clickedBtn.getAttribute('data-mode');
            if (newMode !== currentMode) {
                currentMode = newMode;
                socket.emit('set_mode', { mode: currentMode });
                
                // Add click effect
                clickedBtn.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    clickedBtn.style.transform = 'scale(1)';
                }, 150);
            }
        });
    });

    // Socket data receiver logic
    let lastAlertPlay = 0;

    socket.on('cognitive_data', (data) => {
        // Update basic metrics
        earValue.textContent = data.ear;
        blinkValue.textContent = data.blink_rate;

        // Animate count up/down if you want, but fast updates may make it jittery.
        // Update Status indicator
        loadValue.textContent = data.load;
        loadValue.className = `status-indicator ${data.load.toLowerCase()}`;
        
        // Update Video Box glow effect dynamically
        const videoWrapper = document.querySelector('.video-wrapper');
        if (data.load === 'HIGH') {
            videoWrapper.style.boxShadow = '0 0 30px rgba(255, 0, 85, 0.7)';
        } else if (data.load === 'MEDIUM') {
            videoWrapper.style.boxShadow = '0 0 20px rgba(255, 204, 0, 0.5)';
        } else {
            videoWrapper.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.4)';
        }

        // Handle Alerts logic
        if (data.is_critical) {
            alertBox.classList.remove('hidden');
            alertMessage.textContent = data.alert;
            
            // Throttle audio alerts (play at most once every 3 seconds)
            const now = Date.now();
            if (now - lastAlertPlay > 3000) {
                // Ensure audio isn't blocked by autoplay policies
                let playPromise = alertSound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Audio autoplay was prevented. User must interact with the document first.");
                    });
                }
                lastAlertPlay = now;
            }
        } else {
            alertBox.classList.add('hidden');
        }

        // Update Live Chart (Throttle to approx 1 update per second)
        const nowMs = Date.now();
        if (liveChartInstance && (nowMs - lastGraphUpdate > 1000)) {
            lastGraphUpdate = nowMs;
            const nowTime = new Date().toLocaleTimeString();
            liveLabels.push(nowTime);
            
            let loadNum = 1;
            if (data.load === 'HIGH') loadNum = 3;
            else if (data.load === 'MEDIUM') loadNum = 2;
            
            liveData.push(loadNum);
            
            // Keep last 300 points representing approx last 5 minutes of continuous data
            if (liveLabels.length > 300) {
                liveLabels.shift();
                liveData.shift();
            }
            liveChartInstance.update();
        }

        // Smart Suggestions List updating
        let suggestionsHTML = '';
        if (Array.isArray(data.suggestion)) { 
            data.suggestion.forEach(s => { suggestionsHTML += `<li><span style="display:inline-block; font-size:1.4rem;">💡</span> ${s}</li>`; });
        } else {
            suggestionsHTML = `<li><span style="display:inline-block; font-size:1.4rem;">💡</span> ${data.suggestion}</li>`;
        }
        suggestionList.innerHTML = suggestionsHTML;
    });

    // Session Scheduler Logic
    const startSessionBtn = document.getElementById('start-session-btn');
    const sessionDurationInput = document.getElementById('session-duration');
    const sessionStatus = document.getElementById('session-status');
    const sessionSummaryBox = document.getElementById('session-summary-box');
    const sessionChartCanvas = document.getElementById('sessionChart');
    const worstFrameBox = document.getElementById('worst-frame-box');
    const worstFrameImg = document.getElementById('worst-frame-img');
    let chartInstance = null;

    if (startSessionBtn) {
        startSessionBtn.addEventListener('click', () => {
            const duration = parseFloat(sessionDurationInput.value);
            if (isNaN(duration) || duration <= 0) {
                alert("Please enter a valid duration in minutes.");
                return;
            }
            
            socket.emit('start_session', { duration: duration });
            sessionStatus.textContent = `Session active for ${duration} minute(s)...`;
            sessionStatus.style.display = 'block';
            sessionSummaryBox.style.display = 'none';
        });
    }

    socket.on('session_result', (result) => {
        // Output from server
        sessionStatus.style.display = 'none';
        sessionSummaryBox.style.display = 'block';
        
        const dataPoints = result.data || [];
        const worstImage = result.image;

        if (worstImage) {
            worstFrameImg.src = worstImage;
            worstFrameBox.style.display = 'block';
        } else {
            worstFrameBox.style.display = 'none';
        }

        // Render Graph
        const labels = dataPoints.map(d => d.time + "s");
        const loads = dataPoints.map(d => d.load); // 1, 2, 3

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(sessionChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cognitive Load',
                    data: loads,
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#ffcc00',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        min: 0,
                        max: 4,
                        ticks: {
                            callback: function(value) {
                                if(value === 1) return 'LOW';
                                if(value === 2) return 'MEDIUM';
                                if(value === 3) return 'HIGH';
                                return '';
                            },
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff',
                            maxTicksLimit: 10
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    });

    socket.on('alert_data', (data) => {
        const mistakeImagesContainer = document.getElementById('mistake-images');
        const noMistakesText = document.getElementById('no-mistakes-text');
        
        if (mistakeImagesContainer) {
            if (noMistakesText) noMistakesText.style.display = 'none';
            
            const newImg = document.createElement('img');
            newImg.src = data.image;
            newImg.style.width = '100%';
            newImg.style.borderRadius = '8px';
            newImg.style.border = '2px solid #ff4d4d';
            newImg.style.boxShadow = '0 0 10px rgba(255, 77, 77, 0.3)';
            
            const timeLabel = document.createElement('div');
            timeLabel.textContent = new Date().toLocaleTimeString();
            timeLabel.style.color = '#ffcc00';
            timeLabel.style.fontSize = '0.9em';
            timeLabel.style.marginTop = '10px';
            timeLabel.style.marginBottom = '5px';
            timeLabel.style.fontFamily = "'Orbitron', sans-serif";
            
            const itemWrapper = document.createElement('div');
            itemWrapper.appendChild(timeLabel);
            itemWrapper.appendChild(newImg);
            
            // Append at the top
            mistakeImagesContainer.insertBefore(itemWrapper, mistakeImagesContainer.firstChild);
        }

        let suggestionsHTML = '';
        if (Array.isArray(data.suggestions)) { 
            data.suggestions.forEach(s => { suggestionsHTML += `<li><span style="display:inline-block; font-size:1.4rem;">🚨</span> <strong style="color: #ffcc00">${s}</strong></li>`; });
        }
        suggestionList.innerHTML = suggestionsHTML;
    });
});
