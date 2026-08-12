# IDX AI WISE — Rollyn

**Rollyn** is the working name from **Roll + Intelligence**.

**IDX AI WISE** is an AI-assisted warehouse system designed to reduce human error in the handling and recording of finished-goods paper rolls. The system is intended for internal warehouse administration and focuses on improving data accuracy, traceability, and operational visibility.

## Project Overview

The existing finished-goods warehouse process still relies on manual data entry, printed rack checklists, manual location decisions, visual checking, and manual searching during loading activities.

Human error can occur during the recording of roll information, especially when the weight shown on the scale is manually transferred into the roll record. Errors can also occur when labels are assigned incorrectly or when rack information on printed checklists is not updated accurately.

IDX AI WISE is designed to reduce these errors through an integrated warehouse information system and AI-assisted processing.

The initial development scope is **Stage 1: automated reading of weighing information using computer vision and OCR in real time**.

AI-based location determination will be developed in a later stage and is intentionally outside the current Stage 1 implementation scope.

---

## Current Warehouse Process

The current operational flow is divided into two main cycles.

### Cycle 1 — Receipt and Storage of Finished Goods

1. Finished-good paper rolls are produced by the production process.
2. The warehouse receives the produced rolls.
3. The roll is weighed using a weighing system.
4. The weight and related roll information are manually entered or recorded.
5. A PIC determines the storage location manually.
6. The PIC informs the forklift operator of the intended rack location.
7. The forklift operator stores the roll at the assigned rack.

The production process itself is outside the scope of this system. IDX AI WISE starts from the warehouse receipt of finished rolls.

### Cycle 2 — Loading / Loading-Out of Finished Goods

1. A roll must be located based on the required shipment or order.
2. Warehouse personnel search for the roll manually.
3. The physical rack condition is checked using available warehouse information and visual inspection.
4. The roll is prepared for loading.
5. The loading process is completed manually.

The existing process can require additional time when the recorded information does not match the physical condition of the warehouse.

---

## Existing Problems

### Manual Weight Input

The weight shown on the weighing scale can be entered incorrectly by the operator. Examples include incorrect digits, incorrect roll information, or an incorrect label.

### Manual Rack Management

Storage locations are currently determined manually by the PIC and communicated to forklift operators.

### Printed Rack Checklist

Rack conditions are recorded using a printed planning and checklist document. The physical checklist may not always represent the latest warehouse condition.

### Manual Searching

Warehouse personnel may spend more time locating a roll when the stored information, label, or rack checklist does not match the actual physical condition.

### Manual Cross-Checking

Loading and unloading activities depend heavily on human visual inspection and printed information.

### Human Error

The combination of manual input, manual location recording, printed rack information, and visual verification creates opportunities for incorrect or outdated information.

---

## Warehouse Layout and Status Legend

The current warehouse structure consists of **Warehouse A through Warehouse G**.

The exact physical dimensions and measurements of each warehouse have not yet been provided. Therefore, the initial system will use a **dummy warehouse map** for visualization and system development.

The existing rack checklist uses the following status indicators:

| Status | Meaning |
|---|---|
| White | Free Space |
| Gray / Empty | Slot Planning |
| Gray / Checked | Slotted / Occupied |
| Green | Shipment Plan |
| Red | Non PO |
| Yellow | Move to Another Warehouse |
| Blue | Hold |

These statuses represent the warehouse planning condition shown in the existing rack checklist.

---

## Stage 1 — Automated Weighing Data Capture

Stage 1 focuses on eliminating manual transcription of weighing information.

A camera will be installed in front of the weighing area. The camera will capture the weighing display and provide the captured information to the system.

The intended processing flow is:

```text
Physical Roll
    ↓
Weighing Process
    ↓
Camera Capture
    ↓
Computer Vision
    ↓
OCR Reading
    ↓
Weight Data Detection
    ↓
System Record
```

The main objective is to allow the system to obtain the weight value directly from the captured weighing display instead of requiring the operator to type the number manually.

### AI / Computer Vision Scope

Stage 1 uses computer vision and OCR for real-time reading of weighing information.

**Planned technologies:**

