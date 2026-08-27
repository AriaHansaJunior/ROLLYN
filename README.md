# IDX AI WISE — Rollyn

**Rollyn** is the working name derived from **Roll + Intelligence**.

**IDX AI WISE** is a modern, AI-assisted Warehouse Management System (WMS) designed to reduce human error in the handling, tracking, and recording of finished-goods paper rolls. The system provides real-time data capture through Computer Vision, precise traceability, intelligent storage recommendations, and enhanced operational visibility for internal warehouse administration.

---

## Technology Stack & Architecture

This project is built as a highly responsive, web-based administration system utilizing a robust PHP framework paired with a reactive frontend and native Artificial Intelligence capabilities.

### Stack
- **Framework:** Laravel 13
- **Backend Language:** PHP 8.3+
- **Frontend Framework:** React 19 (via Inertia.js)
- **Frontend Styling:** Tailwind CSS 4.3.3
- **Frontend Build Tool:** Vite 8.2.1
- **Database:** MySQL 8.4.3
- **AI & Computer Vision:** Tesseract.js (Frontend native), YOLOv8, and custom Computer Vision pipelines.

### Project Organization
The application responsibilities remain separated and maintainable:
- `app/` - Backend application logic (Controllers, Models, Services)
- `resources/js/` - Frontend React components, Pages, and native CV pipelines
- `resources/views/` - Blade entry point for Inertia
- `spectrum_engine/` - Advanced AI / Computer vision components
- `database/` - Migrations, seeders, and factories

---

## Core Features & Modules

The application is divided into several comprehensive modules tailored for end-to-end warehouse execution:

### 1. Automated Weighing Data Capture (Advanced Computer Vision)
To eliminate manual transcription of weighing information, the system uses a robust, frontend-native Computer Vision and OCR pipeline to read data directly from weighing scale displays.
- **Live Camera & Dual Engine:** Supports real-time image capture processed either via a fast local OCR pipeline (Tesseract) or an advanced AI backend (SPECTRUM 4.0).
- **Intelligent Auto-Correction:** Features a native frontend CV pipeline that automatically detects digit regions, auto-crops, and mathematically straightens tilted photos (perspective & rotation correction).
- **Illumination Resilience:** Utilizes Local Adaptive Thresholding (Sauvola) and Morphological operations to successfully read both standard white-background scales and complex dark-background/7-segment LED scales, preserving dim or glowing segments.
- **Structural Validation:** Cross-checks the physical count of illuminated digits against the OCR output to guarantee data integrity before recording the weight into the system.

### 2. Warehouse Operations & Inventory Tracking
- **Roll Inventory:** Complete lifecycle tracking of all finished goods, from the moment they are produced until they are shipped.
- **Job Order Production (JOP) & Target Orders:** Manage and fulfill production targets and customer orders seamlessly.
- **Shipments Management:** Organizes and tracks outbound logistics to ensure correct rolls are dispatched.
- **Detailed Roll View & Label Printing:** Instantly print verified QR Code labels for incoming rolls.

### 3. Spatial Awareness & Warehouse Map
- **Warehouse Map & Slot Status:** An interactive, bird's-eye view of all warehouse zones (A through G).
- **Rack Status Visualization:** Instantly understand rack conditions using a color-coded status legend:
  - **White:** Free Space
  - **Gray / Empty:** Slot Planning
  - **Gray / Checked:** Slotted / Occupied
  - **Green:** Shipment Plan
  - **Red:** Non-PO (Production Order)
  - **Yellow:** Move to Another Warehouse
  - **Blue:** Hold

### 4. Artificial Intelligence & Analytics
- **Recommendation Logs:** AI-driven intelligent storage determination. The system actively suggests the optimal warehouse slot for newly received rolls based on spatial availability and historical layout patterns.
- **OCR Monitoring:** Live dashboard to review the performance, accuracy, and confidence scores of the AI vision engines.
- **AI Training Module:** Interface for retraining and fine-tuning the vision models based on operational data.
- **Comprehensive Reports:** Generate real-time analytics and extraction of warehouse metrics.

### 5. Administration & Real-Time Alerts
- **User Management & Profiles:** Secure authentication and Role-Based Access Control (RBAC).
- **In-App Notifications:** Real-time push alerts for warehouse operators regarding shipments, rack changes, or system warnings.

---

## The Warehouse Process

The system is designed to streamline the two main cycles of the warehouse process.

### Cycle 1 — Receipt and Storage of Finished Goods
1. Finished-good paper rolls are received from the production line.
2. The roll is placed on the weighing scale.
3. **AI Vision Camera** automatically captures the weight, auto-correcting any camera tilt or distance issues.
4. The system validates the weight and associates it with the roll specifications.
5. The **Recommendation Engine** suggests the optimal rack location.
6. The storage location is communicated to the forklift operator, and the roll is securely slotted.

### Cycle 2 — Loading / Loading-Out of Finished Goods
1. A specific roll is identified for shipment based on Target Orders / JOP.
2. The system queries the interactive Warehouse Map to provide the exact real-time location.
3. Warehouse personnel locate the roll accurately without manual searching.
4. The loading process is completed swiftly and verified by the system as Shipped.

---

## Problem Solved

Prior to IDX AI WISE, the warehouse relied heavily on manual data entry, printed checklists, and visual verification. This system solves critical pain points:
- **Manual Weight Input Errors:** Eliminates incorrect digit entry by operators through highly fault-tolerant OCR.
- **Manual Rack Management & Printed Checklists:** Replaces outdated printed plans with an interactive, real-time spatial map.
- **Manual Searching:** Reduces time spent locating misplaced rolls by keeping physical conditions and digital records flawlessly synchronized via AI recommendations.

---

&copy; 2026 Rollyn. All Rights Reserved.
