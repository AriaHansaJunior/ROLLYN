# Project Directory Structure & Architecture Guide

Welcome to **IDX AI WISE (Rollyn)**. This document serves as the master navigation blueprint across Backend, Frontend, and Artificial Intelligence (AI) subsystems so you can locate and modify any module effortlessly.

---

## 1. High-Level Architecture Overview

The system is organized into three distinct tiers:

```
ROLLYN (Project Root)
├── app/                        # [BACKEND] Laravel 13 MVC & Business Services
├── resources/                  # [FRONTEND] React 19 + Inertia.js + Tailwind CSS 4
│   └── js/
│       ├── AI/                 # [AI FRONTEND] Client-side Vision, Spectrum & Heuristics
│       ├── Components/         # Domain-structured React UI Components
│       ├── Layouts/            # App Shell Layouts
│       ├── Pages/              # Inertia Page Views
│       └── Utils/              # Utilities (CSRF, UI notifications, warehouse configs)
├── spectrum_engine/            # [AI MICROSERVICE] Python FastAPI (Port 8001) + Neural Network
├── routes/                     # Web & API Route Definitions (web.php, api.php)
├── database/                   # Database Migrations, Seeders & Factories
├── public/                     # Public Assets (Tesseract WASM & trained models, build assets)
├── scratch/                    # Scratchpad, experimental test scripts & visual diagnostics
└── tests/                      # Automated Feature & Unit Tests (PHPUnit)
```

---

## 2. Artificial Intelligence (AI) Systems Map

This project features **three primary AI systems** and **one continuous learning pipeline**. Use this quick-reference table to find all related files instantly:

| AI System | Frontend (Client) | Backend (Laravel) | AI Microservice (Python) | Data & Models |
| :--- | :--- | :--- | :--- | :--- |
| **1. Computer Vision & Weight Detection** | [`resources/js/AI/Vision/`](resources/js/AI/Vision/)<br>[`resources/js/AI/Spectrum/`](resources/js/AI/Spectrum/) | [`app/Http/Controllers/SpectrumEngineController.php`](app/Http/Controllers/SpectrumEngineController.php) | [`spectrum_engine/app.py`](spectrum_engine/app.py) (FastAPI :8001) | [`spectrum_engine/best_mlp.pkl`](spectrum_engine/best_mlp.pkl)<br>[`public/tesseract/lang-data/`](public/tesseract/lang-data/) |
| **2. Warehouse Slot Recommendation AI** | [`resources/js/AI/Recommendation/`](resources/js/AI/Recommendation/)<br>[`resources/js/Components/AI/SpectrumSlotSelectorModal.tsx`](resources/js/Components/AI/SpectrumSlotSelectorModal.tsx) | [`app/Services/AI/SpectrumRecommendationEngine.php`](app/Services/AI/SpectrumRecommendationEngine.php)<br>[`app/Models/LocationRecommendationLog.php`](app/Models/LocationRecommendationLog.php) | N/A (Algorithmic / Heuristic Clustering) | Real-time rack occupancy map + Operator habitual Bayes distribution |
| **3. Continuous Learning & Retraining Pipeline** | [`resources/js/Pages/Training.tsx`](resources/js/Pages/Training.tsx)<br>[`resources/js/Components/AI/Training/`](resources/js/Components/AI/Training/) | [`app/Http/Controllers/SpectrumEngineController.php`](app/Http/Controllers/SpectrumEngineController.php) (`retrain`, `saveDataset`) | [`spectrum_engine/train_spectrum_led.py`](spectrum_engine/train_spectrum_led.py) | [`spectrum_engine/dataset_digits/`](spectrum_engine/dataset_digits/) (0–9 digits)<br>[`storage/app/dataset/labels.csv`](storage/app/dataset/labels.csv) |
| **4. AI Monitoring & Audit Logs** | [`resources/js/Pages/OcrMonitoring.tsx`](resources/js/Pages/OcrMonitoring.tsx)<br>[`resources/js/Pages/RecommendationLogs.tsx`](resources/js/Pages/RecommendationLogs.tsx) | [`app/Http/Controllers/RecommendationLogController.php`](app/Http/Controllers/RecommendationLogController.php)<br>[`app/Models/SpectrumTestLog.php`](app/Models/SpectrumTestLog.php) | `/api/spectrum/stats`<br>`/api/spectrum/retrain-status` | Database tables: `spectrum_test_logs`, `location_recommendation_logs` |

