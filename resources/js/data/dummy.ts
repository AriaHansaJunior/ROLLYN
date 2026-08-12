export const rollInventory = [
  { id: 'R-10421', form: 'F-2241', shift: 'A', date: '2024-07-10', grade: 'KLB-150', gsm: 150, plybond: 1.8, thickness: 0.22, bulk: 1.47, width: 1650, diameter: 1120, core: 76, weight: 1007, cobb: 68, exMaterial: 'OCC', visual: 'OK', location: 'A-01-01', jop: 'JOP-240710', pic: 'Budi S.', status: 'Slotted' },
  { id: 'R-10422', form: 'F-2241', shift: 'A', date: '2024-07-10', grade: 'KLB-150', gsm: 150, plybond: 1.7, thickness: 0.21, bulk: 1.40, width: 1650, diameter: 1105, core: 76, weight: 989, cobb: 71, exMaterial: 'OCC', visual: 'OK', location: 'A-01-02', jop: 'JOP-240710', pic: 'Budi S.', status: 'Shipment Plan' },
  { id: 'R-10423', form: 'F-2242', shift: 'B', date: '2024-07-10', grade: 'KLB-200', gsm: 200, plybond: 2.1, thickness: 0.27, bulk: 1.35, width: 1850, diameter: 1090, core: 76, weight: 1154, cobb: 65, exMaterial: 'OCC', visual: 'OK', location: 'B-03-04', jop: 'JOP-240709', pic: 'Agus R.', status: 'Hold' },
  { id: 'R-10424', form: 'F-2242', shift: 'B', date: '2024-07-11', grade: 'KLB-200', gsm: 200, plybond: 2.0, thickness: 0.26, bulk: 1.30, width: 1850, diameter: 1070, core: 76, weight: 1132, cobb: 63, exMaterial: 'OCC', visual: 'OK', location: 'C-02-01', jop: 'JOP-240709', pic: 'Agus R.', status: 'Non-PO' },
  { id: 'R-10425', form: 'F-2243', shift: 'C', date: '2024-07-11', grade: 'KIA-125', gsm: 125, plybond: 1.5, thickness: 0.18, bulk: 1.44, width: 1550, diameter: 1080, core: 76, weight: 876, cobb: 74, exMaterial: 'NDLKP', visual: 'OK', location: 'D-01-03', jop: 'JOP-240711', pic: 'Sari W.', status: 'Slotted' },
  { id: 'R-10426', form: 'F-2243', shift: 'C', date: '2024-07-11', grade: 'KIA-125', gsm: 125, plybond: 1.6, thickness: 0.19, bulk: 1.52, width: 1550, diameter: 1095, core: 76, weight: 891, cobb: 70, exMaterial: 'NDLKP', visual: 'OK', location: 'D-01-04', jop: 'JOP-240711', pic: 'Sari W.', status: 'Slotted' },
  { id: 'R-10427', form: 'F-2244', shift: 'A', date: '2024-07-12', grade: 'KLB-175', gsm: 175, plybond: 1.9, thickness: 0.24, bulk: 1.37, width: 1750, diameter: 1100, core: 76, weight: 1045, cobb: 67, exMaterial: 'OCC', visual: 'REJ', location: 'E-04-02', jop: 'JOP-240712', pic: 'Budi S.', status: 'Hold' },
  { id: 'R-10428', form: 'F-2244', shift: 'A', date: '2024-07-12', grade: 'KLB-175', gsm: 175, plybond: 1.9, thickness: 0.24, bulk: 1.37, width: 1750, diameter: 1115, core: 76, weight: 1068, cobb: 66, exMaterial: 'OCC', visual: 'OK', location: 'F-02-01', jop: 'JOP-240712', pic: 'Budi S.', status: 'Shipment Plan' },
  { id: 'R-10429', form: 'F-2245', shift: 'B', date: '2024-07-12', grade: 'KLB-150', gsm: 150, plybond: 1.8, thickness: 0.22, bulk: 1.47, width: 1650, diameter: 1090, core: 76, weight: 998, cobb: 69, exMaterial: 'OCC', visual: 'OK', location: '', jop: 'JOP-240713', pic: 'Agus R.', status: 'Incoming' },
  { id: 'R-10430', form: 'F-2245', shift: 'B', date: '2024-07-13', grade: 'KLB-150', gsm: 150, plybond: 1.7, thickness: 0.22, bulk: 1.47, width: 1650, diameter: 1105, core: 76, weight: 1012, cobb: 71, exMaterial: 'OCC', visual: 'OK', location: 'G-01-01', jop: 'JOP-240713', pic: 'Agus R.', status: 'Slotted' },
];