- OCR for reading the weighing display.
- YOLOv8 for image/object detection when required for faster or more reliable capture.
- YOLOv8 is intended to use the official Ultralytics source as the reference implementation source.

The current Stage 1 scope is focused on the automated reading and recording of weighing information.

---

## Stage 2 — AI-Based Location Determination

Stage 2 is planned for AI-assisted storage location determination.

The future workflow is intended to determine an appropriate storage location based on available warehouse information and the condition of the warehouse layout.

Stage 2 is **not part of the current implementation scope** and will not be implemented until Stage 1 has been completed and the required warehouse layout information is available.

---

## Project Data Source

The provided Excel report is used as the reference for understanding the existing finished-goods warehouse data and for designing the database structure.

The primary worksheet is **Data Base** with a source range of approximately 13,490 rows and 21 columns.

The source contains the following fields:

| Field | Description |
|---|---|
| No. | Sequential record number |
| Form Nomor | Form number associated with the warehouse record |
| Shift | Warehouse shift |
| Tanggal Masuk WH | Warehouse entry date |
| Roll No | Roll identification number |
| Grade | Roll grade / product grade |
| GSM | Grammage value |
| Plybond | Plybond specification |
| Thickness | Thickness specification |
| Bulk | Bulk value |
| Lebar Roll | Roll width |
| Diameter Roll | Roll diameter |
| Core | Core specification |
| Berat | Roll weight |
| Cobb | Cobb specification |
| Ex Material | Material category / source classification |
| Lokasi | Warehouse storage location |
| Visual | Visual inspection information |
| Column2 | Additional source field currently used in the report |
| JOP | Job order / production job reference |
| PIC | Person responsible for the record |

The source workbook also contains **SUMMARY** and **Pivot** worksheets used for reporting and aggregation.

The Excel file is treated as the reference for understanding the existing data structure. The final application database will be defined separately according to the actual system requirements.

---

## Existing Data Characteristics

The current source data contains real operational patterns that need to be represented correctly by the application.

Examples include:

- Multiple warehouse shifts.
- Multiple roll grades.
- Different GSM values.
- Different thickness values.
- Different roll widths and diameters.
- Roll weight information.
- Cobb specification values.
- Storage locations such as `A01-01`, `E05-03`, and similar location codes.
- JOP references such as `JOP-0726-00001`.
- PIC records associated with warehouse activity.
- Visual inspection information.

The existing report also contains incomplete or placeholder values in some records, including values such as `0`, `JOP-0`, blank fields, and source calculation errors such as `#VALUE!`.

These values are observations from the source report and are documented here to preserve the characteristics of the current data.

---

## Administrative Scope

IDX AI WISE is designed as an **internal administration system**.

There is no public-facing customer or general-user interface in the current project scope.

The system is intended for authorized warehouse personnel who manage and monitor finished-goods roll information.

---

## Technology Stack

The current application stack is:

- **Framework:** Laravel 13
- **Backend Language:** PHP 8.3+
- **Frontend Styling:** Tailwind CSS
- **Database:** MySQL
- **Frontend Build Tool:** Vite
- **Computer Vision:** OCR / YOLOv8 for Stage 1 image processing
- **Application Type:** Web-based administration system

The project is developed using the Laravel application structure while keeping application responsibilities organized into separate backend, layout, and styling areas.

---

## Project Organization

The project is organized so that application responsibilities remain separated and maintainable.

The intended organization separates:

```text
rollyn/
├── app/                    # Backend application logic
├── resources/
│   ├── views/              # Layouts and application views
│   └── css/                # Frontend styles
│       ├── app.css
│       ├── header.css
│       └── footer.css
├── routes/                 # Application routes
├── database/               # Database migrations and related database files
├── public/                 # Public application assets
├── storage/                # Laravel storage
├── tests/                  # Application tests
├── vite.config.js          # Vite configuration
└── package.json             # Frontend dependencies
```

Header and footer styles are intentionally separated from the main stylesheet to keep the frontend structure organized.

---

## Notes

This README describes the project scope and the warehouse process currently provided for analysis.

Sensitive configuration information, authentication credentials, database passwords, environment secrets, and private deployment configuration are intentionally excluded from this document.
