export interface Medicine {
  id: string;
  barcode: string;
  name: string;
  category: 'Obat Bebas' | 'Obat Bebas Terbatas' | 'Obat Keras' | 'Alat Kesehatan' | 'Herbal / Suplemen';
  kelas?: string; // Kelas Terapi (e.g. Analgesik / Antipiretik, Antibiotik, Antihipertensi, dll)
  nappza?: 'Non-NAPPZA' | 'Prekursor' | 'OOT' | 'Psikotropik' | 'Narkotik' | string; // Kategori NAPPZA
  kekuatan?: string; // Kekuatan Sediaan (e.g. 500 mg, 10 mg)
  form: string; // Tablet, Sirup, Kaplet, Kapsul, Salep, Injeksi, etc.
  unit: string;
  satuanKecil: string;
  satuanBesar: string;
  rasioKonversi: number;
  hnaBesar: number;
  hpp: number;
  sellPrice: number; // Reguler / OTC
  sellPriceKlinik: number; // Pasien Klinik
  sellPriceMitra: number; // Nakes / Mitra
  markupReguler?: number;
  markupKlinik?: number;
  markupMitra?: number;
  stock: number;
  minStock: number;
  maxStock: number;
  batchNo: string;
  expDate: string;
  rack: string;
  supplier: string;
  branchId: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  isCentral: boolean;
  syncStatus: 'Tersinkronisasi' | 'Sinkronisasi Berjalan' | 'Offline';
  lastSyncTime: string;
}

export interface StockMutation {
  id: string;
  date: string;
  time: string;
  medicineId: string;
  medicineName: string;
  refNo: string;
  type: 'PEMBELIAN' | 'PENJUALAN' | 'TRANSFER_KELUAR' | 'TRANSFER_MASUK' | 'PENYESUAIAN' | 'RESEP_DOKTER' | 'RETUR PEMBELIAN' | 'STOK_OPNAME';
  inQty: number;
  outQty: number;
  balance: number;
  ket: string;
  petugas: string;
  branchId: string;
  hpp?: number;
  nominalDiff?: number;
}

export interface StockOpnameItemRecord {
  medicineId: string;
  medicineName: string;
  unit: string;
  hpp: number;
  sellPrice: number;
  systemStock: number;
  physicalStock: number;
  difference: number;
  nominalDiffHpp: number; // difference * hpp
  nominalDiffSell: number; // difference * sellPrice
  reason: string;
}

export interface StockOpnameRecord {
  id: string;
  refNo: string;
  date: string; // YYYY-MM-DD
  time: string;
  petugas: string;
  branchId: string;
  branchName: string;
  totalItemsCounted: number;
  matchCount: number;
  surplusCount: number;
  deficitCount: number;
  totalSurplusNominal: number; // positive nominal (Rp)
  totalDeficitNominal: number; // absolute value of deficit nominal (Rp)
  netNominalDiff: number; // totalSurplusNominal - totalDeficitNominal
  notes?: string;
  items: StockOpnameItemRecord[];
}

export interface Patient {
  id: string; // No. RM
  nik: string;
  name: string;
  age: number;
  gender: 'Laki-laki' | 'Perempuan';
  birthDate: string;
  phone: string;
  address: string;
  allergy: string;
  category: 'Pasien Umum' | 'Pasien Praktik' | 'Mitra Perusahaan';
  bpjsNo?: string;
  registeredOnline?: boolean;
  registrationDate: string;
}

export interface VitalSign {
  td: string; // mmHg e.g. 120/80
  suhu: number; // Celcius e.g. 36.5
  nadi: number; // bpm e.g. 80
  spo2: number; // % e.g. 98
  bb?: number; // kg
  tb?: number; // cm
  respirasi?: number; // x/menit
}

export interface PatientQueue {
  nomor: string; // A-001, A-002
  rmId: string;
  name: string;
  age: number;
  gender: 'Laki-laki' | 'Perempuan';
  vital: VitalSign;
  status: 'Menunggu' | 'Diperiksa' | 'Farmasi' | 'Selesai' | 'Batal';
  doctorId: string;
  doctorName: string;
  checkinTime: string;
  source: 'Pendaftaran Langsung (Walk-in)' | 'Pendaftaran Online';
  complaint: string;
  serviceType: string;
  branchId: string;
}

