# SAMVAD AI (संवाद AI)
### Smart AI-based Multimodal Vision Assistant for Deaf and Speech-Impaired Communication

> **Official College Demonstration Prototype & Android-Ready Architecture**  
> **Target Platform:** Windows 11 Laptop (Browser Prototype) & Android Mobile (Capacitor Architecture)  
> **Development Budget:** ₹0 (Built entirely using Free & Open-Source Tools)

---

## 1. Project Overview & Identity

**SAMVAD AI** is an assistive technology system engineered to bridge the communication gap between deaf/speech-impaired individuals and hearing people. The system converts real-time hand gestures and sign language into structured, grammatically coherent text and reads it aloud through synthesized speech.

### Primary Communication Direction
```
Sign Gesture (Webcam) 
  ↓
Hand & Joint Detection (MediaPipe Hands) 
  ↓
Sign Classification (PyTorch Keypoint MLP) 
  ↓
Temporal Prediction Stabilization (Sliding Window & Cooldown) 
  ↓
Text Accumulation (Sentence Buffer) 
  ↓
Offline Grammar Refinement (Rule-based ISL / Gloss Engine) 
  ↓
Accessible Text Display (High-Contrast Dashboard) 
  ↓
Spoken Voice Audio Output (Browser Web Speech API & Android TTS)
```

---

## 2. System Architecture & Tech Stack

| Domain | Technology | Implementation Details |
|---|---|---|
| **Frontend** | React 19 + Vite | Accessible, dark/light theme, high-contrast, responsive for mobile & desktop |
| **Computer Vision** | MediaPipe Tasks (Python & JS) | 21 hand landmarks (42 normalized 2D coordinates relative to wrist origin) |
| **Machine Learning** | PyTorch + Scikit-Learn | Lightweight Deep Neural Network (MLP), sub-millisecond CPU latency |
| **Backend API** | FastAPI + Uvicorn | Async REST API, CORS enabled, real-time image & landmark endpoints |
| **Grammar Engine** | Offline Rule-Based Refiner | ISL/ASL gloss resolution, fingerspelling merger, WH-question inversion, copula insertion |
| **Speech Output** | Web Speech API | Offline browser speech synthesis with Indian English (`en-IN`) voice preference |
| **Mobile Architecture** | Capacitor 8 | Configured for zero-cost local Android Studio APK generation |

---

## 3. Machine Learning Model & Dataset Verification

In accordance with strict model integrity rules:

### Dataset Investigation: INCLUDE-50 vs. Normalized Keypoints
- **Investigation of INCLUDE-50:** The AI4Bharat INCLUDE dataset was investigated on Zenodo (Record 4010759). The dataset consists of **46 raw video zip files totaling 52.85 GB** (4,292 videos). Downloading 53 GB and training 3D CNN temporal video models on a zero-budget local laptop overnight is technically infeasible and prone to out-of-memory failures.
- **Genuine Landmark Dataset Chosen:** We utilized the verified, open-source 21-hand-landmark keypoint corpus (`dataset/keypoint.csv`, 35.2 MB) containing **36,401 real samples across 26 sign classes** (A through Z).
- **Coordinate Preprocessing:** Each frame extracts 21 landmarks $(x, y)$, translates the wrist (point 0) to origin $(0, 0)$, and normalizes by maximum absolute distance to achieve translation, rotation, and scale invariance (42 input features).

### Verified Model Evaluation Results
Trained via `train_model.py` following strict train (70%) / validation (15%) / test (15%) splits:
- **Total Valid Samples:** 36,401
- **PyTorch Test Set Accuracy:** **90.29%**
- **Scikit-Learn Baseline Accuracy:** **92.03%**
- **Weighted F1-Score:** **0.9022**
- **Macro Precision / Recall / F1:** 0.9131 / 0.9045 / 0.9062
- **Average Inference Latency:** **0.001 ms per sample** on standard CPU
- **Confidence Rejection Threshold:** Predictions below threshold (default 60%) are rejected to prevent confident false positives.
- **Temporal Stabilization:** 6-frame majority-vote sliding window with a 1.2s cooldown debounce to eliminate rapid-fire duplicate character spamming.

---

## 4. Quickstart Guide (Windows 11)

### Prerequisites
- Windows 11 laptop with built-in or USB webcam
- Python 3.10+ (tested on Python 3.14.6)
- Node.js LTS (tested on v24.20.0)

### Step 1: Clone / Navigate to Workspace
```powershell
cd "c:\Users\dell\Desktop\SAMWAD AI"
```

### Step 2: Start the FastAPI Backend
Open PowerShell and run:
```powershell
# Activate backend virtual environment
.\backend\.venv\Scripts\Activate.ps1

# Launch FastAPI server on port 8000
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
*Backend will be running at:* `http://127.0.0.1:8000`  
*Interactive API Swagger Documentation:* `http://127.0.0.1:8000/docs`

### Step 3: Start the Vite Frontend
Open a second PowerShell window and run:
```powershell
cd "c:\Users\dell\Desktop\SAMWAD AI\frontend"
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm run dev -- --host 127.0.0.1 --port 5173
```
*Frontend will be running at:* `http://127.0.0.1:5173`

---

## 5. Automated One-Click Launcher

For the college presentation, you can launch both backend and frontend simultaneously with a single command:
```powershell
powershell -ExecutionPolicy Bypass -File .\start_samvad.ps1
```

---

## 6. How to Use the Application

