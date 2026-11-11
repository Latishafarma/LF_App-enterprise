import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  Send,
  AlertTriangle,
  Pill,
  Plus,
  Trash2,
  Search,
  CheckCircle,
  Clock,
  User,
  HeartPulse,
  Activity,
  FileText,
  Users,
  FlaskConical,
  Check,
  Edit2,
  Pencil,
  Sparkles,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import {
  PatientQueue,
  Medicine,
  Doctor,
  RMERecord,
  EPrescription,
  PrescriptionItem,
  ICD10Item,
  Staff,
  StaffFeeItem,
  FeeConfig,
  DEFAULT_FEE_CONFIG,
  LabTestRecord,
  VitalSign
} from '../types';

interface DoctorSOAPViewProps {
  queue: PatientQueue[];
  medicines: Medicine[];
  activeDoctor: Doctor;
  icd10List: ICD10Item[];
  onSaveRME: (record: RMERecord, prescription?: EPrescription) => void;
  onFinishQueue: (nomor: string) => void;
  patientAllergyMap?: Record<string, string>;
  staffList?: Staff[];
  feeConfig?: FeeConfig;
  labRecords?: LabTestRecord[];
  onUpdateQueuePatient?: (nomor: string, updatedData: Partial<PatientQueue>) => void;
}