export interface OnlineRegistration {
  id: string;
  bookingCode: string;
  nik: string;
  name: string;
  phone: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorId: string;
  doctorName: string;
  serviceType: string;
  paymentType: 'Umum / Mandiri';
  complaint: string;
  allergy: string;
  status: 'Menunggu Verifikasi' | 'Diterima' | 'Ditolak' | 'Selesai';
  createdAt: string;
  branchId: string;
}

export interface Doctor {
  id: string;
  name: string;
  sip: string;
  specialization: string;
  feePerPatient: number;
  commissionPercent: number;
  phone: string;
  earnedCommission: number;
  status: 'Aktif' | 'Cuti';
  schedule?: string;
}

export type StaffRole =
  | 'Super Admin / APJ'
  | 'Dokter'
  | 'Apoteker'
  | 'Perawat / Bidan'
  | 'Perawat / Nakes Lapangan'
  | 'Kasir & Front Office';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  roles?: StaffRole[]; // Multi-role checkbox support
  permissions?: string[]; // Custom module access checkboxes per staff
  phone: string;
  status: 'Aktif' | 'Non-Aktif';
  branchId: string;
}

export interface PermissionItem {
  id: string;
  label: string;
  category: string;
  superAdminOnly?: boolean;
}

export const SYSTEM_PERMISSIONS: PermissionItem[] = [
  { id: 'dashboard', label: 'Dashboard Eksekutif', category: 'Umum' },
  { id: 'fo-antrean', label: 'Live Monitor & Suara Antrean', category: '1. Front Office & Antrean' },
  { id: 'fo-pasien', label: 'Master Pasien & Kartu QR', category: '1. Front Office & Antrean' },
  { id: 'fo-checkin', label: 'Check-in & Tanda Vital', category: '1. Front Office & Antrean' },
  { id: 'fo-online', label: 'Pendaftaran Online', category: '1. Front Office & Antrean' },
  { id: 'rme-pemeriksaan', label: 'Ruang Periksa Dokter (SOAP)', category: '2. Pelayanan Dokter & RME' },
  { id: 'rme-cek-lab', label: 'Cek Lab & Diagnostik', category: '2. Pelayanan Dokter & RME' },
  { id: 'rme-riwayat', label: 'Arsip e-RME & Riwayat', category: '2. Pelayanan Dokter & RME' },
  { id: 'rme-laporan', label: 'Laporan Medis & Morbiditas', category: '2. Pelayanan Dokter & RME' },
  { id: 'pos-kasir', label: 'Form POS Kasir Multi-Tier', category: '3. Farmasi & Kasir POS' },
  { id: 'pos-resep', label: 'Antrean E-Resep & Skrining', category: '3. Farmasi & Kasir POS' },
  { id: 'pos-riwayat', label: 'Riwayat & Faktur Penjualan', category: '3. Farmasi & Kasir POS' },
  { id: 'inv-master', label: 'Master Obat & Harga Bertingkat', category: '4. Inventaris & Logistik Pusat' },
  { id: 'inv-kartu-stok', label: 'Kartu Stok Digital (FEFO)', category: '4. Inventaris & Logistik Pusat' },
  { id: 'inv-stok-opname', label: 'Stok Opname (Live)', category: '4. Inventaris & Logistik Pusat' },
  { id: 'inv-pembelian', label: 'Pembelian & Faktur PBF', category: '4. Inventaris & Logistik Pusat' },
  { id: 'inv-retur-riwayat', label: 'Retur Pembelian', category: '4. Inventaris & Logistik Pusat' },
  { id: 'inv-defecta', label: 'Defecta & Re-Order Otomatis', category: '4. Inventaris & Logistik Pusat' },
  { id: 'keuangan-labarugi', label: 'Laba Rugi & Valuasi Aset', category: '5. Keuangan & Akuntansi' },
  { id: 'keuangan-hutang-piutang', label: 'Hutang & Piutang', category: '5. Keuangan & Akuntansi' },
  { id: 'keuangan-setting', label: 'Pengaturan Tarif & Jasa', category: '5. Keuangan & Akuntansi' },
  { id: 'sys-cabang', label: 'Sinkronisasi Multi-Cabang', category: '6. Sistem & Multi-Cabang' },
  { id: 'sys-audit', label: 'Audit Trail & Riwayat Log', category: '6. Sistem & Multi-Cabang' },
  { id: 'setup-mitra', label: 'Mitra (Fasilitas Kesehatan)', category: '7. Setup & Pengaturan' },
  { id: 'setup-supplier', label: 'Supplier (Distributor & PBF)', category: '7. Setup & Pengaturan' },
  { id: 'setup-database', label: 'Export & Import Database', category: '7. Setup & Pengaturan' },
  { id: 'mobile-lapangan', label: 'Mode Mobile Lapangan (Nakes / Opname)', category: '7. Setup & Pengaturan' },
  {
    id: 'sys-profil-fasilitas',
    label: 'Pengaturan Sistem & Profil Fasilitas (Khusus Super Admin / APJ)',
    category: '7. Setup & Pengaturan',
    superAdminOnly: true
  }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin / APJ': SYSTEM_PERMISSIONS.map((p) => p.id),
  'Dokter': [
    'dashboard',
    'fo-antrean',
    'fo-pasien',
    'fo-checkin',
    'rme-pemeriksaan',
    'rme-cek-lab',
    'rme-riwayat',
    'rme-laporan'
  ],
  'Apoteker': [
    'dashboard',
    'fo-antrean',
    'rme-cek-lab',
    'pos-kasir',
    'pos-resep',
    'pos-riwayat',
    'inv-master',
    'inv-kartu-stok',
    'inv-stok-opname',
    'inv-pembelian',
    'inv-retur-riwayat',
    'inv-defecta',
    'setup-supplier',
    'mobile-lapangan'
  ],
  'Perawat / Bidan': [
    'dashboard',
    'fo-antrean',
    'fo-pasien',
    'fo-checkin',
    'fo-online',
    'rme-cek-lab',
    'rme-riwayat',
    'inv-stok-opname',
    'mobile-lapangan'
  ],
  'Perawat / Nakes Lapangan': [
    'dashboard',
    'fo-antrean',
    'fo-pasien',
    'fo-checkin',
    'rme-cek-lab',
    'inv-stok-opname',
    'mobile-lapangan'
  ],
  'Kasir & Front Office': [
    'dashboard',
    'fo-antrean',
    'fo-pasien',
    'fo-checkin',
    'fo-online',
    'pos-kasir',
    'pos-resep',
    'pos-riwayat',
    'keuangan-hutang-piutang'
  ]
};

