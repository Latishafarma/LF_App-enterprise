import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  User,
  Calendar,
  Clock,
  Stethoscope,
  X,
  Save,
  Sparkles,
  Layers,
  Activity,
  FileCheck2,
  Share2,
  Check
} from 'lucide-react';
import { LabTestRecord, LabTestItem, Patient, Doctor, PharmacyProfile, DPJProfile, Staff } from '../types';

interface LabTestViewProps {
  labRecords: LabTestRecord[];
  patients: Patient[];
  doctors: Doctor[];
  staffList?: Staff[];
  pharmacyProfile?: PharmacyProfile;
  dpjProfile?: DPJProfile;
  onAddLabRecord: (record: LabTestRecord) => void;
  onUpdateLabRecord: (record: LabTestRecord) => void;
  onDeleteLabRecord: (id: string) => void;
}

import {
  CLINICAL_STANDARDS,
  findClinicalStandard,
  getStandardReferenceRange,
  evaluateLabResultStatus,
  getGenderAdjustedTemplates
} from '../utils/labStandards';
import {
  useFacilityProfiles,
  formatPharmacyAddress
} from './PharmacySettingsModal';
import { openPrintWindow } from '../utils/printHelper';

export const LabTestView: React.FC<LabTestViewProps> = ({
  labRecords,
  patients,
  doctors,
  staffList = [],
  pharmacyProfile: propPharmacyProfile,
  dpjProfile: propDpjProfile,
  onAddLabRecord,
  onUpdateLabRecord,
  onDeleteLabRecord
}) => {
  const {
    pharmacyProfile: savedPharm,
    apjProfile,
    dpjProfile: savedDpj
  } = useFacilityProfiles();
  const pharmacyProfile = propPharmacyProfile || savedPharm;
  const dpjProfile = propDpjProfile || savedDpj;
  const pharmacyFullAddress = formatPharmacyAddress(pharmacyProfile);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABNORMAL' | 'NORMAL'>('ALL');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LabTestRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<LabTestRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<LabTestRecord | null>(null);

  const activeStaffOptions = useMemo(() => {
    return staffList.filter((s) => s.status !== 'Non-Aktif');
  }, [staffList]);

  const defaultAnalyst = useMemo(() => {
    const nurseOrAnalyst = activeStaffOptions.find(
      (s) =>
        s.role === 'Perawat / Bidan' ||
        s.role === 'Perawat / Nakes Lapangan' ||
        s.role === 'Apoteker'
    );
    return nurseOrAnalyst?.name || activeStaffOptions[0]?.name || 'Analis Latisha Farma';
  }, [activeStaffOptions]);

  // Form input state
  const [selectedRmId, setSelectedRmId] = useState('');
  const [customPatientName, setCustomPatientName] = useState('');
  const [customPatientNik, setCustomPatientNik] = useState('');
  const [customPatientAge, setCustomPatientAge] = useState<number>(30);
  const [customPatientGender, setCustomPatientGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [examTime, setExamTime] = useState(() => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  const [doctorName, setDoctorName] = useState(doctors[0]?.name || 'dr. Anis Prima Dewi');
  const [analystName, setAnalystName] = useState(defaultAnalyst);
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [cost, setCost] = useState<number>(50000);

  // Search/Filter registered patient inside Lab Document Form Modal
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  const filteredRegisteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients;
    const q = patientSearchQuery.toLowerCase().trim();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.nik && p.nik.includes(q))
    );
  }, [patients, patientSearchQuery]);

  // Multi-parameter list in form
  const [testItems, setTestItems] = useState<LabTestItem[]>([
    {
      id: `ITEM-1`,
      parameter: 'Gula Darah Sewaktu (GDS)',
      result: '110',
      unit: 'mg/dL',
      referenceRange: '70 - 200',
      status: 'Normal',
      notes: '',
      price: 20000
    }
  ]);

  // Synchronize test items reference ranges and evaluate status whenever gender changes
  const updateTestItemsForGender = (gender: 'Laki-laki' | 'Perempuan', currentItems?: LabTestItem[]) => {
    const targetItems = currentItems || testItems;
    const updated = targetItems.map((item) => {
      const std = findClinicalStandard(item.parameter);
      if (std) {
        const newRange = gender === 'Perempuan' ? std.rangeFemale : std.rangeMale;
        const newStatus = evaluateLabResultStatus(item.parameter, item.result, gender, newRange);
        return {
          ...item,
          referenceRange: newRange,
          unit: std.unit,
          status: newStatus
        };
      }
      // If not in clinical standards, re-evaluate with existing range
      const newStatus = evaluateLabResultStatus(item.parameter, item.result, gender, item.referenceRange);
      return {
        ...item,
        status: newStatus
      };
    });
    setTestItems(updated);
  };

  // Handle explicit gender change in the form
  const handleGenderChange = (newGender: 'Laki-laki' | 'Perempuan') => {
    setCustomPatientGender(newGender);
    updateTestItemsForGender(newGender);
  };

  // Open Create Form Modal
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    const firstPatient = patients[0];
    const initialGender: 'Laki-laki' | 'Perempuan' = firstPatient ? firstPatient.gender : 'Laki-laki';
    setPatientSearchQuery('');
    
    if (firstPatient) {
      setSelectedRmId(firstPatient.id);
      setCustomPatientName(firstPatient.name);
      setCustomPatientNik(firstPatient.nik);
      setCustomPatientAge(firstPatient.age);
      setCustomPatientGender(initialGender);
    } else {
      setSelectedRmId('');
      setCustomPatientName('');
      setCustomPatientNik('');
      setCustomPatientAge(30);
      setCustomPatientGender('Laki-laki');
    }
    setExamDate(new Date().toISOString().split('T')[0]);
    setExamTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    setDoctorName(doctors[0]?.name || 'dr. Anis Prima Dewi');
    setAnalystName(defaultAnalyst);
    setClinicalDiagnosis('Check-up rutin / Skrining');
    setConclusion('Hasil pemeriksaan laboratorium dalam batas normal.');
    setCost(35000);
    
    const initialItems: LabTestItem[] = [
      {
        id: `ITEM-${Date.now()}-1`,
        parameter: 'Gula Darah Sewaktu (GDS)',
        result: '115',
        unit: 'mg/dL',
        referenceRange: '70 - 200',
        status: 'Normal',
        notes: '',
        price: 15000
      },
      {
        id: `ITEM-${Date.now()}-2`,
        parameter: 'Kolesterol Total',
        result: '175',
        unit: 'mg/dL',
        referenceRange: '150 - 200',
        status: 'Normal',
        notes: '',
        price: 20000
      }
    ];
    setTestItems(initialItems);
    updateTestItemsForGender(initialGender, initialItems);
    setIsFormModalOpen(true);
  };

  // Open Edit Form Modal
  const handleOpenEditModal = (rec: LabTestRecord) => {
    setEditingRecord(rec);
    setPatientSearchQuery('');
    setSelectedRmId(rec.rmId);
    setCustomPatientName(rec.patientName);
    setCustomPatientNik(rec.nik || '');
    setCustomPatientAge(rec.age || 30);
    const recGender: 'Laki-laki' | 'Perempuan' = rec.gender || 'Laki-laki';
    setCustomPatientGender(recGender);
    setExamDate(rec.date);
    setExamTime(rec.time);
    setDoctorName(rec.doctorName || doctors[0]?.name || 'dr. Anis Prima Dewi');
    setAnalystName(rec.analystName);
    setClinicalDiagnosis(rec.clinicalDiagnosis || '');
    setConclusion(rec.conclusion || '');
    setCost(rec.cost || 50000);
    setTestItems(rec.items.length > 0 ? [...rec.items] : []);
    setIsFormModalOpen(true);
  };

  // Handle patient dropdown change
  const handlePatientSelectChange = (rmId: string) => {
    setSelectedRmId(rmId);
    const p = patients.find((item) => item.id === rmId);
    if (p) {
      setCustomPatientName(p.name);
      setCustomPatientNik(p.nik);
      setCustomPatientAge(p.age);
      setCustomPatientGender(p.gender);
      // Auto-update existing test items with this patient's gender standard
      updateTestItemsForGender(p.gender);
    }
  };

  // Add parameter row
  const handleAddParamRow = () => {
    setTestItems((prev) => [
      ...prev,
      {
        id: `ITEM-${Date.now()}-${prev.length + 1}`,
        parameter: '',
        result: '',
        unit: 'mg/dL',
        referenceRange: '',
        status: 'Normal',
        notes: '',
        price: 0
      }
    ]);
  };

  // Remove parameter row and update total cost if prices were set
  const handleRemoveParamRow = (id: string) => {
    setTestItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const sum = next.reduce((acc, it) => acc + (it.price || 0), 0);
      if (sum > 0 || next.length === 0) {
        setCost(sum);
      }
      return next;
    });
  };

  // Update single parameter row with auto clinical standard lookup, gender evaluator, & price summation
  const handleUpdateParamRow = (id: string, field: keyof LabTestItem, val: any) => {
    setTestItems((prev) => {
      const next = prev.map((item) => {
        if (item.id === id) {
          let updated = { ...item };
          if (field === 'price') {
            const parsed = val === '' ? 0 : (parseFloat(String(val)) || 0);
            updated.price = parsed;
          } else {
            (updated as any)[field] = val;
          }

          // If parameter name changed: auto populate standard unit and gender-specific reference range
          if (field === 'parameter') {
            const std = findClinicalStandard(String(val));
            if (std) {
              updated.unit = std.unit;
              updated.referenceRange = customPatientGender === 'Perempuan' ? std.rangeFemale : std.rangeMale;
              updated.status = evaluateLabResultStatus(
                String(val),
                updated.result,
                customPatientGender,
                updated.referenceRange
              );
            }
          }

          // If result changed: auto evaluate status against clinical standards & gender
          if (field === 'result') {
            updated.status = evaluateLabResultStatus(
              updated.parameter,
              String(val),
              customPatientGender,
              updated.referenceRange
            );
          }

          // If referenceRange changed manually: re-evaluate with custom range
          if (field === 'referenceRange') {
            updated.status = evaluateLabResultStatus(
              updated.parameter,
              updated.result,
              customPatientGender,
              String(val)
            );
          }

          return updated;
        }
        return item;
      });

      // Automatically recalculate total cost if price is changed
      if (field === 'price') {
        const sum = next.reduce((acc, it) => acc + (it.price || 0), 0);
        setCost(sum);
      }

      return next;
    });
  };

  // Current templates adapted to the selected gender
  const currentTemplates = useMemo(() => {
    return getGenderAdjustedTemplates(customPatientGender);
  }, [customPatientGender]);

  // Apply template with default prices and update total cost automatically
  const handleApplyTemplate = (tmpl: ReturnType<typeof getGenderAdjustedTemplates>[0]) => {
    const newItems: LabTestItem[] = tmpl.items.map((it, idx) => ({
      id: `ITEM-${Date.now()}-${idx}-${Math.random().toString().slice(2, 6)}`,
      parameter: it.parameter,
      result: '',
      unit: it.unit,
      referenceRange: it.referenceRange,
      status: 'Normal',
      notes: '',
      price: 20000
    }));

    setTestItems((prev) => {
      const next = [...prev, ...newItems];
      const sum = next.reduce((acc, it) => acc + (it.price || 0), 0);
      setCost(sum);
      return next;
    });
  };

  // Save Record
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPatientName.trim()) {
      alert('Nama pasien wajib diisi.');
      return;
    }
    if (testItems.length === 0) {
      alert('Dokumen cek lab harus memuat minimal 1 parameter uji.');
      return;
    }

    if (editingRecord) {
      // Update
      const updated: LabTestRecord = {
        ...editingRecord,
        rmId: selectedRmId || editingRecord.rmId,
        patientName: customPatientName,
        nik: customPatientNik,
        age: customPatientAge,
        gender: customPatientGender,
        date: examDate,
        time: examTime,
        doctorName,
        analystName,
        clinicalDiagnosis,
        items: testItems,
        conclusion,
        cost
      };
      onUpdateLabRecord(updated);
    } else {
      // Create New
      const newRec: LabTestRecord = {
        id: `LAB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        rmId: selectedRmId || `RM-${Math.floor(100 + Math.random() * 900)}`,
        patientName: customPatientName,
        nik: customPatientNik,
        age: customPatientAge,
        gender: customPatientGender,
        date: examDate,
        time: examTime,
        doctorName,
        analystName,
        clinicalDiagnosis,
        items: testItems,
        conclusion,
        cost
      };
      onAddLabRecord(newRec);
    }

    setIsFormModalOpen(false);
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return labRecords.filter((rec) => {
      const matchSearch =
        rec.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.rmId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.doctorName && rec.doctorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        rec.items.some((i) => i.parameter.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      const hasAbnormal = rec.items.some((i) => i.status === 'Tinggi' || i.status === 'Rendah' || i.status === 'Kritis');
      if (statusFilter === 'ABNORMAL') matchStatus = hasAbnormal;
      if (statusFilter === 'NORMAL') matchStatus = !hasAbnormal;

      return matchSearch && matchStatus;
    });
  }, [labRecords, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDocs = labRecords.length;
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthDocs = labRecords.filter((r) => r.date.startsWith(thisMonth)).length;
    let totalParams = 0;
    let abnormalParams = 0;

    labRecords.forEach((r) => {
      totalParams += r.items.length;
      abnormalParams += r.items.filter((i) => i.status !== 'Normal').length;
    });

    return {
      totalDocs,
      thisMonthDocs,
      totalParams,
      abnormalParams
    };
  }, [labRecords]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-purple-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs uppercase tracking-wider">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span>Modul Pelayanan Dokter & Laboratorium Klinik</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Pemeriksaan & Cek Lab (POCT)
          </h1>
          <p className="text-xs text-purple-200/80 max-w-2xl">
            Pencatatan hasil diagnostik laboratorium terpadu (Gula Darah, Profil Lipid, Asam Urat, Hematologi, Urin). Terintegrasi otomatis langsung ke ruang periksa dokter (SOAP Kolom Objektif).
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Dokumen Cek Lab</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Total Dokumen Lab</span>
            <strong className="text-xl font-black text-slate-900">{metrics.totalDocs}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Pemeriksaan Bulan Ini</span>
            <strong className="text-xl font-black text-slate-900">{metrics.thisMonthDocs}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Total Parameter Uji</span>
            <strong className="text-xl font-black text-slate-900">{metrics.totalParams}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Parameter Abnormal</span>
            <strong className="text-xl font-black text-amber-700">{metrics.abnormalParams}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pasien, No. RM, atau parameter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500">Filter Status:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ALL' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('ABNORMAL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ABNORMAL' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ada Abnormal
            </button>
            <button
              onClick={() => setStatusFilter('NORMAL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'NORMAL' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semua Normal
            </button>
          </div>
        </div>
      </div>

      {/* Table of Lab Test Records */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">No. Lab / Waktu</th>
                <th className="p-3.5">Pasien & No. RM</th>
                <th className="p-3.5">Dokter / Analis</th>
                <th className="p-3.5">Parameter Diperiksa</th>
                <th className="p-3.5">Kesimpulan Klinis</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <FlaskConical className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Belum ada dokumen hasil laboratorium.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Klik tombol "+ Tambah Dokumen Cek Lab" untuk mencatat hasil tes pasien.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 align-top">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {rec.id}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{rec.date}</span>
                          <span className="text-slate-300">·</span>
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{rec.time} WIB</span>
                        </div>
                      </td>

                      <td className="p-3.5 align-top">
                        <strong className="text-slate-900 text-sm block">{rec.patientName}</strong>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {rec.rmId} · {rec.age} th · {rec.gender}
                        </div>
                      </td>

                      <td className="p-3.5 align-top">
                        <div className="text-slate-800 font-bold">{rec.doctorName || '-'}</div>
                        <div className="text-[11px] text-slate-500">Analis: {rec.analystName}</div>
                      </td>

                      <td className="p-3.5 align-top max-w-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {rec.items.map((item, idx) => {
                            const isHigh = item.status === 'Tinggi' || item.status === 'Kritis';
                            const isLow = item.status === 'Rendah';
                            return (
                              <span
                                key={idx}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${
                                  isHigh
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isLow
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {item.parameter}: {item.result} {item.unit}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="p-3.5 align-top max-w-xs">
                        <p className="text-slate-700 text-xs italic leading-snug line-clamp-2">
                          "{rec.conclusion || 'Tidak ada catatan kesimpulan'}"
                        </p>
                      </td>

                      <td className="p-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print / Preview */}
                          <button
                            onClick={() => setPrintRecord(rec)}
                            className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-lg transition"
                            title="Cetak Surat Hasil Lab Resmi"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            className="p-1.5 bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 rounded-lg transition"
                            title="Edit Data Lab"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setRecordToDelete(rec)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg transition"
                            title="Hapus Data Lab"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL FORM INPUT / EDIT HASIL LAB (MULTI-PARAMETER) ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl my-8 space-y-5 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingRecord ? 'Edit Dokumen Hasil Laboratorium' : 'Formulir Hasil Cek Laboratorium Baru'}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Input multi-parameter diagnostik dalam 1 dokumen resmi
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveForm} className="space-y-5 text-xs">
              {/* Section 1: Pasien & Petugas */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider block">
                  1. Informasi Pasien & Pemeriksa
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">Pilih Pasien Terdaftar</label>
                      {patientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPatientSearchQuery('')}
                          className="text-[10px] text-purple-600 hover:text-purple-800 font-bold"
                        >
                          Reset Cari
                        </button>
                      )}
                    </div>
                    <div className="relative mb-1.5">
                      <input
                        type="text"
                        placeholder="Cari otomatis nama / No. RM..."
                        value={patientSearchQuery}
                        onChange={(e) => setPatientSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                    </div>
                    <select
                      value={selectedRmId}
                      onChange={(e) => handlePatientSelectChange(e.target.value)}
                      className="w-full p-2.5 border rounded-xl font-bold bg-white outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">-- Pasien Bebas / Input Manual --</option>
                      {filteredRegisteredPatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id} - {p.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Pasien *</label>
                    <input
                      type="text"
                      required
                      value={customPatientName}
                      onChange={(e) => setCustomPatientName(e.target.value)}
                      className="w-full p-2.5 border rounded-xl font-bold bg-white"
                      placeholder="Nama lengkap pasien..."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No. Rekam Medis (RM)</label>
                    <input
                      type="text"
                      value={selectedRmId}
                      onChange={(e) => setSelectedRmId(e.target.value)}
                      className="w-full p-2.5 border rounded-xl font-mono bg-white"
                      placeholder="RM-..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Usia (Tahun)</label>
                    <input
                      type="number"
                      value={customPatientAge}
                      onChange={(e) => setCustomPatientAge(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border rounded-xl font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Jenis Kelamin <span className="text-[10px] text-purple-600 font-mono">((P)/(L))</span>
                    </label>
                    <select
                      value={customPatientGender}
                      onChange={(e) => handleGenderChange(e.target.value as any)}
                      className="w-full p-2 border rounded-xl bg-white font-bold text-slate-800"
                    >
                      <option value="Laki-laki">Laki-laki (L)</option>
                      <option value="Perempuan">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Periksa</label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full p-2 border rounded-xl font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jam</label>
                    <input
                      type="text"
                      value={examTime}
                      onChange={(e) => setExamTime(e.target.value)}
                      className="w-full p-2 border rounded-xl font-mono bg-white"
                      placeholder="09:30"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Dokter Pengirim</label>
                    <select
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="w-full p-2 border rounded-xl bg-white"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Preset Paket Lab Cepat dengan Standar Gender Otomatis */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Template Paket Parameter Klinis:</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        customPatientGender === 'Perempuan'
                          ? 'bg-pink-100 text-pink-700 border border-pink-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      Standar Nilai Rujukan: {customPatientGender === 'Perempuan' ? '(P)erempuan' : '(L)aki-laki'}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500">Klik paket untuk tambah baris otomatis</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {currentTemplates.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[11px] border border-purple-200 transition flex items-center gap-1"
                      title={tmpl.description}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{tmpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Multi-Parameter Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                    2. Rincian Parameter Pemeriksaan ({testItems.length} Parameter)
                  </span>

                  <button
                    type="button"
                    onClick={handleAddParamRow}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris Parameter</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b text-slate-600 font-bold uppercase text-[10px]">
                        <th className="p-2.5">Nama Parameter / Uji *</th>
                        <th className="p-2.5 w-28">Nilai Hasil *</th>
                        <th className="p-2.5 w-20">Satuan</th>
                        <th className="p-2.5 w-36">
                          <div className="flex items-center gap-1.5">
                            <span>Nilai Rujukan</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-black ${
                                customPatientGender === 'Perempuan'
                                  ? 'bg-pink-100 text-pink-700 border border-pink-300'
                                  : 'bg-blue-100 text-blue-700 border border-blue-300'
                              }`}
                              title={`Nilai rujukan klinis disinkronkan otomatis untuk ${customPatientGender}`}
                            >
                              {customPatientGender === 'Perempuan' ? '(P)' : '(L)'}
                            </span>
                          </div>
                        </th>
                        <th className="p-2.5 w-28">Interpretasi</th>
                        <th className="p-2.5">Catatan</th>
                        <th className="p-2.5 w-28 text-right">Harga (Rp)</th>
                        <th className="p-2.5 w-10 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {testItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              list="clinical-params-list"
                              placeholder="misal: Kolesterol Total, GDS, Hb, dll."
                              value={item.parameter}
                              onChange={(e) => handleUpdateParamRow(item.id, 'parameter', e.target.value)}
                              className="w-full p-1.5 border rounded-lg font-bold bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="Hasil..."
                              value={item.result}
                              onChange={(e) => handleUpdateParamRow(item.id, 'result', e.target.value)}
                              className="w-full p-1.5 border rounded-lg font-mono font-extrabold text-purple-700 bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="mg/dL"
                              value={item.unit}
                              onChange={(e) => handleUpdateParamRow(item.id, 'unit', e.target.value)}
                              className="w-full p-1.5 border rounded-lg font-mono bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="70 - 200"
                              value={item.referenceRange}
                              onChange={(e) => handleUpdateParamRow(item.id, 'referenceRange', e.target.value)}
                              className="w-full p-1.5 border rounded-lg font-mono bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.status}
                              onChange={(e) => handleUpdateParamRow(item.id, 'status', e.target.value as any)}
                              className={`w-full p-1.5 border rounded-lg font-bold ${
                                item.status === 'Tinggi' || item.status === 'Kritis'
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : item.status === 'Rendah'
                                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              }`}
                            >
                              <option value="Normal">Normal</option>
                              <option value="Tinggi">Tinggi</option>
                              <option value="Rendah">Rendah</option>
                              <option value="Kritis">Kritis</option>
                              <option value="Abnormal">Abnormal</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Catatan..."
                              value={item.notes || ''}
                              onChange={(e) => handleUpdateParamRow(item.id, 'notes', e.target.value)}
                              className="w-full p-1.5 border rounded-lg text-slate-600 bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item.price !== undefined && item.price !== null ? item.price : ''}
                              onChange={(e) => handleUpdateParamRow(item.id, 'price', e.target.value)}
                              className="w-full p-1.5 border rounded-lg font-mono font-bold text-right text-slate-800 bg-white focus:ring-1 focus:ring-purple-500"
                              title="Harga parameter uji diisi manual & otomatis mengakumulasi Biaya Pemeriksaan"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveParamRow(item.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Kesimpulan Klinis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kesimpulan & Catatan Hasil Laborat
                  </label>
                  <textarea
                    rows={2}
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    placeholder="Interpretasi menyeluruh hasil lab bagi dokter periksa..."
                    className="w-full p-2.5 border rounded-xl bg-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Petugas / Analis (Data Pegawai)
                      </label>
                      {activeStaffOptions.length > 0 ? (
                        <div className="space-y-1.5">
                          <select
                            value={
                              activeStaffOptions.some((s) => s.name === analystName)
                                ? analystName
                                : '__MANUAL__'
                            }
                            onChange={(e) => {
                              if (e.target.value === '__MANUAL__') {
                                setAnalystName('');
                              } else {
                                setAnalystName(e.target.value);
                              }
                            }}
                            className="w-full p-2 border rounded-xl font-bold bg-white text-slate-800"
                          >
                            {activeStaffOptions.map((st) => (
                              <option key={st.id} value={st.name}>
                                {st.name} ({st.role})
                              </option>
                            ))}
                            <option value="__MANUAL__">-- Input Manual Nama Petugas --</option>
                          </select>
                          {!activeStaffOptions.some((s) => s.name === analystName) && (
                            <input
                              type="text"
                              placeholder="Ketik nama petugas/analis..."
                              value={analystName}
                              onChange={(e) => setAnalystName(e.target.value)}
                              className="w-full p-2 border rounded-xl bg-white"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={analystName}
                          onChange={(e) => setAnalystName(e.target.value)}
                          className="w-full p-2 border rounded-xl bg-white"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Biaya Pemeriksaan (Rp)</label>
                      <input
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(parseInt(e.target.value) || 0)}
                        className="w-full p-2 border rounded-xl font-mono font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Datalist for autocomplete with clinical standard parameters */}
              <datalist id="clinical-params-list">
                {CLINICAL_STANDARDS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.unit}) · {s.category}
                  </option>
                ))}
              </datalist>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingRecord ? 'Perbarui Dokumen Lab' : 'Simpan Dokumen Lab'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CETAK RESMI HASIL LABORATORIUM ================= */}
      {printRecord && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-6 border border-slate-300">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <span className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-purple-600" />
                <span>Lembar Hasil Pemeriksaan Laboratorium Resmi</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('latisha_active_print_lab', JSON.stringify(printRecord));
                    } catch {}
                    openPrintWindow('hasil-lab', { labId: printRecord.id });
                  }}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Print PDF</span>
                </button>
                <button
                  onClick={() => setPrintRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 text-xs font-sans text-slate-900 printable-area">
              {/* Kop Klinik Terintegrasi Profil Apotek, APJ, dan DPJ */}
              <div className="border-b-2 border-slate-900 pb-3">
                <div className="flex items-center justify-between gap-4">
                  {pharmacyProfile.logoUrl ? (
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      <img
                        src={pharmacyProfile.logoUrl}
                        alt="Logo Faskes"
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 shrink-0" />
                  )}
                  <div className="flex-1 text-center space-y-0.5">
                    <h2 className="text-base font-black tracking-wide uppercase text-slate-900">
                      {pharmacyProfile.name}
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {pharmacyFullAddress} · Telp: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      SIA: {pharmacyProfile.sia} · APJ: {apjProfile.name} (SIPA: {apjProfile.sipa}) · DPJ: {dpjProfile.name} (SIP: {dpjProfile.sip})
                    </p>
                  </div>
                  <div className="w-16 shrink-0" />
                </div>
              </div>

              {/* Judul Surat */}
              <div className="text-center space-y-0.5 pt-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 underline">
                  SURAT HASIL PEMERIKSAAN LABORATORIUM SEDERHANA (POCT)
                </h3>
                <span className="text-[10px] font-mono text-slate-500">No. Registrasi Lab: {printRecord.id}</span>
              </div>

              {/* Data Pasien & Pemeriksaan */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-[11px]">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-24 text-slate-500">Nama Pasien</span>
                    <strong className="text-slate-900">: {printRecord.patientName}</strong>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500">No. RM</span>
                    <span className="font-mono font-bold">: {printRecord.rmId}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500">Usia / Gender</span>
                    <span>: {printRecord.age} th / {printRecord.gender}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-slate-500">Tanggal Periksa</span>
                    <span className="font-mono">: {printRecord.date} ({printRecord.time} WIB)</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Dokter Pengirim</span>
                    <span>: {printRecord.doctorName || dpjProfile.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Petugas Analis</span>
                    <span>: {printRecord.analystName}</span>
                  </div>
                </div>
              </div>

              {/* Tabel Hasil */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                      <th className="p-2 border-r w-8 text-center">No</th>
                      <th className="p-2 border-r">Pemeriksaan</th>
                      <th className="p-2 border-r w-24 text-center">Hasil</th>
                      <th className="p-2 border-r w-20 text-center">Satuan</th>
                      <th className="p-2 border-r w-28 text-center">Nilai Rujukan</th>
                      <th className="p-2 text-center w-24">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printRecord.items.map((it, idx) => {
                      const isHigh = it.status === 'Tinggi' || it.status === 'Kritis';
                      const isLow = it.status === 'Rendah';
                      return (
                        <tr key={idx} className={isHigh || isLow ? 'bg-amber-50/30' : ''}>
                          <td className="p-2 border-r text-center font-mono">{idx + 1}</td>
                          <td className="p-2 border-r font-bold text-slate-800">{it.parameter}</td>
                          <td className="p-2 border-r text-center font-mono font-extrabold text-slate-900">
                            {it.result}
                          </td>
                          <td className="p-2 border-r text-center font-mono text-slate-600">{it.unit}</td>
                          <td className="p-2 border-r text-center font-mono text-slate-600">
                            {it.referenceRange || '-'}
                          </td>
                          <td className="p-2 text-center font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                isHigh
                                  ? 'text-rose-700 bg-rose-100'
                                  : isLow
                                  ? 'text-sky-700 bg-sky-100'
                                  : 'text-emerald-700 bg-emerald-100'
                              }`}
                            >
                              {it.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Kesimpulan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-extrabold text-slate-800 text-[10px] uppercase block">
                  Kesimpulan / Catatan Laboratorium:
                </span>
                <p className="text-slate-700 text-xs italic leading-relaxed">
                  "{printRecord.conclusion || 'Hasil pemeriksaan dalam batas normal.'}"
                </p>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 pt-6 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-12">Petugas Pemeriksa / Analis,</span>
                  <strong className="text-slate-900 underline block">{printRecord.analystName}</strong>
                  <span className="text-[10px] text-slate-400">Petugas Laboratorium</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-12">
                    {pharmacyProfile.city}, {printRecord.date}<br />
                    Dokter Pemeriksa / Penanggung Jawab (DPJ),
                  </span>
                  <strong className="text-slate-900 underline block">
                    {printRecord.doctorName || dpjProfile.name}
                  </strong>
                  <span className="text-[10px] text-slate-600 font-mono block">
                    SIP: {dpjProfile.sip}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {dpjProfile.idi}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL KONFIRMASI HAPUS ================= */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 font-extrabold text-sm border-b pb-3">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Konfirmasi Hapus Dokumen Lab</span>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus dokumen hasil laboratorium{' '}
              <strong className="text-slate-900 font-mono">#{recordToDelete.id}</strong> atas nama pasien{' '}
              <strong className="text-slate-900">{recordToDelete.patientName}</strong>?
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border text-xs text-slate-600 space-y-1">
              <div>Jumlah Parameter: {recordToDelete.items.length} uji</div>
              <div>Tanggal: {recordToDelete.date} ({recordToDelete.time} WIB)</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteLabRecord(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition"
              >
                Hapus Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
