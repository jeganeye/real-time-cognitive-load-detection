import cv2
import time
import numpy as np
from flask import Flask, render_template, Response
from flask_socketio import SocketIO
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import math
import base64

def encode_frame(frame):
    ret, buffer = cv2.imencode('.jpg', frame)
    if ret:
        return base64.b64encode(buffer).decode('utf-8')
    return ""

def get_suggestion(mode):
    if not mode:
        return ["Take a break", "Stay hydrated"]
    mode = mode.lower()
    suggestions = {
        "study": ["Take a short break", "Avoid distractions", "Revise slowly"],
        "work": ["Reduce multitasking", "Stay focused", "Take deep breath"],
        "gaming": ["Blink frequently", "Relax eyes", "Reduce screen time"],
        "reading": ["Adjust posture", "Improve lighting", "Slow reading pace"],
        "exam": ["Stay calm", "Focus on one question", "Avoid panic"],
        "onlinemeeting": ["Stay focused", "Take quick stretch", "Focus on current speaker"],
        "classroom": ["Sit straight", "Focus on teacher", "Avoid dozing off"],
        "driving": ["Pull over immediately", "Drink water", "Rest for 15 minutes"]
    }
    return suggestions.get(mode, ["Take a break", "Stay hydrated"])

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode='threading')

face_base_options = python.BaseOptions(model_asset_path='face_landmarker.task')
face_options = vision.FaceLandmarkerOptions(
    base_options=face_base_options,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False,
    num_faces=1)
face_detector = vision.FaceLandmarker.create_from_options(face_options)

hand_base_options = python.BaseOptions(model_asset_path='hand_landmarker.task')
hand_options = vision.HandLandmarkerOptions(
    base_options=hand_base_options,
    num_hands=2)
hand_detector = vision.HandLandmarker.create_from_options(hand_options)

pose_base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
pose_options = vision.PoseLandmarkerOptions(
    base_options=pose_base_options,
    output_segmentation_masks=False)
pose_detector = vision.PoseLandmarker.create_from_options(pose_options)

# Indices for the eyes via MediaPipe Face Mesh
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