export const DoctorSOAPView: React.FC<DoctorSOAPViewProps> = ({
  queue,
  medicines,
  activeDoctor,
  icd10List,
  onSaveRME,
  onFinishQueue,
  staffList = [],
  feeConfig,
  labRecords = [],
  onUpdateQueuePatient
}) => {
  const [selectedQueueNomor, setSelectedQueueNomor] = useState<string>(
    queue.find((q) => q.status === 'Diperiksa')?.nomor || queue[0]?.nomor || ''
  );

  // Multi-select Petugas (Data Pegawai) state
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(() => {
    // Default pre-select doctor and available nurse if any
    const docStaff = staffList.find((s) => s.role === 'Dokter' || s.name.toLowerCase().includes('dr.'));
    const nurseStaff = staffList.find((s) => s.role === 'Perawat / Bidan' || s.role === 'Perawat / Nakes Lapangan');
    const initial: string[] = [];
    if (docStaff) initial.push(docStaff.id);
    else if (staffList.length > 0) initial.push(staffList[0].id);
    if (nurseStaff && !initial.includes(nurseStaff.id)) initial.push(nurseStaff.id);
    return initial;
  });

  useEffect(() => {
    if (selectedStaffIds.length === 0 && staffList.length > 0) {
      const docStaff = staffList.find((s) => s.role === 'Dokter' || s.name.toLowerCase().includes('dr.'));
      const nurseStaff = staffList.find((s) => s.role === 'Perawat / Bidan' || s.role === 'Perawat / Nakes Lapangan');
      const initial: string[] = [];
      if (docStaff) initial.push(docStaff.id);
      else initial.push(staffList[0].id);
      if (nurseStaff && !initial.includes(nurseStaff.id)) initial.push(nurseStaff.id);
      setSelectedStaffIds(initial);
    }
  }, [staffList]);

  // Helper to calculate fee rate per staff role based on feeConfig
  const getStaffFee = (staff: Staff): number => {
    const config = feeConfig || DEFAULT_FEE_CONFIG;
    if (staff.role === 'Dokter') {
      return activeDoctor?.feePerPatient || config.doctorFee || 20000;
    }
    if (staff.role === 'Apoteker' || staff.role === 'Super Admin / APJ') {
      return config.pharmacistFee || 10000;
    }
    if (staff.role === 'Perawat / Bidan' || staff.role === 'Perawat / Nakes Lapangan') {
      return config.medicalSupportFee || 5000;
    }
    if (staff.role === 'Kasir & Front Office') {
      return config.adminFee || 1000;
    }
    return 5000;
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  // Compute staff fee items
  const assignedStaffItems: StaffFeeItem[] = useMemo(() => {
    return selectedStaffIds
      .map((id) => {
        const s = staffList.find((item) => item.id === id);
        if (!s) return null;
        return {
          staffId: s.id,
          staffName: s.name,
          role: s.role,
          fee: getStaffFee(s)
        };
      })
      .filter(Boolean) as StaffFeeItem[];
  }, [selectedStaffIds, staffList, feeConfig, activeDoctor]);

  const totalAssignedStaffFee = useMemo(() => {
    return assignedStaffItems.reduce((acc, it) => acc + it.fee, 0);
  }, [assignedStaffItems]);

  const currentPatient = queue.find((q) => q.nomor === selectedQueueNomor) || queue[0] || null;

  // Editable Vital Signs & Patient Data state for Column 1
  const [isEditingVital, setIsEditingVital] = useState(false);
  const [editedVital, setEditedVital] = useState<VitalSign>({
    td: currentPatient?.vital.td || '120/80',
    suhu: currentPatient?.vital.suhu || 36.5,
    nadi: currentPatient?.vital.nadi || 80,
    spo2: currentPatient?.vital.spo2 || 98,
    bb: currentPatient?.vital.bb || 60,
    tb: currentPatient?.vital.tb || 165
  });
  const [editedComplaint, setEditedComplaint] = useState(currentPatient?.complaint || '');
  const [saveVitalToast, setSaveVitalToast] = useState<string | null>(null);

  // Sync editedVital when selected patient changes
  useEffect(() => {
    if (currentPatient) {
      setEditedVital({
        td: currentPatient.vital.td || '120/80',
        suhu: currentPatient.vital.suhu || 36.5,
        nadi: currentPatient.vital.nadi || 80,
        spo2: currentPatient.vital.spo2 || 98,
        bb: currentPatient.vital.bb,
        tb: currentPatient.vital.tb
      });
      setEditedComplaint(currentPatient.complaint || '');
      setIsEditingVital(false);
    }
  }, [currentPatient?.nomor]);

  const handleSaveVitalChanges = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPatient) return;

    if (onUpdateQueuePatient) {
      onUpdateQueuePatient(currentPatient.nomor, {
        vital: editedVital,
        complaint: editedComplaint
      });
    }

    setIsEditingVital(false);
    setSaveVitalToast(`Tanda-tanda vital ${currentPatient.name} berhasil diperbarui!`);
    setTimeout(() => setSaveVitalToast(null), 3000);
  };

  // SOAP Inputs & Templates for Column 2
  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [soapA, setSoapA] = useState('');
  const [soapP, setSoapP] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedIcds, setSelectedIcds] = useState<ICD10Item[]>([
    { code: 'J00', name: 'Acute nasopharyngitis [common cold]' }
  ]);

  // Standard clinical presets for quick SOAP editing
  const SOAP_TEMPLATES = [
    {
      title: 'ISPA / Batuk Pilek (Common Cold)',
      code: 'J00',
      name: 'Acute nasopharyngitis [common cold]',
      s: 'Pasien mengeluh batuk berdahak, pilek, hidung tersumbat sejak 3 hari lalu. Badan meriang, tenggorokan gatal.',
      o: `Keadaan umum baik, TD: ${editedVital.td}, Suhu: ${editedVital.suhu}°C, Nadi: ${editedVital.nadi}x/mnt. Faring hiperemis ringan (+), sekret hidung serosa (+), ronki (-/-), wheezing (-/-).`,
      a: 'J00 - Acute nasopharyngitis [common cold] (ISPA Ringan)',
      p: 'Edukasi istirahat cukup, perbanyak cairan hangat, hindari gorengan. Terapi obat analgetik-antipiretik, dekongestan, dan multivitamin.'
    },
    {
      title: 'Dispepsia / Sakit Maag & Mual',
      code: 'K30',
      name: 'Dyspepsia',
      s: 'Pasien mengeluh nyeri ulu hati perih/terbakar, mual, perut begah kembung, sering bersendawa sejak 2 hari.',
      o: `Keadaan umum cukup, TD: ${editedVital.td}, Suhu: ${editedVital.suhu}°C, SpO2: ${editedVital.spo2}%. Nyeri tekan epigastrium (+), bising usus normal (+), pembesaran hepar/lien (-).`,
      a: 'K30 - Dyspepsia / Sindrom Dispepsia Fungsional',
      p: 'Edukasi pola makan porsi kecil sering, kurangi makanan pedas/asam, kurangi kopi. Berikan antasida/PPI dan prokinetik.'
    },
    {
      title: 'Hipertensi Primer / Kontrol Tekanan Darah',
      code: 'I10',
      name: 'Essential (primary) hypertension',
      s: 'Pasien kontrol rutin tensi darah tinggi. Terkadang merasa tengkuk kaku, pusing cenat-cenut saat lelah.',
      o: `Keadaan umum baik, TD: ${editedVital.td} mmHg, Nadi: ${editedVital.nadi}x/mnt. Cor: S1-S2 reguler tunggal, murmur (-). Pulmo: vesikuler normal. Edema ekstremitas (-).`,
      a: 'I10 - Essential (primary) hypertension',
      p: 'Diet rendah garam (DASH), olahraga aerobik teratur 30 menit. Kepatuhan minum obat antihipertensi teratur dan pantau tensi mandiri.'
    },
    {
      title: 'Diabetes Melitus Tipe 2 / Kontrol Gula',
      code: 'E11',
      name: 'Type 2 diabetes mellitus',
      s: 'Pasien kontrol rutin gula darah bulanan. Keluhan lemas (-), sering haus (-), kesemutan ringan pada telapak kaki.',
      o: `Keadaan umum compos mentis, TD: ${editedVital.td}, Nadi: ${editedVital.nadi}x/mnt. CRT < 2 dtk, sensibilitas kaki baik, luka/ulkus diabetik (-).`,
      a: 'E11 - Type 2 diabetes mellitus tanpa komplikasi',
      p: 'Edukasi diet 3J (Jadwal, Jumlah, Jenis karbohidrat), senam kaki diabetes. Terapi OAD (oral antidiabetic) sesuai anjuran.'
    },
    {
      title: 'Pemeriksaan Kesehatan Rutin / Surat Sehat',
      code: 'Z00.0',
      name: 'General medical examination',
      s: 'Pasien datang dalam kondisi sehat untuk keperluan pemeriksaan kesehatan berkala / check-up.',
      o: `Keadaan umum baik, gizi cukup, TD: ${editedVital.td}, Suhu: ${editedVital.suhu}°C, Nadi: ${editedVital.nadi}x/mnt, SpO2: ${editedVital.spo2}%. Pemeriksaan fisik head-to-toe dalam batas normal.`,
      a: 'Z00.0 - General medical examination (Kondisi Fisik Baik / Sehat)',
      p: 'Pertahankan gaya hidup sehat, konsumsi gizi seimbang, tidur cukup 7-8 jam/hari, olahraga teratur.'
    }
  ];

  const formatIcdsToAssessment = (list: ICD10Item[]): string => {
    return list.map((item) => `${item.code} - ${item.name}`).join('; ');
  };

  const handleApplySoapTemplate = (tmpl: typeof SOAP_TEMPLATES[0]) => {
    setSoapS(tmpl.s);
    setSoapO(tmpl.o);
    setSoapP(tmpl.p);
    const exists = selectedIcds.some((item) => item.code === tmpl.code);
    const nextIcds = exists
      ? selectedIcds
      : [...selectedIcds, { code: tmpl.code, name: tmpl.name }];
    setSelectedIcds(nextIcds);
    setSoapA(formatIcdsToAssessment(nextIcds));
    setIcdSearch('');
    setShowTemplateModal(false);
  };

  // ICD Search
  const [icdSearch, setIcdSearch] = useState('');
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);

  // E-Prescription items
  const [presItems, setPresItems] = useState<PrescriptionItem[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  // Active Allergy Warning
  const patientAllergy = currentPatient?.rmId
    ? currentPatient.complaint.includes('Alergi')
      ? currentPatient.complaint
      : 'Amoxicillin' // Fallback / mock
    : '';

  // Lab Records integration for current patient
  const patientLabRecords = useMemo(() => {
    if (!currentPatient) return [];
    return labRecords.filter(
      (r) =>
        r.rmId === currentPatient.rmId ||
        r.patientName.toLowerCase() === currentPatient.name.toLowerCase()
    );
  }, [labRecords, currentPatient]);

  const [labToastMessage, setLabToastMessage] = useState<string | null>(null);
  const [showLabSelectorModal, setShowLabSelectorModal] = useState(false);

  const handleApplyLabToObjective = (lab: LabTestRecord) => {
    const paramsFormatted = lab.items
      .map((it) => `${it.parameter}: ${it.result} ${it.unit} (${it.status}${it.referenceRange ? `, Ruj: ${it.referenceRange}` : ''})`)
      .join('; ');

    const labText = `[HASIL LAB ${lab.date}]: ${paramsFormatted}.${lab.conclusion ? ` Kesimpulan: ${lab.conclusion}.` : ''}`;

    setSoapO((prev) => {
      if (!prev || prev.trim() === '') return labText;
      if (prev.includes(lab.id) || prev.includes(`[HASIL LAB ${lab.date}]`)) {
        return prev;
      }
      return `${prev.trim()}\n${labText}`;
    });

    setShowLabSelectorModal(false);
    setLabToastMessage(`Hasil Lab (${lab.items.length} parameter) otomatis dicatat ke kolom Objektif!`);
    setTimeout(() => setLabToastMessage(null), 3500);
  };

  const handleFetchLabResults = () => {
    if (!currentPatient) {
      alert('Pilih pasien antrean terlebih dahulu.');
      return;
    }

    if (patientLabRecords.length === 0) {
      setLabToastMessage(`Belum ada dokumen cek lab tercatat untuk ${currentPatient.name} (${currentPatient.rmId}).`);
      setTimeout(() => setLabToastMessage(null), 3500);
      return;
    }

    if (patientLabRecords.length === 1) {
      handleApplyLabToObjective(patientLabRecords[0]);
    } else {
      setShowLabSelectorModal(true);
    }
  };

  // Filter ICD
  const filteredIcd = useMemo(() => {
    if (!icdSearch.trim()) return icd10List.slice(0, 12);
    const q = icdSearch.toLowerCase();
    return icd10List.filter(
      (item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [icd10List, icdSearch]);

  // Filter Medicines for Prescription
  const filteredMeds = useMemo(() => {
    if (!medSearch.trim()) return medicines.slice(0, 6);
    const q = medSearch.toLowerCase();
    return medicines.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [medicines, medSearch]);

  const handleToggleIcd = (icd: ICD10Item) => {
    const exists = selectedIcds.some((item) => item.code === icd.code);
    const nextList = exists
      ? selectedIcds.filter((item) => item.code !== icd.code)
      : [...selectedIcds, icd];
    setSelectedIcds(nextList);
    setSoapA(formatIcdsToAssessment(nextList));
  };

  const handleRemoveSelectedIcd = (code: string) => {
    const nextList = selectedIcds.filter((item) => item.code !== code);
    setSelectedIcds(nextList);
    setSoapA(formatIcdsToAssessment(nextList));
  };

  const handleAddCustomIcdFromSearch = () => {
    const raw = icdSearch.trim();
    if (!raw) return;
    const parts = raw.split(/\s*-\s*/);
    const customItem: ICD10Item =
      parts.length >= 2
        ? { code: parts[0].toUpperCase(), name: parts.slice(1).join(' - ') }
        : { code: `DIAG-${selectedIcds.length + 1}`, name: raw };
    if (!selectedIcds.some((i) => i.code.toLowerCase() === customItem.code.toLowerCase() && i.name.toLowerCase() === customItem.name.toLowerCase())) {
      const nextList = [...selectedIcds, customItem];
      setSelectedIcds(nextList);
      setSoapA(formatIcdsToAssessment(nextList));
    }
    setIcdSearch('');
    setShowIcdDropdown(false);
  };

  const handleAddMedToPrescription = (med: Medicine) => {
    // Check allergy contraindication
    if (
      patientAllergy &&
      patientAllergy !== 'Tidak Ada' &&
      med.name.toLowerCase().includes(patientAllergy.toLowerCase())
    ) {
      const confirmAdd = window.confirm(
        `PERINGATAN KRITIS: Pasien ini memiliki riwayat alergi terhadap '${patientAllergy}'!\nApakah Anda tetap ingin meresepkan ${med.name}?`
      );
      if (!confirmAdd) return;
    }

    const newItem: PrescriptionItem = {
      medicineId: med.id,
      name: med.name,
      qty: 10,
      unit: med.satuanKecil || med.unit || 'Tablet',
      price: med.sellPriceKlinik || med.sellPrice,
      dosage: '3x1 Tablet Sesudah Makan',
      notes: ''
    };

    setPresItems([...presItems, newItem]);
    setMedSearch('');
    setShowMedDropdown(false);
  };

  const handleRemovePresItem = (idx: number) => {
    setPresItems(presItems.filter((_, i) => i !== idx));
  };

  const handleSaveAndSend = () => {
    if (!currentPatient) {
      alert('Pilih pasien dari antrean terlebih dahulu!');
      return;
    }

    const recordId = `RME-${Date.now().toString().slice(-6)}`;
    const rxId = `RX-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const effectiveIcds: ICD10Item[] =
      selectedIcds.length > 0
        ? selectedIcds
        : [{ code: 'J00', name: 'Acute nasopharyngitis [common cold]' }];
    const joinedCodes = effectiveIcds.map((i) => i.code).join(', ');
    const joinedNames = effectiveIcds.map((i) => i.name).join('; ');
    const defaultAssessment = formatIcdsToAssessment(effectiveIcds);

    const newRecord: RMERecord = {
      id: recordId,
      date: today,
      time: timeNow,
      rmId: currentPatient.rmId,
      patientName: currentPatient.name,
      nik: '1601000000000000',
      age: currentPatient.age,
      gender: currentPatient.gender,
      doctorName: activeDoctor.name,
      doctorId: activeDoctor.id,
      vitalSign: editedVital,
      soapS: soapS || editedComplaint || 'Pasien datang untuk pemeriksaan fisik rutin.',
      soapO: soapO || `Keadaan umum baik, TD: ${editedVital.td}, Suhu: ${editedVital.suhu}°C`,
      soapA: soapA.trim() || defaultAssessment,
      soapP: soapP || 'Istirahat cukup, konsumsi air putih, minum obat sesuai anjuran.',
      icdCode: joinedCodes,
      icdName: joinedNames,
      icdList: effectiveIcds,
      prescription: presItems,
      doctorFee: activeDoctor.feePerPatient || 20000,
      medicalSupportFee: 5000,
      adminFee: 1000,
      assignedStaff: assignedStaffItems.length > 0 ? assignedStaffItems : [
        {
          staffId: staffList.find((s) => s.role === 'Dokter' || s.name === activeDoctor.name)?.id || 'STF-02',
          staffName: activeDoctor.name || 'dr. Anis Prima Dewi',
          role: 'Dokter',
          fee: activeDoctor.feePerPatient || (feeConfig?.doctorFee || 20000)
        }
      ],
      branchId: 'BR-01'
    };

    const finalStaff = newRecord.assignedStaff || [];

    let newPrescription: EPrescription | undefined = undefined;
    if (presItems.length > 0) {
      newPrescription = {
        id: rxId,
        rmId: currentPatient.rmId,
        patientName: currentPatient.name,
        doctorName: activeDoctor.name,
        items: presItems,
        status: 'Pending Skrining',
        timestamp: timeNow,
        assignedStaff: finalStaff,
        screeningChecks: {
          admin: { namaDokter: true, sip: true, tglResep: true, paraf: true },
          farmasetik: { bentukSediaan: true, dosis: true, stabilitas: true, kompatibilitas: true },
          klinis: { tepatDosis: true, tepatWaktu: true, kontraIndikasi: true, interaksi: true }
        },
        branchId: 'BR-01'
      };
    }

    onSaveRME(newRecord, newPrescription);
    onFinishQueue(currentPatient.nomor);

    // Reset inputs
    setSoapS('');
    setSoapO('');
    setSoapA('');
    setSoapP('');
    setSelectedIcds([{ code: 'J00', name: 'Acute nasopharyngitis [common cold]' }]);
    setIcdSearch('');
    setPresItems([]);

    alert(
      `Pemeriksaan RME (${recordId}) berhasil disimpan! ${
        newPrescription ? `Resep digital (${rxId}) telah dikirimkan ke Farmasi.` : ''
      }`
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Active Doctor & Patient Queue Info */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">{activeDoctor.name}</h3>
            <p className="text-xs text-sky-400 font-medium">
              SIP: {activeDoctor.sip} · {activeDoctor.specialization}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Antrean Pasien:</span>
          <select
            value={selectedQueueNomor}
            onChange={(e) => setSelectedQueueNomor(e.target.value)}
            className="p-2 rounded-xl bg-slate-800 text-white font-bold border border-slate-700 outline-none"
          >
            {queue.map((q) => (
              <option key={q.nomor} value={q.nomor}>
                {q.nomor} - {q.name} ({q.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Patient Overview Card (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <span className="font-mono font-black text-sky-700 text-base">
                    {currentPatient.nomor}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {currentPatient.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingVital(!isEditingVital)}
                      className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                      title="Edit Tanda Vital & Info Pasien"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    RM: <strong className="font-mono text-slate-700">{currentPatient.rmId}</strong> · {currentPatient.gender}, {currentPatient.age} thn
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                    {currentPatient.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingVital(!isEditingVital)}
                    className="p-1.5 bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 rounded-lg transition cursor-pointer"
                    title="Edit Tanda-Tanda Vital & Data Pasien"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Toast Notifikasi Simpan Vital */}
              {saveVitalToast && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{saveVitalToast}</span>
                  </span>
                  <button onClick={() => setSaveVitalToast(null)} className="text-emerald-500 hover:text-emerald-800">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Tanda Vital Box dengan Tombol Icon Edit */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                    Hasil Tanda-Tanda Vital:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingVital(!isEditingVital)}
                    className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-2xs"
                    title="Edit Nilai Tanda-Tanda Vital Pasien"
                  >
                    <Pencil className="w-3 h-3 text-sky-600" />
                    <span>{isEditingVital ? 'Tutup' : 'Edit Vital'}</span>
                  </button>
                </div>

                {isEditingVital ? (
                  <form onSubmit={handleSaveVitalChanges} className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">TD (mmHg)</label>
                        <input
                          type="text"
                          value={editedVital.td}
                          onChange={(e) => setEditedVital({ ...editedVital, td: e.target.value })}
                          className="w-full p-1.5 border rounded-lg font-mono font-bold bg-white text-slate-900 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="120/80"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Suhu (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editedVital.suhu}
                          onChange={(e) => setEditedVital({ ...editedVital, suhu: parseFloat(e.target.value) || 36.5 })}
                          className="w-full p-1.5 border rounded-lg font-mono font-bold bg-white text-slate-900 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="36.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nadi (bpm)</label>
                        <input
                          type="number"
                          value={editedVital.nadi}
                          onChange={(e) => setEditedVital({ ...editedVital, nadi: parseInt(e.target.value) || 80 })}
                          className="w-full p-1.5 border rounded-lg font-mono font-bold bg-white text-slate-900 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="80"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">SpO2 (%)</label>
                        <input
                          type="number"
                          value={editedVital.spo2}
                          onChange={(e) => setEditedVital({ ...editedVital, spo2: parseInt(e.target.value) || 98 })}
                          className="w-full p-1.5 border rounded-lg font-mono font-bold bg-white text-slate-900 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="98"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">BB (kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editedVital.bb ?? ''}
                          onChange={(e) => setEditedVital({ ...editedVital, bb: parseFloat(e.target.value) || undefined })}
                          className="w-full p-1.5 border rounded-lg font-mono font-bold bg-white text-slate-900 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="60"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">TB (cm)</label>
                        <input
                          type="number"
                          value={editedVital.tb ?? ''}
                          onChange={(e) => setEditedVital({ ...editedVital, tb: parseFloat(e.target.value) || undefined })}
                          className="w-full p-1.5 border rounded-lg font-mono font-bold bg-white text-slate-900 outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="165"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingVital(false)}
                        className="px-2.5 py-1 text-slate-500 hover:bg-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>Simpan Perubahan</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div>TD: <strong className="text-slate-900">{editedVital.td} mmHg</strong></div>
                    <div>Suhu: <strong className="text-slate-900">{editedVital.suhu}°C</strong></div>
                    <div>Nadi: <strong className="text-slate-900">{editedVital.nadi} bpm</strong></div>
                    <div>SpO2: <strong className="text-slate-900">{editedVital.spo2}%</strong></div>
                    {editedVital.bb && <div>BB: <strong className="text-slate-900">{editedVital.bb} kg</strong></div>}
                    {editedVital.tb && <div>TB: <strong className="text-slate-900">{editedVital.tb} cm</strong></div>}
                  </div>
                )}
              </div>

              {/* Keluhan Awal */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sky-900 block">Keluhan Awal Pasien:</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingVital(!isEditingVital)}
                    className="p-1 rounded text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                    title="Edit Keluhan Awal"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {isEditingVital ? (
                  <textarea
                    rows={2}
                    value={editedComplaint}
                    onChange={(e) => setEditedComplaint(e.target.value)}
                    className="w-full p-2 border border-sky-200 rounded-lg text-xs bg-white text-slate-800 outline-none"
                    placeholder="Tuliskan keluhan awal pasien..."
                  />
                ) : (
                  <p className="text-slate-700 italic">{editedComplaint || currentPatient.complaint}</p>
                )}
              </div>

              {/* Allergy Warning */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Peringatan Alergi Pasien:
                </span>
                <p className="font-bold text-rose-900">
                  {patientAllergy || 'Tidak Ada Riwayat Alergi'}
                </p>
              </div>

              {/* Petugas yang Bertugas (Multi-Pilih Data Pegawai) */}
              <div className="p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-xl border border-indigo-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-950 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Petugas / Pegawai Bertugas:
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    {assignedStaffItems.length} Petugas Dipilih
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  Pilih nama petugas/tim medis yang menangani pasien (bisa pilih lebih dari satu petugas).
                </p>

                {/* List Pegawai dari Data Pegawai */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {(staffList.length > 0
                    ? staffList
                    : [
                        { id: 'STF-01', name: 'apt. Mardin, S.Farm', role: 'Super Admin / APJ' },
                        { id: 'STF-02', name: 'dr. Anis Prima Dewi', role: 'Dokter' },
                        { id: 'STF-03', name: 'Ns. Siti Nurhaliza, S.Kep', role: 'Perawat / Bidan' },
                        { id: 'STF-04', name: 'Rina Kartika, A.Md.Farm', role: 'Apoteker' }
                      ]
                  ).map((st) => {
                    const isChecked = selectedStaffIds.includes(st.id);
                    return (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-400'
                            : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStaffSelection(st.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block text-[11px] leading-tight">
                              {st.name}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-medium">
                              {st.role}
                            </span>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5 text-indigo-600" />
                            Bertugas
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Ringkasan Tim Petugas Bertugas */}
                <div className="pt-2 border-t border-indigo-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 text-[11px]">
                    Status Tim Petugas:
                  </span>
                  <span className="font-bold text-indigo-700 text-xs">
                    {assignedStaffItems.length > 0 ? `${assignedStaffItems.length} Pegawai Bertugas` : 'Belum Dipilih'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical SOAP & E-Prescribing Workspace (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                  Lembar Pemeriksaan Rekam Medis Elektronik (RME - SOAP)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Dokumentasi rekam medis terstandar & peresepan elektronik langsung terhubung farmasi
                </p>
              </div>

              {/* Edit Icon Button for SOAP workspace */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Pilih atau sesuaikan template klinis SOAP siap pakai"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Template & Edit SOAP</span>
                </button>
              </div>
            </div>

            {/* Subjective */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  S - Subjective (Anamnesis & Keluhan Pasien) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  title="Edit anamnesis dengan template klinis"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Edit/Template</span>
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="Deskripsi keluhan pasien, riwayat penyakit sekarang, onset, dan gejala yang dirasakan..."
                value={soapS}
                onChange={(e) => setSoapS(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Objective with Ambil Hasil Lab Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  O - Objective (Pemeriksaan Fisik & Penunjang) *
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    title="Gunakan format template pemeriksaan fisik"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Template Fisik</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFetchLabResults}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Ambil hasil lab dan catat otomatis ke kolom Objektif"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                    <span>Ambil Hasil Lab</span>
                    {patientLabRecords.length > 0 && (
                      <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {patientLabRecords.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {labToastMessage && (
                <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-[11px] font-bold flex items-center justify-between animate-fade-in">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                    <span>{labToastMessage}</span>
                  </span>
                  <button onClick={() => setLabToastMessage(null)} className="text-purple-400 hover:text-purple-700">
                    ✕
                  </button>
                </div>
              )}

              <textarea
                rows={3}
                placeholder="Keadaan umum, kepala/leher, thoraks, cor/pulmo, abdomen, ekstremitas, hasil lab/alat..."
                value={soapO}
                onChange={(e) => setSoapO(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none leading-relaxed font-sans"
              />

              {/* Lab Selector Modal if multiple lab documents exist for this patient */}
              {showLabSelectorModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-purple-600" />
                        <h4 className="font-extrabold text-slate-900 text-xs">
                          Pilih Hasil Lab Pasien: {currentPatient?.name}
                        </h4>
                      </div>
                      <button
                        onClick={() => setShowLabSelectorModal(false)}
                        className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Ditemukan {patientLabRecords.length} dokumen hasil lab untuk pasien ini. Pilih dokumen yang ingin dicatat ke kolom Objektif:
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {patientLabRecords.map((lab) => (
                        <div
                          key={lab.id}
                          className="p-3 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 rounded-xl transition space-y-1.5"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono font-bold text-purple-700 text-[10px]">
                              {lab.id} · {lab.date} ({lab.time} WIB)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApplyLabToObjective(lab)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] rounded-lg transition"
                            >
                              Catat ke Objektif
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium">
                            {lab.items.map((it) => `${it.parameter}: ${it.result} ${it.unit}`).join(', ')}
                          </div>
                          {lab.conclusion && (
                            <div className="text-[10px] text-slate-500 italic">
                              "{lab.conclusion}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowLabSelectorModal(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Assessment & Multi-Select ICD-10 Search */}
            <div className="relative space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-xs font-bold text-slate-700">
                  A - Assessment (Diagnosis &amp; Kode ICD-10 — Bisa Pilih Lebih dari Satu) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-extrabold text-[10px] border border-sky-200">
                    {selectedIcds.length} Diagnosa ICD-10 Dipilih
                  </span>
                  {selectedIcds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIcds([]);
                        setSoapA('');
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Reset Diagnosa
                    </button>
                  )}
                </div>
              </div>

              {/* Selected ICD-10 Badges (Multi-Diagnosis List) */}
              {selectedIcds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl">
                  {selectedIcds.map((icd, idx) => (
                    <div
                      key={`${icd.code}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-sky-300 shadow-2xs text-xs"
                    >
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          idx === 0
                            ? 'bg-sky-600 text-white'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {idx === 0 ? 'Utama' : `Sekunder ${idx}`}
                      </span>
                      <span className="font-mono font-black text-sky-800 text-[11px]">
                        {icd.code}
                      </span>
                      <span className="font-bold text-slate-800 text-[11px]">
                        {icd.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedIcd(icd.code)}
                        className="ml-0.5 p-0.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title={`Hapus diagnosa ${icd.code}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search & Multi-Select Dropdown Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari & pilih satu atau lebih kode penyakit / diagnosis ICD-10..."
                  value={icdSearch}
                  onChange={(e) => {
                    setIcdSearch(e.target.value);
                    setShowIcdDropdown(true);
                  }}
                  onFocus={() => setShowIcdDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && icdSearch.trim()) {
                      e.preventDefault();
                      if (filteredIcd.length === 1) {
                        handleToggleIcd(filteredIcd[0]);
                        setIcdSearch('');
                      } else {
                        handleAddCustomIcdFromSearch();
                      }
                    }
                  }}
                  className="w-full pl-9 pr-24 py-2 border rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowIcdDropdown(!showIcdDropdown)}
                  className="absolute right-2 top-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer transition"
                >
                  {showIcdDropdown ? 'Tutup List' : 'Pilih ICD-10'}
                </button>
              </div>

              {showIcdDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between text-[11px]">
                    <span className="font-bold">
                      Centang / Klik untuk memilih lebih dari satu Diagnosa ICD-10 ({selectedIcds.length} dipilih)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowIcdDropdown(false)}
                      className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] cursor-pointer"
                    >
                      Selesai Pilih
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {filteredIcd.map((icd) => {
                      const isSelected = selectedIcds.some((item) => item.code === icd.code);
                      return (
                        <div
                          key={icd.code}
                          onClick={() => handleToggleIcd(icd)}
                          className={`p-2.5 cursor-pointer text-xs font-medium transition-colors flex justify-between items-center ${
                            isSelected ? 'bg-sky-50/90 hover:bg-sky-100/80' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 accent-sky-600 rounded cursor-pointer pointer-events-none"
                            />
                            <span className={isSelected ? 'font-extrabold text-sky-950' : 'text-slate-800'}>
                              {icd.name}
                            </span>
                          </div>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-sky-600 text-white border-sky-700'
                                : 'text-sky-700 bg-sky-50 border-sky-200'
                            }`}
                          >
                            {icd.code}
                          </span>
                        </div>
                      );
                    })}

                    {icdSearch.trim() !== '' && (
                      <div
                        onClick={handleAddCustomIcdFromSearch}
                        className="p-2.5 bg-emerald-50/70 hover:bg-emerald-100/80 cursor-pointer text-xs font-bold text-emerald-900 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Tambahkan diagnosa manual: "{icdSearch.trim()}"</span>
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-extrabold">
                          + Tambah
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ringkasan Assessment / Catatan Diagnosa Tambahan */}
              <div>
                <input
                  type="text"
                  placeholder="Ringkasan diagnosis utama & sekunder (otomatis terisi dari pilihan ICD-10 di atas, dapat disunting)..."
                  value={soapA}
                  onChange={(e) => setSoapA(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none text-slate-800"
                />
              </div>
            </div>

            {/* Plan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                P - Plan (Rencana Terapi Non-Farmakologis & Edukasi Pasien)
              </label>
              <input
                type="text"
                placeholder="Edukasi diet, istirahat cukup, jadwal kontrol ulang bila keluhan berlanjut..."
                value={soapP}
                onChange={(e) => setSoapP(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            {/* Digital E-Prescribing Section */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-sky-600" />
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                    Resep Obat Elektronik (E-Prescription Terpadu)
                  </h4>
                </div>
              </div>

              {/* Medicine Autocomplete Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari obat dari stok apotek (ketik nama obat)..."
                  value={medSearch}
                  onChange={(e) => {
                    setMedSearch(e.target.value);
                    setShowMedDropdown(true);
                  }}
                  onFocus={() => setShowMedDropdown(true)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />

                {showMedDropdown && filteredMeds.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y">
                    {filteredMeds.map((med) => (
                      <div
                        key={med.id}
                        onClick={() => handleAddMedToPrescription(med)}
                        className="p-2.5 hover:bg-sky-50 cursor-pointer text-xs transition-colors flex justify-between items-center"
                      >
                        <div>
                          <strong className="text-slate-800 block">{med.name}</strong>
                          <span className="text-[10px] text-slate-500">
                            Stok: <strong className="text-emerald-700">{med.stock} {med.satuanKecil || med.unit}</strong> · {med.category}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-sky-700">
                          Rp {(med.sellPriceKlinik || med.sellPrice).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prescription Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Nama Obat</th>
                      <th className="p-2.5 w-20 text-center">Jumlah</th>
                      <th className="p-2.5">Signa / Aturan Minum</th>
                      <th className="p-2.5 w-12 text-center">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {presItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                          Belum ada obat yang dimasukkan ke dalam resep.
                        </td>
                      </tr>
                    ) : (
                      presItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5">
                            <strong className="text-slate-900 block">{item.name}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">
                              @ Rp {item.price.toLocaleString('id-ID')} / {item.unit}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const copy = [...presItems];
                                copy[idx].qty = val;
                                setPresItems(copy);
                              }}
                              className="w-14 p-1 border rounded font-mono font-bold text-center bg-white"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.dosage}
                              onChange={(e) => {
                                const copy = [...presItems];
                                copy[idx].dosage = e.target.value;
                                setPresItems(copy);
                              }}
                              className="w-full p-1 border rounded bg-white text-xs font-semibold"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleRemovePresItem(idx)}
                              className="text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save & Submit Button */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleSaveAndSend}
                className="py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Simpan RME & Terbitkan E-Resep ke Farmasi</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
          <User className="w-10 h-10 mx-auto text-slate-300" />
          <h4 className="font-extrabold text-slate-700 text-sm">
            Tidak Ada Antrean Pasien Aktif
          </h4>
          <p className="text-xs">Silakan check-in pasien baru melalui modul Front Office.</p>
        </div>
      )}

      {/* Modal Template & Editor SOAP Klinis */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide">
                    Pilih & Sunting Template SOAP Klinis
                  </h3>
                  <p className="text-[11px] text-sky-100 font-medium">
                    Template standar mempercepat input rekam medis dengan format anamnesis dan fisik lengkap
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-600">
                Pilih salah satu template di bawah untuk otomatis mengisi formulir SOAP (Subjective, Objective, Assessment ICD-10, & Plan Edukasi):
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SOAP_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.code}
                    type="button"
                    onClick={() => handleApplySoapTemplate(tmpl)}
                    className="text-left p-3.5 border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 rounded-xl transition group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-sky-700">
                          {tmpl.title}
                        </span>
                        <span className="text-[10px] bg-sky-100 text-sky-800 font-mono font-bold px-1.5 py-0.5 rounded">
                          {tmpl.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                        {tmpl.s}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-sky-600 font-bold">
                      <span>Terapkan ke Formulir</span>
                      <Edit2 className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Quick Preset for General Checkup */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900">
                  <span className="font-bold">Tips Pengisian:</span> Memilih template tidak akan menghapus resep obat yang sudah dimasukkan. Anda dapat tetap menyesuaikan kembali rincian teks setelah diterapkan.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