export const getStaffActiveRoles = (
  st?: Staff | null,
  fallbackRole: StaffRole = 'Apoteker'
): StaffRole[] => {
  if (!st) return [fallbackRole];
  if (st.roles && st.roles.length > 0) return st.roles;
  return [st.role];
};

export const resolveStaffEffectivePermissions = (
  st: Staff | null | undefined,
  activeRole: string,
  rolePermissions: Record<string, string[]> = DEFAULT_ROLE_PERMISSIONS
): string[] => {
  const validPermIds = new Set(SYSTEM_PERMISSIONS.map((p) => p.id));
  const roles = getStaffActiveRoles(st, activeRole as StaffRole);
  const hasSuperAdmin =
    roles.includes('Super Admin / APJ') || activeRole === 'Super Admin / APJ';

  if (hasSuperAdmin) {
    return SYSTEM_PERMISSIONS.map((p) => p.id);
  }

  if (st && Array.isArray(st.permissions)) {
    return st.permissions.filter(
      (id) => validPermIds.has(id) && id !== 'sys-profil-fasilitas'
    );
  }

  const merged = new Set<string>();
  roles.forEach((r) => {
    const list = rolePermissions[r] || DEFAULT_ROLE_PERMISSIONS[r] || [];
    list.forEach((pId) => {
      if (validPermIds.has(pId) && pId !== 'sys-profil-fasilitas') {
        merged.add(pId);
      }
    });
  });

  return Array.from(merged);
};

