import streamlit as st

st.set_page_config(page_title="Cognitive Load Detection", layout="centered")

st.title("🧠 Real-Time Cognitive Load Detection")

st.write("This project detects user attention and fatigue using AI.")

st.markdown("## 🔍 How it works")

st.write("""
1. Webcam captures user face  
2. AI model detects eye movement  
3. EAR (Eye Aspect Ratio) is calculated  
4. System detects attention / fatigue  
5. Alerts are generated  
""")

st.markdown("## ⚙️ Technologies Used")
st.write("- OpenCV")
st.write("- MediaPipe")
st.write("- Flask + SocketIO")
st.write("- React (Frontend)")

st.success("Full system runs locally with real-time detection.")

st.warning("Streamlit version is a demo (no live webcam).")
