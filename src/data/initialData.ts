import {
  Medicine,
  Branch,
  StockMutation,
  Patient,
  PatientQueue,
  OnlineRegistration,
  Doctor,
  Staff,
  RMERecord,
  EPrescription,
  Transaction,
  PurchaseInvoice,
  StockTransfer,
  AuditLog,
  ICD10Item,
  Mitra,
  Supplier
} from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'BR-01',
    name: 'Apotek Latisha Farma (Pusat)',
    code: 'KTM-01',
    address: 'Jl. KTM Tanjung Mas Makmur Kec. Mesuji Timur Kab. Mesuji, Lampung',
    phone: '0895326272957',
    isCentral: true,
    syncStatus: 'Tersinkronisasi',
    lastSyncTime: 'Baru saja'
  },
  
  
];

export const INITIAL_ICD10_LIST: ICD10Item[] = [
  { code: 'J00', name: 'Acute nasopharyngitis [common cold]' },
  { code: 'J02.9', name: 'Acute pharyngitis, unspecified' },
  { code: 'J03.9', name: 'Acute tonsillitis, unspecified' },
  { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified' },
  { code: 'J11.1', name: 'Influenza with other respiratory manifestations' },
  { code: 'J18.9', name: 'Pneumonia, unspecified' },
  { code: 'J20.9', name: 'Acute bronchitis, unspecified' },
  { code: 'J45.9', name: 'Asthma, unspecified' },
  { code: 'K29.7', name: 'Gastritis, unspecified' },
  { code: 'K30', name: 'Functional dyspepsia' },
  { code: 'A09', name: 'Infectious gastroenteritis and colitis, unspecified' },
  { code: 'K59.0', name: 'Constipation' },
  { code: 'I10', name: 'Essential (primary) hypertension' },
  { code: 'I11.9', name: 'Hypertensive heart disease without heart failure' },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' },
  { code: 'E11.65', name: 'Type 2 diabetes mellitus with hyperglycemia' },
  { code: 'E78.5', name: 'Hyperlipidemia, unspecified' },
  { code: 'E79.0', name: 'Hyperuricemia without signs of arthritis (Asam Urat)' },
  { code: 'R50.9', name: 'Fever, unspecified' },
  { code: 'R51', name: 'Headache / Cephalea' },
  { code: 'R10.4', name: 'Other and unspecified abdominal pain' },
  { code: 'R11', name: 'Nausea and vomiting' },
  { code: 'M79.1', name: 'Myalgia' },
  { code: 'M54.5', name: 'Low back pain' },
  { code: 'M25.5', name: 'Pain in joint / Arthralgia' },
  { code: 'L23.9', name: 'Allergic contact dermatitis, unspecified cause' },
  { code: 'L30.9', name: 'Dermatitis, unspecified' },
  { code: 'L50.9', name: 'Urticaria, unspecified' },
  { code: 'B35.1', name: 'Tinea unguium / Jamur Kulit' },
  { code: 'H10.9', name: 'Unspecified conjunctivitis' },
  { code: 'N39.0', name: 'Urinary tract infection, site not specified' },
  { code: 'K04.0', name: 'Pulpitis' },
  { code: 'K02.9', name: 'Dental caries, unspecified' }
];

export const INITIAL_MEDICINES: Medicine[] = [];

export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'DOC-001',
    name: 'dr. Anis Prima Dewi',
    sip: 'SIP/2024/001-KNA',
    specialization: 'Dokter Umum & Pemeriksaan Keluarga',
    feePerPatient: 20000,
    commissionPercent: 10,
    phone: '0812-7711-2233',
    earnedCommission: 0,
    status: 'Aktif'
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    id: 'STF-001',
    name: 'apt. Mardin, S.Farm',
    role: 'Super Admin / APJ',
    phone: '0812-3456-7890',
    status: 'Aktif',
    branchId: 'BR-01'
  },
  {
    id: 'STF-002',
    name: 'dr. Anis Prima Dewi',
    role: 'Dokter',
    phone: '0812-7711-2233',
    status: 'Aktif',
    branchId: 'BR-01'
  },
  {
    id: 'STF-003',
    name: 'Siti Rahma, A.Md.Far',
    role: 'Apoteker',
    phone: '0819-8765-4321',
    status: 'Aktif',
    branchId: 'BR-01'
  },
  {
    id: 'STF-004',
    name: 'Ns. Ratna Sari, S.Kep',
    role: 'Perawat / Bidan',
    phone: '0821-3344-9988',
    status: 'Aktif',
    branchId: 'BR-01'
  },
  {
    id: 'STF-005',
    name: 'Dewi Lestari',
    role: 'Kasir & Front Office',
    phone: '0857-1122-3344',
    status: 'Aktif',
    branchId: 'BR-01'
  }
];

export const INITIAL_PATIENT_QUEUE: PatientQueue[] = [];

export const INITIAL_ONLINE_REGISTRATIONS: OnlineRegistration[] = [];

export const INITIAL_RME_RECORDS: RMERecord[] = [];

export const INITIAL_E_PRESCRIPTIONS: EPrescription[] = [];

export const INITIAL_PURCHASE_INVOICES: PurchaseInvoice[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_STOCK_MUTATIONS: StockMutation[] = [];

export const INITIAL_TRANSFERS: StockTransfer[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_MITRA: Mitra[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];
