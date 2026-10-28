# Frontend AI Architecture (`resources/js/AI`)

This directory houses all client-side Artificial Intelligence, Computer Vision, and heuristic recommendation algorithms for the IDX AI WISE (Rollyn) platform.

---

## Directory Structure

```
resources/js/AI/
├── index.ts                         # Centralized entry point exporting all AI modules
├── README.md                        # Architectural documentation (this file)
│
├── Vision/                          # Subsystem 1: Client-Side Computer Vision & OCR
│   ├── ImageProcessor.ts            # Canvas processing: Sauvola adaptive thresholding, deskew & morphological filter
│   ├── OCRService.ts                # Tesseract.js worker lifecycle, whitelist config, and execution pipeline
│   ├── SegmentMatcher.ts            # 7-segment LED display topological heuristic matcher
│   ├── DigitTemplateStore.ts        # Calibrated digit template repository and normalizer
│   └── TemplateClassifier.ts        # Normalized cross-correlation (NCC) template classification
│
├── Spectrum/                        # Subsystem 2: SPECTRUM Microservice Client & Live Fusion
│   ├── SpectrumService.ts           # API client communicating with backend / Python FastAPI microservice
│   └── SpectrumWeightDetectionEngine.tsx # Dual-pass hybrid AI weight detection (Camera UI + Fusion logic)
│
└── Recommendation/                  # Subsystem 3: Spatial Rack & Slot Optimization
    └── SpectrumRecommendationEngine.ts # Multi-factor scoring (GSM, weight, habit pattern, aisle distance)
```

---

## AI Subsystems Explained

### 1. Vision & Local OCR (`Vision/`)
Provides zero-latency, local-in-browser image analysis directly on video streams from operator cameras:
- **`ImageProcessor.ts`**: Crops Region of Interest (ROI), normalizes brightness, runs Sauvola local adaptive thresholding to isolate glowing 7-segment LEDs even in glare or low lighting, and detects tilt angles.
- **`OCRService.ts`**: Manages dedicated WebAssembly-powered Tesseract workers (`public/tesseract/`) configured specifically for numeric digits with zero cloud network latency.
- **`SegmentMatcher.ts` & `TemplateClassifier.ts`**: Fallback geometric verification that counts segments (A through G) to mathematically validate digit structure.

### 2. SPECTRUM Microservice Client (`Spectrum/`)
Connects the React frontend to the high-throughput Python AI engine:
- **`SpectrumService.ts`**: Provides strongly-typed async calls for `/api/spectrum/detect`, `/api/spectrum/retrain`, `/api/spectrum/stats`, and `/api/spectrum/log`.
- **`SpectrumWeightDetectionEngine.tsx`**: The heart of the incoming roll weighing station. Coordinates camera streams, dual-engine fusion (local OCR + remote MLP neural net), and operator confirmation workflows.

### 3. Spatial Recommendation Engine (`Recommendation/`)
Recommends optimal warehouse storage slots for paper rolls:
- **`SpectrumRecommendationEngine.ts`**: Evaluates physical constraints (roll width, diameter, GSM tier) against rack status, grouping identical batches together to minimize forklift travel distances.

---

## Quick Import Example

```typescript
// Centralized import from @/AI
import {
  recogniseWeight,
  detectSpectrumWeight,
  evaluateSpectrumRecommendation,
  SpectrumWeightDetectionEngine
} from '@/AI';
```