export interface PrescriptionItem {
  medicineId: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  dosage: string;
  notes?: string;
}

export interface StaffFeeItem {
  staffId: string;
  staffName: string;
  role: string;
  fee: number;
}

export interface RMERecord {
  id: string;
  date: string;
  time: string;
  rmId: string;
  patientName: string;
  nik: string;
  age: number;
  gender: 'Laki-laki' | 'Perempuan';
  doctorName: string;
  doctorId: string;
  vitalSign: VitalSign;
  soapS: string; // Subjective
  soapO: string; // Objective
  soapA: string; // Assessment
  soapP?: string; // Plan
  icdCode: string;
  icdName: string;
  icdList?: ICD10Item[];
  prescription: PrescriptionItem[];
  doctorFee: number;
  medicalSupportFee: number;
  adminFee: number;
  assignedStaff?: StaffFeeItem[];
  notes?: string;
  branchId: string;
}

export interface EPrescription {
  id: string;
  rmId: string;
  patientName: string;
  doctorName: string;
  items: PrescriptionItem[];
  status: 'Pending Skrining' | 'Lolos Skrining' | 'Ditolak' | 'Disiapkan' | 'Selesai di POS';
  timestamp: string;
  screeningNotes?: string;
  assignedStaff?: StaffFeeItem[];
  screeningChecks?: {
    admin: { namaDokter: boolean; sip: boolean; tglResep: boolean; paraf: boolean };
    farmasetik: { bentukSediaan: boolean; dosis: boolean; stabilitas: boolean; kompatibilitas: boolean };
    klinis: { tepatDosis: boolean; tepatWaktu: boolean; kontraIndikasi: boolean; interaksi: boolean };
  };
  branchId: string;
}

export interface CartItem {
  id: string;
  name: string;
  batchNo?: string;
  expDate?: string;
  kekuatan?: string;
  qty: number;
  unit: string;
  tuslah: number;
  price: number;
  discount: number;
  subtotal: number;
  hpp: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'REGULER' | 'KLINIK' | 'MITRA' | 'FAKTUR_PENJUALAN' | string;
  kasir: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  dueDate?: string;
  term?: string;
  usePpn?: boolean;
  dpp?: number;
  ppn?: number;
  status?: 'Selesai' | 'Dibatalkan' | 'Diretur';
  cancelReason?: string;
  returnReason?: string;
  returnDate?: string;
  rmId?: string;
  doctorName?: string;
  subtotal: number;
  discount: number;
  serviceCharge?: number;
  pembulatan?: number;
  chargeCC: number;
  total: number;
  payAmount: number;
  change: number;
  hppTotal: number;
  profit: number;
  paymentMethod: string;
  description: string;
  paymentStatus?: 'Lunas' | 'Belum Lunas' | 'Sebagian' | 'Tempo';
  paidAmount?: number;
  remainingAmount?: number;
  assignedStaff?: StaffFeeItem[];
  items: CartItem[];
  branchId: string;
}

export interface PurchaseItem {
  medicineId?: string;
  name: string;
  qty: number;
  unit: string;
  batchNo: string;
  expDate: string;
  price: number;
  disc: number;
  subtotal: number;
}

export interface PurchaseInvoice {
  id: string;
  pbfName: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  salesman: string;
  term: 'Cash / COD' | '14 Hari' | '30 Hari' | '60 Hari';
  usePpn: boolean;
  items: PurchaseItem[];
  grossDpp: number;
  totalDiscountAmount: number;
  dpp: number;
  ppn: number;
  totalTagihan: number;
  status: 'Lunas' | 'Belum Lunas' | 'Sebagian';
  paidAmount?: number;
  remainingAmount?: number;
  branchId: string;
}

export interface StockTransfer {
  id: string;
  date: string;
  fromBranchId: string;
  toBranchId: string;
  medicineId: string;
  medicineName: string;
  qty: number;
  unit: string;
  status: 'Terkirim' | 'Diterima' | 'Dibatalkan';
  petugas: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  time: string;
  role: string;
  user: string;
  module: string;
  detail: string;
  branchId: string;
}