export const demandForecast = [
  { month: 'Jan', actual: 2840, forecast: null },
  { month: 'Feb', actual: 3120, forecast: null },
  { month: 'Mar', actual: 3050, forecast: null },
  { month: 'Apr', actual: 3380, forecast: null },
  { month: 'May', actual: 3620, forecast: null },
  { month: 'Jun', actual: 3510, forecast: null },
  { month: 'Jul', actual: 3740, forecast: 3760 },
  { month: 'Aug', actual: null, forecast: 3950 },
  { month: 'Sep', actual: null, forecast: 4120 },
  { month: 'Oct', actual: null, forecast: 4380 },
  { month: 'Nov', actual: null, forecast: 4210 },
  { month: 'Dec', actual: null, forecast: 4550 },
];

export const warehouseData = [
  { id: 'A', occupied: 42, available: 18, planning: 5, shipment: 12, nonPO: 4, moveWH: 2, hold: 3, total: 60 },
  { id: 'B', occupied: 38, available: 22, planning: 3, shipment: 8, nonPO: 2, moveWH: 1, hold: 1, total: 60 },
  { id: 'C', occupied: 55, available: 5, planning: 8, shipment: 15, nonPO: 6, moveWH: 3, hold: 4, total: 60 },
  { id: 'D', occupied: 28, available: 32, planning: 2, shipment: 6, nonPO: 1, moveWH: 0, hold: 2, total: 60 },
  { id: 'E', occupied: 47, available: 13, planning: 6, shipment: 10, nonPO: 3, moveWH: 2, hold: 5, total: 60 },
  { id: 'F', occupied: 31, available: 29, planning: 4, shipment: 7, nonPO: 2, moveWH: 1, hold: 0, total: 60 },
  { id: 'G', occupied: 19, available: 41, planning: 1, shipment: 4, nonPO: 0, moveWH: 0, hold: 1, total: 60 },
];

export const targetOrders = [
  { spk: 'SPK-240701', jop: 'JOP-240710', po: 'PO-TYO-2407', customer: 'PT Surya Makmur', grade: 'KLB-150', gsm: 150, rw: 1650, qtyRoll: 48, weight: 48216, container: '2x40HC', noted: 'Priority shipment' },
  { spk: 'SPK-240702', jop: 'JOP-240709', po: 'PO-SGP-2407', customer: 'Pacific Paper Co.', grade: 'KLB-200', gsm: 200, rw: 1850, qtyRoll: 32, weight: 36288, container: '1x40HC', noted: '' },
  { spk: 'SPK-240703', jop: 'JOP-240711', po: 'PO-JKT-2407', customer: 'CV Mega Karton', grade: 'KIA-125', gsm: 125, rw: 1550, qtyRoll: 64, weight: 56064, container: '3x40HC', noted: 'Split delivery' },
  { spk: 'SPK-240704', jop: 'JOP-240712', po: 'PO-SBY-2407', customer: 'UD Karya Bersama', grade: 'KLB-175', gsm: 175, rw: 1750, qtyRoll: 24, weight: 25332, container: '1x40HC', noted: '' },
  { spk: 'SPK-240705', jop: 'JOP-240713', po: 'PO-BDG-2407', customer: 'PT Graha Industri', grade: 'KLB-150', gsm: 150, rw: 1650, qtyRoll: 56, weight: 56280, container: '2x40HC', noted: 'COD terms' },
];