---

## 3. Backend Directory Reference (`app/`)

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/V1/             # RESTful API Controllers (Master data, Analytics, Rolls, JOP)
│   │   │   ├── Master/         # Master table APIs (Grade, GSM, Shift, Width, Customer, etc.)
│   │   │   ├── AnalyticsController.php
│   │   │   ├── AuthController.php
│   │   │   ├── JopController.php
│   │   │   └── RollController.php
│   │   ├── SpectrumEngineController.php # [AI] Microservice proxy, retrain & detection controller
│   │   ├── RecommendationLogController.php # [AI] Recommendation audit history controller
│   │   ├── IncomingRollController.php   # Incoming roll wizard & scale auto-boot handler
│   │   ├── RollController.php           # Roll inventory & disposition logic
│   │   ├── LocationController.php       # Warehouse map & slot capacity controller
│   │   ├── JopController.php            # Job Order Production & Target Orders
│   │   ├── JumboRollController.php      # Jumbo mother roll management
│   │   ├── ShipmentController.php       # Shipment fulfillment & QC scanning
│   │   ├── ProductionScheduleController.php # Machine scheduling
│   │   ├── ReportController.php         # Analytics & export reports
│   │   ├── DashboardController.php      # Main executive dashboard
│   │   └── UserController.php           # User & profile management
│   └── Middleware/
│       ├── HandleInertiaRequests.php    # Shared Inertia props (auth, flash notifications)
│       ├── RoleMiddleware.php           # Role-based access control (Admin, PPIC, QC, Production)
│       └── SecurityHeaders.php          # Security headers & frame protection
│
├── Services/
│   ├── AI/                              # [AI CORE] Dedicated AI Services
│   │   └── SpectrumRecommendationEngine.php # Core slot allocation algorithm & scoring heuristics
│   └── SpectrumRecommendationEngine.php     # Backward-compatible proxy class
│
├── Models/                              # Eloquent Models (Database entities)
│   ├── LocationRecommendationLog.php    # [AI] Audit records of recommended vs selected slots
│   ├── SpectrumTestLog.php              # [AI] Validation logs of OCR vs SPECTRUM detection
│   ├── Roll.php                         # Core finished-good paper roll entity
│   ├── Location.php                     # Warehouse slot entity
│   ├── JumboRoll.php                    # Mother roll entity
│   ├── Jop.php                          # Production job order entity
│   ├── Shipment.php & ShipmentRoll.php  # Logistics & shipment items
│   └── User.php                         # Application user entity
│
├── Policies/                            # Authorization Policies
│   ├── RollPolicy.php                   # Edit/delete guardrails for rolls
│   ├── ShipmentPolicy.php               # QC & shipment state guardrails
│   └── UserPolicy.php                   # Self-deletion protection & RBAC
│
└── Traits/
    └── ApiResponse.php                  # Uniform JSON response formatter