def euclidean_distance(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

def calculate_ear(landmarks, eye_indices, img_w, img_h):
    coords = []
    for idx in eye_indices:
        lm = landmarks[idx]
        coords.append((int(lm.x * img_w), int(lm.y * img_h)))
    
    A = euclidean_distance(coords[1], coords[5])
    B = euclidean_distance(coords[2], coords[4])
    C = euclidean_distance(coords[0], coords[3])
    
    if C == 0:
        return 0.0
    return (A + B) / (2.0 * C)

# Global State
global_state = {
    'mode': 'Driving',
    'start_time': time.time(),
    'blinks': 0,
    'blink_timestamps': [],
    'avg_ear': 0.3,
    'recent_ears': [],
    'session_active': False,
    'session_start': 0,
    'session_end_time': 0,
    'session_data': [],
    'session_worst_ear': 1.0,
    'session_worst_frame': ""
}

cap = cv2.VideoCapture(0)

def detect_cognitive_load(ear, blink_rate):
    if ear < 0.20 and blink_rate > 30:
        return "HIGH"  # low EAR, high blink -> fatigue/stress
    elif ear < 0.22:
        return "HIGH"  # prolonged eye closure
    elif blink_rate < 10 and blink_rate > 0 and ear > 0.3:
        return "LOW"
    elif 10 <= blink_rate <= 25:
        return "MEDIUM"
    else:
        return "LOW" if ear > 0.25 else "MEDIUM"

def get_mode_alert(load, mode):
    if mode == "Driving":
        if load == "HIGH": return "Driver is Drowsy ⚠️", True
    elif mode == "Study":
        if load == "HIGH": return "Take a Break 📚", True
    elif mode == "Work":
        if load == "HIGH": return "Relax for a moment 💼", True
    elif mode == "Classroom":
        if load == "LOW": return "Low Attention Detected 📊", True
    elif mode == "OnlineMeeting":
        if load == "LOW": return "Stay Focused 💻", True
    return "Status Normal", False

def get_smart_suggestions(ear, blink_rate, usage_time_min, load, mode):
    if usage_time_min > 30 and blink_rate > 25:
        return "Drink water 💧"
    if usage_time_min > 120:
        return "Eat food 🍎"
    if ear < 0.20 or load == "HIGH":
        if mode in ["Study", "Work"]:
            return "Take a short break"
        return "Take rest 😴"
    return "All good, keep going!"

def generate_frames():
    global global_state
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            time.sleep(0.1)
            continue
            
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        img_h, img_w, _ = frame.shape
        ear = 0.3
        
        mode = global_state['mode']
        
        # Draw tracking based on mode
        should_draw_hands = False
        should_draw_pose = False
        
        face_result = face_detector.detect(mp_image)
        if should_draw_hands:
            hand_result = hand_detector.detect(mp_image)
        if should_draw_pose:
            pose_result = pose_detector.detect(mp_image)
        
        if face_result.face_landmarks:
            for face_landmarks in face_result.face_landmarks:
                left_ear = calculate_ear(face_landmarks, LEFT_EYE, img_w, img_h)
                right_ear = calculate_ear(face_landmarks, RIGHT_EYE, img_w, img_h)
                ear = (left_ear + right_ear) / 2.0
                
                # Draw face tracking for visual flair
                for idx in LEFT_EYE + RIGHT_EYE:
                    lm = face_landmarks[idx]
                    cv2.circle(frame, (int(lm.x * img_w), int(lm.y * img_h)), 1, (0, 255, 0), -1)
                        
        if should_draw_hands and hasattr(hand_result, "hand_landmarks") and hand_result.hand_landmarks:
            for hand_landmarks in hand_result.hand_landmarks:
                for lm in hand_landmarks:
                    cv2.circle(frame, (int(lm.x * img_w), int(lm.y * img_h)), 2, (255, 0, 0), -1)
                        
        if should_draw_pose and hasattr(pose_result, "pose_landmarks") and pose_result.pose_landmarks:
            for pose_landmarks in pose_result.pose_landmarks:
                for lm in pose_landmarks:
                    cv2.circle(frame, (int(lm.x * img_w), int(lm.y * img_h)), 3, (0, 0, 255), -1)
                
        # Smoothing EAR
        global_state['recent_ears'].append(ear)
        if len(global_state['recent_ears']) > 15:
            global_state['recent_ears'].pop(0)
        smoothed_ear = sum(global_state['recent_ears']) / max(1, len(global_state['recent_ears']))
        
        # Blink detection logic (simple thresholding with hysteresis)
        current_time = time.time()
        if smoothed_ear < 0.21:
            if not getattr(generate_frames, "is_closed", False):
                generate_frames.is_closed = True
                global_state['blink_timestamps'].append(current_time)
        else:
            generate_frames.is_closed = False
            
        # Clean up old blinks (keep last 60 seconds)
        global_state['blink_timestamps'] = [t for t in global_state['blink_timestamps'] if current_time - t < 60]
        blink_rate = len(global_state['blink_timestamps'])
        
        usage_time_sec = current_time - global_state['start_time']
        usage_time_min = usage_time_sec / 60.0
        
        load = detect_cognitive_load(smoothed_ear, blink_rate)
        alert, is_critical = get_mode_alert(load, global_state['mode'])
        suggestion = get_smart_suggestions(smoothed_ear, blink_rate, usage_time_min, load, global_state['mode'])
        
        # New Feature: Attention Failure Capture + Smart Suggestions
        if is_critical and (current_time - global_state.get('last_alert_time', 0)) > 5:
            global_state['last_alert_time'] = current_time
            encoded_img = encode_frame(frame)
            if encoded_img:
                socketio.emit('alert_data', {
                    'image': f"data:image/jpeg;base64,{encoded_img}",
                    'suggestions': get_suggestion(global_state['mode'])
                })
                
        # Session Scheduler & Summary Tracker
        if global_state.get('session_active'):
            last_record = getattr(generate_frames, "last_session_record", 0)
            if current_time - last_record >= 1.0:
                generate_frames.last_session_record = current_time
                load_val = 3 if load == "HIGH" else (2 if load == "MEDIUM" else 1)
                offset = int(current_time - global_state['session_start'])
                global_state['session_data'].append({"time": offset, "load": load_val})
                
                if smoothed_ear < global_state['session_worst_ear'] or is_critical:
                    global_state['session_worst_ear'] = min(smoothed_ear, global_state['session_worst_ear'])
                    enc_frame = encode_frame(frame)
                    if enc_frame:
                        global_state['session_worst_frame'] = f"data:image/jpeg;base64,{enc_frame}"

            if current_time >= global_state['session_end_time']:
                global_state['session_active'] = False
                socketio.emit('session_result', {
                    'data': global_state['session_data'],
                    'image': global_state['session_worst_frame']
                })
        
        # Send data via socket
        socketio.emit('cognitive_data', {
            'ear': round(smoothed_ear, 2),
            'blink_rate': blink_rate,
            'load': load,
            'mode': global_state['mode'],
            'alert': alert,
            'is_critical': is_critical,
            'suggestion': suggestion,
            'usage_time_min': round(usage_time_min, 1)
        })
        
        # We can add visual text to the frame, but let's keep it clean since it goes to UI
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@socketio.on('set_mode')
def handle_set_mode(data):
    if 'mode' in data:
        global_state['mode'] = data['mode']
        print(f"Mode switched to: {global_state['mode']}")

@socketio.on('start_session')
def handle_start_session(data):
    duration_min = data.get('duration', 0)
    if duration_min > 0:
        global_state['session_active'] = True
        global_state['session_start'] = time.time()
        global_state['session_end_time'] = time.time() + (float(duration_min) * 60)
        global_state['session_data'] = []
        global_state['session_worst_ear'] = 1.0
        global_state['session_worst_frame'] = ""
        print(f"Session started for {duration_min} minutes.")

if __name__ == '__main__':
    # Start app
    socketio.run(app, debug=False, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