export interface ICD10Item {
  code: string;
  name: string;
  category?: string;
}

export interface TariffItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  isSystem?: boolean;
}

export interface FeeConfig {
  doctorFee: number;
  specialistFee: number;
  medicalSupportFee: number;
  adminFee: number;
  homeVisitFee: number;
  pharmacistFee: number;
  activeOnlyForVisit?: boolean;
  customTariffs?: TariffItem[];
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  doctorFee: 20000,
  specialistFee: 50000,
  medicalSupportFee: 5000,
  adminFee: 1000,
  homeVisitFee: 35000,
  pharmacistFee: 10000,
  activeOnlyForVisit: true,
  customTariffs: []
};

export interface Mitra {
  id: string;
  name: string; // Nama Faskes
  phone: string; // No. Tlp
  licenseNo: string; // No. Izin
  address: string; // Alamat
  category?: 'Klinik Pratama' | 'Klinik Utama' | 'Apotek Mitra' | 'Praktik Dokter Mandiri' | 'Rumah Sakit' | 'Lainnya';
  picName?: string; // Nama Penanggung Jawab
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string; // Nama Supplier / PBF
  address: string; // Alamat
  phone: string; // Kontak / Telepon
  email?: string;
  licenseNo?: string; // No Izin PBF / Distribusi
  picName?: string; // Nama Sales / PIC
  createdAt: string;
}

export type SPGroupType = 'REG' | 'ALK' | 'PRE' | 'OOT' | 'PSI' | 'NAR';

export interface PurchaseOrderItem {
  id: string;
  medicineId: string;
  name: string;
  category: string;
  nappza: string;
  spType: SPGroupType;
  form: string;
  kekuatan?: string;
  satuanBesar: string;
  satuanKecil: string;
  rasioKonversi: number;
  currentStock: number;
  minStock: number;
  qtyBesar: number;
  qtyKecil: number;
  estimatedHna: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string; // e.g. PO-202611-001
  poNumber: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierLicenseNo?: string;
  spNumbers: Record<SPGroupType, string>;
  status: 'Draft' | 'Diajukan' | 'Diproses' | 'Dikirim' | 'Selesai' | 'Dibatalkan';
  items: PurchaseOrderItem[];
  notes?: string;
  totalEstimatedCost: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseReturnItem {
  medicineId: string;
  name: string;
  qty: number;
  unit: string;
  batchNo?: string;
  expDate?: string;
  price: number;
  subtotal: number;
  reason: string;
  alasan?: string;
}

export interface PurchaseReturnRecord {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  pbfName: string;
  date: string;
  time: string;
  salesman?: string;
  items: PurchaseReturnItem[];
  totalReturValue: number;
  petugas: string;
  branchId: string;
}

export interface DebtPaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  pbfName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  notes?: string;
  petugas: string;
  previousBalance: number;
  remainingBalance: number;
  createdAt: string;
}

export interface ReceivablePaymentRecord {
  id: string;
  transactionId: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  notes?: string;
  petugas: string;
  previousBalance: number;
  remainingBalance: number;
  createdAt: string;
}

export interface CashFlowRecord {
  id: string;
  date: string;
  time: string;
  type: 'IN' | 'OUT'; // IN: Pelunasan Piutang / Kas Masuk, OUT: Pembayaran Hutang / Kas Keluar
  category: 'Pembayaran Hutang PBF' | 'Pelunasan Piutang POS' | 'Operasional' | 'Lainnya';
  amount: number;
  referenceId: string;
  referenceNo: string;
  partyName: string; // PBF atau Nama Pasien/Mitra
  paymentMethod: string;
  description: string;
  petugas: string;
  createdAt: string;
}

export interface DRPItem {
  drugName: string;
  category: 'Interaksi Obat' | 'Dosis Berlebih' | 'Dosis Kurang' | 'Kontraindikasi Alergi' | 'Ketidaksesuaian Indikasi' | 'Duplikasi Terapi' | 'Monitoring Khusus' | string;
  severity: 'Kritis' | 'Sedang' | 'Rendah';
  clinicalExplanation: string;
  recommendation: string;
  literatureReference: string;
  referenceUrl?: string;
}