```

---

## 4. Frontend Directory Reference (`resources/js/`)

```
resources/js/
├── app.jsx                              # Inertia application bootstrap & root provider
├── bootstrap.js                         # Axios & network defaults
│
├── AI/                                  # [AI DIRECTORY] Centralized AI frontend modules
│   ├── index.ts                         # Unified export barrel for all AI capabilities
│   ├── README.md                        # Comprehensive AI frontend documentation
│   ├── Vision/                          # Client-side Computer Vision & OCR
│   │   ├── ImageProcessor.ts            # Sauvola thresholding, deskew, noise filtering
│   │   ├── OCRService.ts                # Tesseract.js WASM runner & worker lifecycle
│   │   ├── SegmentMatcher.ts            # 7-segment LED topological heuristic matcher
│   │   ├── DigitTemplateStore.ts        # Calibrated digit template bank
│   │   └── TemplateClassifier.ts        # NCC template matching classifier
│   ├── Spectrum/                        # SPECTRUM AI Engine Integration
│   │   ├── SpectrumService.ts           # API client for SPECTRUM microservice
│   │   └── SpectrumWeightDetectionEngine.tsx # Camera feed, ROI & dual-pass fusion engine
│   └── Recommendation/                  # Spatial Recommendation Algorithm
│       └── SpectrumRecommendationEngine.ts # Roll clustering & rack scoring heuristics
│
├── Components/                          # Organized Domain Component Tree
│   ├── AI/                              # AI-specific Modals & Widgets
│   │   ├── SpectrumSlotSelectorModal.tsx # Interactive slot recommendation popup
│   │   └── Training/                    # Model retraining tools & camera capture
│   │       ├── Training_LiveCamera.tsx
│   │       ├── Training_SampleHistory.tsx
│   │       └── Training_types.ts
│   ├── Navigation/                      # Layout navigation components
│   │   ├── Header.tsx                   # Top bar
│   │   └── Sidebar.tsx                  # Role-aware collapsible sidebar
│   ├── Scanner/                         # Barcode & QR code scanning tools
│   │   ├── QRCodeSVG.tsx                # Fast SVG QR code generator
│   │   ├── QRScannerModal.tsx           # Fullscreen camera QR reader
│   │   └── EmbeddedQRScanner.tsx        # Inline embedded QR reader
│   ├── IncomingRoll/                    # 4-Step Roll Ingestion Wizard
│   ├── RollInventory/                   # Inventory, shipments, QC inspection & disposition
│   ├── Jop/                             # Job Order Production modals & cards
│   ├── JumboRoll/                       # Jumbo mother roll modals
│   ├── ProductionSchedule/              # Machine planning forms
│   └── SystemUI/                        # Global toast notifications
│
├── Pages/                               # Inertia Page Components
│   ├── Dashboard.tsx                    # Executive summary & quick actions
│   ├── IncomingRoll.tsx                 # Roll receipt workflow (uses AI weight detection)
│   ├── RollInventory.tsx                # Complete warehouse stock & shipment tabs
│   ├── RollDetail.tsx                   # Individual roll timeline, QR & relocation
│   ├── WarehouseMap.tsx                 # Interactive 2D bird's-eye warehouse layout
│   ├── SlotStatus.tsx                   # Detailed slot-level capacity breakdown
│   ├── Training.tsx                     # [AI] Model retraining & dataset management
│   ├── OcrMonitoring.tsx                # [AI] Vision accuracy & confidence analytics
│   ├── RecommendationLogs.tsx           # [AI] Spatial allocation decision audit logs
│   ├── Jop.tsx & TargetOrder.tsx        # Production order tracking
│   ├── JumboRoll.tsx                    # Jumbo roll overview
│   ├── ShipmentHistory.tsx              # Outbound dispatch logs
│   ├── Reports.tsx                      # KPI analytics & excel export
│   ├── UserManagement.tsx               # Admin user CRUD
│   ├── Profile.tsx                      # Current user settings
│   └── Login.tsx                        # Authentication portal
│
├── Layouts/
│   └── MainLayout.tsx                   # Primary application layout shell
│
└── Utils/
    ├── csrf.ts                          # Safe CSRF token retriever for async requests
    ├── SystemUI.ts                      # Event-driven toast & confirmation dialog bus
    └── WarehouseConfigs.ts              # Warehouse zone layouts, racks & coordinate maps
```

---

## 5. Microservice & Python Directory Reference (`spectrum_engine/`)

The Python microservice handles heavy Machine Learning inference, LED 7-segment digit classification, and continuous model retraining on port 8001.

```
spectrum_engine/
├── app.py                      # FastAPI microservice application
├── train_spectrum_led.py       # PyTorch/MLP training routine for 7-segment digits
├── train_spectrum.py           # Dataset preprocessing & feature extractor
├── preload_easyocr.py          # Preloader script for offline OCR fallback
├── requirements.txt            # Python dependencies
├── best_mlp.pkl                # Trained MLP neural network model weights
├── trained_weights.json        # Training history, loss, accuracy & timestamp
├── retrain_status.json         # Real-time state machine for background retraining
├── dataset_digits/             # Operational digit training samples partitioned by label (0–9)
└── README.md                   # Microservice documentation & startup instructions
```

---

## 6. How to Start the Entire Stack

### Step 1: Start Laravel Backend & Vite Frontend
```bash
composer run dev
```
*(Runs `php artisan serve`, queue worker, and Vite dev server concurrently).*

### Step 2: Start SPECTRUM AI Microservice (Port 8001)
Double-click:
```bat
start_spectrum.bat
```
*Note: If the microservice is offline when an operator opens the Incoming Roll page, Laravel's `IncomingRollController` will automatically attempt to boot it in the background.*

---

## 7. Verification & Testing

- **Backend Tests:** Run `php artisan test` (Executes all 46 automated security, policy, and workflow tests).
- **Frontend Production Build:** Run `npm run build` (Compiles TypeScript and bundles production assets via Vite).

