# Frontend UI Components (`resources/js/Components`)

This directory houses reusable React components, domain-specific modules, and modals for the IDX AI WISE (Rollyn) web application.

---

## Directory Organization

```
resources/js/Components/
├── AI/                          # AI-specific UI components & sub-modules
│   ├── SpectrumSlotSelectorModal.tsx # AI Warehouse Slot Recommendation Modal
│   └── Training/                # Live camera sample capture & model retraining controls
│       ├── Training_LiveCamera.tsx
│       ├── Training_SampleHistory.tsx
│       └── Training_types.ts
│
├── Navigation/                  # Shell layout & persistent navigation
│   ├── Header.tsx               # Top app bar with user profile, role badge & notification bell
│   └── Sidebar.tsx              # Role-aware collapsible sidebar navigation
│
├── Scanner/                     # Barcode & QR Code tooling
│   ├── QRCodeSVG.tsx            # High-performance SVG QR generator for roll labels
│   ├── QRScannerModal.tsx       # Fullscreen camera QR code scanner modal
│   └── EmbeddedQRScanner.tsx    # In-page embedded QR scanner for fast workflow dispatch
│
├── IncomingRoll/                # 4-Step Roll Ingestion Wizard
│   ├── IncomingRoll_S1WeightDetection.tsx # Step 1: AI Vision camera weight capture
│   ├── IncomingRoll_S2FormData.tsx        # Step 2: Roll parameters, JOP & dimensions
│   ├── IncomingRoll_S3ReviewData.tsx      # Step 3: Pre-save inspection & verification
│   ├── IncomingRoll_S4PrintLabel.tsx      # Step 4: Instant QR label thermal printing
│   ├── IncomingRoll_ConfirmSaveModal.tsx  # Confirmation modal
│   └── IncomingRoll_types.ts              # Data contracts and TypeScript interfaces
│
├── RollInventory/               # Warehouse Inventory, QC & Logistics
│   ├── RollInventory_StorageTab.tsx       # Storage inventory grid with filtering & sorting
│   ├── RollInventory_ShipmentsTab.tsx     # Active shipments & truck loading verification
│   ├── RollInventory_CreateShipmentModal.tsx # New shipment dispatcher
│   ├── RollInventory_QcRollEvaluatorModal.tsx # QC disposition evaluator
│   ├── RollInventory_QcRejectModal.tsx    # Rejection dialog & defect categorization
│   ├── RollInventory_QcReportModal.tsx    # Inspection report generation modal
│   ├── RollInventory_PpicDispositionModal.tsx # PPIC disposition decisions
│   ├── RollInventory_EditRollModal.tsx    # Roll metadata editor
│   └── RollInventory_types.ts             # Inventory state & data types
│
├── Jop/                         # Job Order Production (JOP) Modals
│   ├── Jop_CreateModal.tsx      # Create JOP with target specs & quantity
│   ├── Jop_DetailModal.tsx      # JOP progress, customer info & roll fulfillment
│   ├── Jop_RollPopupModal.tsx   # Associated rolls preview
│   └── Jop_types.ts
│
├── JumboRoll/                   # Jumbo / Mother Roll Management
│   ├── JumboRoll_FormModal.tsx  # Create / Edit Jumbo roll
│   ├── JumboRoll_DetailModal.tsx # View parent roll parameters & slit history
│   ├── JumboRoll_LinkModal.tsx  # Link daughter rolls to mother roll
│   └── JumboRoll_types.ts
│
├── ProductionSchedule/          # Machine & Line Planning
│   ├── ProductionSchedule_FormModal.tsx # Schedule planner form
│   └── ProductionSchedule_types.ts
│
└── SystemUI/                    # Global Notification & Dialog Bus
    └── SystemUIContainer.tsx    # Toast container mounted at root of React tree
```