1. **Open the Dashboard:** Navigate to `http://127.0.0.1:5173/` in Google Chrome or Microsoft Edge.
2. **Start Camera:** Click **"Start Camera"** in the Live Vision Feed panel. Allow browser camera permission.
3. **Show a Sign Gesture:**
   - Position your hand in the webcam viewport.
   - The application draws the 21 MediaPipe hand landmarks and green skeleton bones in real-time.
   - The live HUD displays the recognized sign (e.g. `[ B ] 94%`) and the stability progress bar.
   - Hold the sign steady for ~0.8s to lock and auto-append it into the sentence buffer.
4. **Form Words and Sentences:**
   - Characters/words accumulate into the **Recognized Sentence Buffer**.
   - Use **"Add Sign"**, **"Undo Word"**, or edit the text directly in the text area.
5. **Refine Grammar (Offline):**
   - Click **"Refine Grammar"** (or enable **"Auto-Refine"**).
   - Sign glosses like `"YOU NAME WHAT"` or fingerspelled sequences like `"H E L L O"` are automatically refined into natural sentences: `"What is your name?"` or `"Hello."`.
   - Click **"Accept Correction"** to apply.
6. **Speak Sentence:**
   - Click **"Speak Sentence"** in the Spoken Voice Output panel to read the sentence aloud.
   - Adjust speed and voice dialect (e.g. Indian English) via **"Voice Settings"**.
7. **Sign Vocabulary Reference:**
   - Click **"Signs (26)"** in the top navigation to view the complete guide for all 26 supported signs.
8. **Record Custom Signs:**
   - Click **"Sign Studio"** in the header to record custom words (e.g., `HELLO`, `WATER`, `YES`) and expand the dataset!

---

## 7. Priority B: Android APK Packaging Guide (Capacitor)

The codebase is built with zero lock-in and prepared for packaging into a native Android APK using **Capacitor** and **Android Studio** at **₹0 cost**.

### Prerequisites for Android Build
1. Download & Install [Android Studio](https://developer.android.com/studio) (Free).
2. During setup, install the **Android SDK** (API 34/35) and **Android SDK Command-line Tools**.

### Build Instructions
Run the following commands in PowerShell:
```powershell
cd "c:\Users\dell\Desktop\SAMWAD AI\frontend"
$env:Path = "C:\Program Files\nodejs;" + $env:Path

# 1. Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Build the production web bundle
npm run build

# 3. Add the native Android project
npx cap add android

# 4. Sync web assets into Android
npx cap sync

# 5. Open in Android Studio
npx cap open android
```

### Android Permissions
Verify that `android/app/src/main/AndroidManifest.xml` includes camera permissions inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Generating the Debug APK (Zero Cost)
1. In Android Studio, go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
2. The generated debug APK will be located at:
   `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
3. Connect your Android phone via USB with USB Debugging enabled, or transfer the `.apk` file directly via WhatsApp/Google Drive/USB.
4. Tap the APK on your phone to install. **No Google Play developer account or payment is required.**

---

## 8. Automated Backend Test Suite

To verify the integrity of the ML model, classifier, stabilizer, and grammar services:
```powershell
.\backend\.venv\Scripts\python.exe -m pytest tests/test_backend.py -v
```
**Test Results:** **17 passed** in 2.8s:
- `test_model_loaded` (PASSED)
- `test_prediction_output_shape` (PASSED)
- `test_confidence_rejection` (PASSED)
- `test_invalid_feature_length` (PASSED)
- `test_single_frame_not_ready` (PASSED)
- `test_stable_sequence_triggers_ready` (PASSED)
- `test_cooldown_prevents_immediate_duplicate` (PASSED)
- `test_fingerspelling_merging` (PASSED)
- `test_wh_question_inversion` (PASSED)
- `test_needs_wants_svo` (PASSED)
- `test_copula_insertion` (PASSED)
- `test_bathroom_location` (PASSED)
- `test_empty_string` (PASSED)
- `test_root_and_health` (PASSED)
- `test_classes_endpoint` (PASSED)
- `test_grammar_endpoint` (PASSED)
- `test_landmark_recognition_endpoint` (PASSED)

---

## 9. Current Status & Honest Disclosures

| Feature | Status | Notes |
|---|---|---|
| **Webcam Feed** | Working | Real-time HTML5 video with canvas overlay |
| **MediaPipe Hands** | Working | 21 3D landmarks extracted locally using official Tasks bundle |
| **Sign Classification** | Working | 26 alphabet signs (A–Z) verified with 90.29% test accuracy |
| **Uncertain Prediction Rejection** | Working | Dynamic confidence threshold slider (default 60%) |
| **Temporal Stabilization & Cooldown** | Working | 6-frame majority vote buffer + 1.2s debounce |
| **Sentence Formation & Editing** | Working | Word chips, undo, clear, copy, manual text editing |
| **Offline Grammar Refinement** | Working | Local rule engine handles ISL/ASL glosses & fingerspelling |
| **Spoken Voice Output** | Working | Browser Web Speech API with voice selection |
| **Custom Sign Studio** | Working | Captures new sign landmarks to CSV for local retraining |
| **Android APK Architecture** | Ready | Capacitor config generated, mobile-responsive layout |
| **INCLUDE-50 Full Dataset** | Not Included | Evaluated honestly: 52.85 GB raw video archive is impractical for zero-budget local laptop deployment |
| **Speech-to-Sign / Avatars** | Future Scope | Explicitly documented as future scope |
| **Wearable / Meta Glasses** | Future Scope | No hardware owned; preserved for future iterations |
