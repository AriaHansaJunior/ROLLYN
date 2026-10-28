# SPECTRUM Engine AI Microservice (Port 8001)

The **SPECTRUM Engine** is the specialized Python microservice providing high-precision Computer Vision, digit classification, and continuous learning capabilities for the IDX AI WISE (Rollyn) WMS platform.

---

## Architecture Overview

```
spectrum_engine/
├── app.py                      # FastAPI microservice entry point (Port 8001)
├── train_spectrum_led.py       # LED 7-segment & digit MLP neural network trainer
├── train_spectrum.py           # Dataset processing & model training pipeline
├── preload_easyocr.py          # Preloader script for offline EasyOCR fallback
├── requirements.txt            # Python dependencies (FastAPI, PyTorch, OpenCV, Scikit-learn, etc.)
├── best_mlp.pkl                # Serialized trained MLP neural network model weights
├── trained_weights.json        # Metadata, training accuracy, and last trained timestamp
├── retrain_status.json         # Real-time state machine for background retraining
├── dataset_digits/             # Categorized training image dataset by digit class
│   ├── 0/ ... 9/               # Real cropped images of scale digits from live operations
└── README.md                   # This documentation
```

---

## API Endpoints (FastAPI)

When running on `http://127.0.0.1:8001`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/spectrum/detect` | Accepts base64 scale display image; performs multi-pass detection via MLP classifier + EasyOCR fallback. |
| `POST` | `/api/spectrum/retrain` | Triggers background continuous learning on `dataset_digits/`. |
| `GET` | `/api/spectrum/retrain-status` | Returns training progress percentage, phase (`PREPARING`, `TRAINING`, `COMPLETED`), and metrics. |
| `GET` | `/api/spectrum/stats` | Returns total samples count, label breakdown, and last trained time. |
| `GET` | `/api/spectrum/health` | Health-check endpoint for service heartbeat. |

---

## How to Run

### Method 1: Using the Root Batch Script (Recommended)
Double-click `start_spectrum.bat` from the project root:
```bat
start_spectrum.bat
```

### Method 2: Manual Terminal Execution
```bash
python -m uvicorn spectrum_engine.app:app --host 127.0.0.1 --port 8001 --reload
```

---

## Connected Backend & Frontend Points

- **Backend Controller:** [`app/Http/Controllers/SpectrumEngineController.php`](../app/Http/Controllers/SpectrumEngineController.php)
- **Backend Auto-start:** [`app/Http/Controllers/IncomingRollController.php`](../app/Http/Controllers/IncomingRollController.php) (auto-boots microservice if offline)
- **Frontend Client:** [`resources/js/AI/Spectrum/SpectrumService.ts`](../resources/js/AI/Spectrum/SpectrumService.ts)
- **Frontend Live Engine:** [`resources/js/AI/Spectrum/SpectrumWeightDetectionEngine.tsx`](../resources/js/AI/Spectrum/SpectrumWeightDetectionEngine.tsx)
- **Frontend Training UI:** [`resources/js/Pages/Training.tsx`](../resources/js/Pages/Training.tsx)

