# IDX AI WISE — Rollyn

**Rollyn** is the working name derived from **Roll + Intelligence**.

**IDX AI WISE** is an AI-assisted warehouse management system designed to reduce human error in the handling and recording of finished-goods paper rolls. The system provides real-time data capture, precise traceability, and enhanced operational visibility for internal warehouse administration.

---

## Technology Stack & Project Organization

This project is built as a modern, web-based administration system utilizing a robust PHP framework paired with a reactive frontend and AI tools.

### Stack
- **Framework:** Laravel 13
- **Backend Language:** PHP 8.3+
- **Frontend Framework:** React 19 (via Inertia.js)
- **Frontend Styling:** Tailwind CSS 4.3.3
- **Frontend Build Tool:** Vite 8.2.1
- **Database:** MySQL 8.4.3
- **Computer Vision (AI):** Tesseract.js & YOLOv8 

### Project Organization
The application responsibilities remain separated and maintainable:
- `app/` - Backend application logic (Controllers, Models, Services)
- `resources/js/` - Frontend React components and pages
- `resources/views/` - Blade entry point for Inertia
- `resources/css/` - Frontend styles
- `routes/` - Application routes
- `database/` - Migrations, seeders, and factories
- `spectrum_engine/` - AI / Computer vision components
- `public/` - Public assets
- `tests/` - Application tests

---

## Core Features & Modules

### 1. Automated Weighing Data Capture (Computer Vision)
To eliminate manual transcription of weighing information, the system uses computer vision and OCR to read data directly from the weighing scale displays.
- A camera captures the physical scale display in real time.
- The system processes the image to automatically detect and extract the weight data.
- This data is recorded directly into the system, bypassing manual entry and preventing human error.

### 2. Warehouse Management & Tracking
The system tracks the lifecycle of finished goods, managing their status, storage locations, and movements across multiple warehouse zones (Warehouse A through Warehouse G).

#### Rack Status Visualization
The system visualizes rack conditions using a clear status legend, ensuring operators have an accurate, real-time map of the warehouse:
- **White:** Free Space
- **Gray / Empty:** Slot Planning
- **Gray / Checked:** Slotted / Occupied
- **Green:** Shipment Plan
- **Red:** Non PO
- **Yellow:** Move to Another Warehouse
- **Blue:** Hold

---

## The Warehouse Process

The system is designed to streamline the two main cycles of the warehouse process.

### Cycle 1 — Receipt and Storage of Finished Goods
1. Finished-good paper rolls are received from the production line.
2. The roll is placed on the weighing scale.
3. **AI Vision Camera** automatically captures the weight, avoiding manual data entry errors.
4. The system associates the weight with the roll information.
5. The storage location is determined and communicated to the forklift operator.
6. The roll is stored at the assigned rack.

### Cycle 2 — Loading / Loading-Out of Finished Goods
1. A specific roll is identified for shipment based on order requirements.
2. The system provides the exact real-time location and physical condition of the rack.
3. Warehouse personnel locate the roll accurately without manual searching.
4. The loading process is completed swiftly and verified by the system.

---

## Problem Solved

Prior to IDX AI WISE, the warehouse relied heavily on manual data entry, printed checklists, and visual verification. This system solves critical pain points:
- **Manual Weight Input Errors:** Eliminates incorrect digit entry by operators through automated OCR.
- **Manual Rack Management & Printed Checklists:** Replaces outdated printed plans with a real-time digital system.
- **Manual Searching:** Reduces time spent locating misplaced rolls by keeping physical conditions and digital records synchronized.

---

## Project Data Reference

The system database architecture was designed using an initial reference dataset of approximately 13,490 records to accurately model real-world warehouse data. This includes fields such as:
- Roll identification number, Grade, GSM, Plybond, Thickness, Bulk, Width, Diameter, Core, Weight, Cobb, Ex Material, Location, and Status.

---

## Future Scope

Future development will focus on **AI-Based Location Determination**. The system will intelligently determine and suggest the optimal storage location for newly received rolls based on available space, roll specifications, and warehouse layout patterns.
