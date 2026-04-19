import streamlit as st

st.set_page_config(page_title="Cognitive Load Detection")

st.title("🧠 Cognitive Load Detection System")

st.write("This is a demo version of the project.")

st.markdown("### Features")
st.write("- Eye tracking (EAR algorithm)")
st.write("- Attention detection")
st.write("- Fatigue alerts")

st.markdown("### How it works")
st.write("Webcam → AI Model → EAR Calculation → Load Detection → Alerts")

st.info("Full system uses Flask + React + OpenCV + MediaPipe.")

st.success("Streamlit version is for demo purpose only.")