export const ocrLogs = [
  { id: 'OCR-001', timestamp: '2024-07-13 08:12:34', roll: 'R-10430', detectedWeight: '1,012 kg', status: 'Success', error: '-', admin: 'Agus R.', result: 'Accepted' },
  { id: 'OCR-002', timestamp: '2024-07-13 07:55:20', roll: 'R-10429', detectedWeight: '-', status: 'Error', error: 'Image too far', admin: 'Agus R.', result: 'Retried' },
  { id: 'OCR-003', timestamp: '2024-07-12 15:44:11', roll: 'R-10428', detectedWeight: '1,068 kg', status: 'Success', error: '-', admin: 'Budi S.', result: 'Accepted' },
  { id: 'OCR-004', timestamp: '2024-07-12 14:30:05', roll: 'R-10427', detectedWeight: '1,045 kg', status: 'Success', error: '-', admin: 'Budi S.', result: 'Accepted' },
  { id: 'OCR-005', timestamp: '2024-07-12 13:12:18', roll: 'R-10426', detectedWeight: '-', status: 'Error', error: 'Camera blurred', admin: 'Sari W.', result: 'Manual override' },
  { id: 'OCR-006', timestamp: '2024-07-11 16:02:44', roll: 'R-10425', detectedWeight: '876 kg', status: 'Success', error: '-', admin: 'Sari W.', result: 'Accepted' },
];

export const jopData = [
  { jop: 'JOP-240710', spk: 'SPK-240701', po: 'PO-TYO-2407', customer: 'PT Surya Makmur', grade: 'KLB-150', target: 48, rolls: 46, progress: 96 },
  { jop: 'JOP-240709', spk: 'SPK-240702', po: 'PO-SGP-2407', customer: 'Pacific Paper Co.', grade: 'KLB-200', target: 32, rolls: 32, progress: 100 },
  { jop: 'JOP-240711', spk: 'SPK-240703', po: 'PO-JKT-2407', customer: 'CV Mega Karton', grade: 'KIA-125', target: 64, rolls: 38, progress: 59 },
  { jop: 'JOP-240712', spk: 'SPK-240704', po: 'PO-SBY-2407', customer: 'UD Karya Bersama', grade: 'KLB-175', target: 24, rolls: 24, progress: 100 },
  { jop: 'JOP-240713', spk: 'SPK-240705', po: 'PO-BDG-2407', customer: 'PT Graha Industri', grade: 'KLB-150', target: 56, rolls: 12, progress: 21 },
];

export const adminUsers = [
  { id: 1, name: 'Budi Santoso', email: 'budi.s@spectacore.id', status: 'Active', created: '2024-01-15', lastActivity: '2024-07-13 09:22' },
  { id: 2, name: 'Agus Raharjo', email: 'agus.r@spectacore.id', status: 'Active', created: '2024-02-01', lastActivity: '2024-07-13 08:15' },
  { id: 3, name: 'Sari Wulandari', email: 'sari.w@spectacore.id', status: 'Active', created: '2024-03-10', lastActivity: '2024-07-12 16:45' },
  { id: 4, name: 'Dedi Kurniawan', email: 'dedi.k@spectacore.id', status: 'Inactive', created: '2024-04-05', lastActivity: '2024-06-30 11:00' },
];

export const alerts = [
  { id: 1, type: 'error', title: 'OCR Detection Error', message: 'Camera image is too far from the display. Roll R-10429.', time: '08 minutes ago' },
  { id: 2, type: 'warning', title: 'Roll Has No Location', message: 'Roll R-10429 received but has no assigned warehouse slot.', time: '14 minutes ago' },
  { id: 3, type: 'warning', title: 'Duplicate Roll Entry', message: 'Possible duplicate detected: R-10424 and a new form from Shift B.', time: '1 hour ago' },
  { id: 4, type: 'info', title: 'OCR Verification Required', message: 'Roll R-10425 weight reading requires admin verification.', time: '2 hours ago' },
  { id: 5, type: 'success', title: 'JOP-240709 Completed', message: 'All 32 rolls for Pacific Paper Co. have been confirmed and slotted.', time: '3 hours ago' },
];