export interface DRPAnalysisResult {
  riskLevel: 'CRITICAL' | 'MODERATE' | 'SAFE';
  summary: string;
  identifiedDRPs?: DRPItem[];
  drugDrugInteractions: {
    severity: 'Tinggi' | 'Sedang' | 'Rendah';
    drugs: string;
    mechanism: string;
    clinicalEffect: string;
    recommendation: string;
    literatureReference?: string;
    referenceUrl?: string;
  }[];
  drugDiseaseInteractions: {
    drug: string;
    conditionOrDiagnosis: string;
    issue: string;
    recommendation: string;
    literatureReference?: string;
    referenceUrl?: string;
  }[];
  dosageAnalysis: {
    drug: string;
    prescribedDose: string;
    standardDose: string;
    status: 'Sesuai' | 'Underdose' | 'Overdose' | 'Perlu Penyesuaian';
    notes: string;
    literatureReference?: string;
    referenceUrl?: string;
  }[];
  allergyAndContraindications: {
    drug: string;
    riskType: 'Alergi' | 'Kontraindikasi' | 'Duplikasi Terapi';
    explanation: string;
    alertLevel: 'Kritis' | 'Peringatan';
    literatureReference?: string;
    referenceUrl?: string;
  }[];
  pharmacistRecommendations: string[];
  screeningPassedRecommendation: boolean;
  source?: string;
  timestamp?: string;
}

export interface PharmacyProfile {
  name: string;
  sia: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  npwp?: string;
  nib?: string;
  headerNote?: string;
  logoUrl?: string;
}

export interface APJProfile {
  name: string;
  sipa: string;
  stra: string;
  phone: string;
  schedule: string;
  notes?: string;
}

export interface DPJProfile {
  name: string;
  sip: string;
  idi: string;
  specialization: string;
  phone: string;
  schedule: string;
  notes?: string;
}

export interface LabTestItem {
  id: string;
  parameter: string;
  result: string;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'Tinggi' | 'Rendah' | 'Kritis' | 'Abnormal';
  notes?: string;
  price?: number;
}

export interface LabTestRecord {
  id: string;
  date: string;
  time: string;
  rmId: string;
  patientName: string;
  nik?: string;
  age?: number;
  gender?: 'Laki-laki' | 'Perempuan';
  doctorName?: string;
  analystName: string;
  clinicalDiagnosis?: string;
  items: LabTestItem[];
  conclusion?: string;
  notes?: string;
  branchId?: string;
  cost?: number;
}

export interface CashDenominationItem {
  nominal: number;
  label: string;
  sheets: number;
  subtotal: number;
}

export const CASH_DENOMINATIONS_LIST: { nominal: number; label: string }[] = [
  { nominal: 1000, label: 'Rp 1.000' },
  { nominal: 2000, label: 'Rp 2.000' },
  { nominal: 5000, label: 'Rp 5.000' },
  { nominal: 10000, label: 'Rp 10.000' },
  { nominal: 20000, label: 'Rp 20.000' },
  { nominal: 50000, label: 'Rp 50.000' },
  { nominal: 100000, label: 'Rp 100.000' }
];

export interface CashierShiftSession {
  id: string;
  branchId: string;
  cashierName: string;
  shiftName: string;
  openDate: string;
  openTime: string;
  openTimestamp: number;
  closeDate?: string;
  closeTime?: string;
  openingFloat: number;
  openingNotes?: string;
  systemCashSales: number;
  systemNonCashSales: number;
  expectedCashInDrawer: number;
  physicalCashInDrawer: number;
  difference: number;
  differenceStatus: 'Sesuai' | 'Surplus (Lebih)' | 'Defisit (Kurang)';
  closingNotes?: string;
  denominations: CashDenominationItem[];
  status:
    | 'Aktif'
    | 'Menunggu Approval Tutup Kasir'
    | 'Ditutup (Sesuai)'
    | 'Ditutup (Approved Super Admin)'
    | 'Ditolak (Hitung Ulang)';
  approvedBy?: string;
  approvalTime?: string;
  approvalNotes?: string;
  transactionCount: number;
}


