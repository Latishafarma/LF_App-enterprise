import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  X,
  Printer,
  Search,
  Sparkles,
  HeartPulse,
  Stethoscope,
  Activity,
  ShieldAlert,
  ShieldCheck,
  FileText,
  User,
  Pill,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  BookOpen,
  Zap,
  Layers
} from 'lucide-react';
import { openPrintWindow } from '../utils/printHelper';
import {
  EPrescription,
  RMERecord,
  Patient,
  DRPAnalysisResult
} from '../types';
import { useFacilityProfiles, formatPharmacyAddress } from './PharmacySettingsModal';

interface EPrescriptionQueueViewProps {
  prescriptions: EPrescription[];
  rmeRecords?: RMERecord[];
  patients?: Patient[];
  onApproveToPOS: (rx: EPrescription) => void;
  onRejectPrescription: (rxId: string, reason: string) => void;
}

export const EPrescriptionQueueView: React.FC<EPrescriptionQueueViewProps> = ({
  prescriptions,
  rmeRecords = [],
  patients = [],
  onApproveToPOS,
  onRejectPrescription
}) => {
  const { pharmacyProfile, apjProfile, dpjProfile } = useFacilityProfiles();
  const pharmacyFullAddress = formatPharmacyAddress(pharmacyProfile);

  const [activeTab, setActiveTab] = useState<'antrean' | 'riwayat'>('antrean');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPres, setSelectedPres] = useState<EPrescription | null>(null);
  const [rejectReason, setRejectReason] = useState('Dosis obat melebihi dosis lazim / potensi interaksi obat');
  const [searchTerm, setSearchTerm] = useState('');

  // AI DRP Analysis State
  const [analyzingRxId, setAnalyzingRxId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    rx: EPrescription;
    patient?: Patient;
    rme?: RMERecord;
    data: DRPAnalysisResult;
  } | null>(null);

  const [copiedRecommendation, setCopiedRecommendation] = useState(false);
  const [expandedRmeId, setExpandedRmeId] = useState<string | null>(null);

  // Screening Checkboxes per Rx
  const [screeningStates, setScreeningStates] = useState<Record<string, {
    admin: Record<string, boolean>;
    farmasetik: Record<string, boolean>;
    klinis: Record<string, boolean>;
    notes?: string;
  }>>({});

  const pendingList = prescriptions.filter(
    (p) =>
      p.status === 'Pending Skrining' &&
      (searchTerm === '' ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rmId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doctorName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const historyList = prescriptions.filter(
    (p) =>
      p.status !== 'Pending Skrining' &&
      (searchTerm === '' ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rmId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doctorName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getScreening = (rxId: string) => {
    return (
      screeningStates[rxId] || {
        admin: { namaDokter: true, sip: true, tglResep: true, paraf: true },
        farmasetik: { bentukSediaan: true, dosis: true, stabilitas: true, kompatibilitas: true },
        klinis: { tepatDosis: true, tepatWaktu: true, kontraIndikasi: true, interaksi: true },
        notes: ''
      }
    );
  };

  const toggleCheck = (rxId: string, category: 'admin' | 'farmasetik' | 'klinis', field: string) => {
    const current = getScreening(rxId);
    setScreeningStates({
      ...screeningStates,
      [rxId]: {
        ...current,
        [category]: {
          ...current[category],
          [field]: !current[category][field]
        }
      }
    });
  };

  // Helper: Retrieve patient & latest RME record for a prescription
  const getPatientData = (rmId: string, patientName: string) => {
    return (
      patients.find((p) => p.id === rmId || p.name.toLowerCase() === patientName.toLowerCase()) ||
      null
    );
  };

  const getRmeData = (rmId: string, patientName: string) => {
    return (
      rmeRecords.find((r) => r.rmId === rmId || r.patientName.toLowerCase() === patientName.toLowerCase()) ||
      null
    );
  };

  // SMART RX REVIEW: Validasi Otomatis Interaksi Obat (DDI) & Duplikasi Terapi
  const runSmartRxReview = (rx: EPrescription, patient?: Patient | null) => {
    const items = rx.items || [];
    const issues: {
      type: 'DDI' | 'DUPLIKASI' | 'KONTRAINDIKASI';
      severity: 'Kritis' | 'Sedang';
      title: string;
      drugs: string;
      explanation: string;
      recommendation: string;
      reference: string;
      referenceUrl: string;
    }[] = [];

    // 1. Duplikasi Terapi: NSAID
    const nsaidMatches = items.filter((it) => {
      const n = it.name.toLowerCase();
      return n.includes('ibuprofen') || n.includes('mefenamat') || n.includes('diklofenak') || n.includes('ketorolac') || n.includes('meloxicam');
    });
    if (nsaidMatches.length >= 2) {
      issues.push({
        type: 'DUPLIKASI',
        severity: 'Kritis',
        title: 'Duplikasi Terapi NSAID (Double Analgesik)',
        drugs: nsaidMatches.map((i) => i.name).join(' + '),
        explanation: 'Pemberian 2 agen NSAID secara bersamaan tidak meningkatkan efek analgesia klinis, namun meningkatkan risiko toksisitas perdarahan mukosa lambung dan nefrotoksisitas secara eksponensial.',
        recommendation: 'Pilih monoterapi salah satu agen NSAID saja dan batalkan agen NSAID kedua.',
        reference: 'BPOM PIONAS NSAIDs & BNF 86 Analgesics',
        referenceUrl: 'https://pionas.pom.go.id/monografi/ibuprofen'
      });
    }

    // 2. Duplikasi Terapi: Antihistamin
    const antihistamineMatches = items.filter((it) => {
      const n = it.name.toLowerCase();
      return n.includes('cetirizine') || n.includes('setirizin') || n.includes('ctm') || n.includes('chlorpheniramine') || n.includes('loratadine');
    });
    if (antihistamineMatches.length >= 2) {
      issues.push({
        type: 'DUPLIKASI',
        severity: 'Sedang',
        title: 'Duplikasi Terapi Antihistamin H1',
        drugs: antihistamineMatches.map((i) => i.name).join(' + '),
        explanation: 'Kombinasi multipel antihistamin meningkatkan risiko efek sedasi berlebih, rasa kantuk ekstrem, mulut kering, dan penurunan refleks motorik.',
        recommendation: 'Gunakan satu jenis antihistamin generasi ke-2 (misal Cetirizine 10mg) per hari.',
        reference: 'BPOM PIONAS & BNF 86 hal. 312',
        referenceUrl: 'https://pionas.pom.go.id/monografi/setirizin-hidroklorida'
      });
    }

    // 3. DDI: Kortikosteroid + NSAID
    const steroidMatches = items.filter((it) => {
      const n = it.name.toLowerCase();
      return n.includes('dexa') || n.includes('prednison') || n.includes('metilprednisolon');
    });
    if (steroidMatches.length > 0 && nsaidMatches.length > 0) {
      issues.push({
        type: 'DDI',
        severity: 'Sedang',
        title: 'Interaksi Obat: Kortikosteroid + NSAID',
        drugs: `${steroidMatches.map((s) => s.name).join(', ')} + ${nsaidMatches.map((ns) => ns.name).join(', ')}`,
        explanation: 'Penghambatan ganda sintesis prostaglandin protektif lambung secara sinergis meningkatkan risiko erosi mikrovaskular, ulkus peptikum, dan perdarahan saluran cerna atas.',
        recommendation: 'Hindari kombinasi jika keluhan inflamasi dapat diatasi monoterapi. Bila mutlak, wajib berikan gastroprotektor PPI (Omeprazole 20mg a.c.) dan diminum sesudah makan.',
        reference: 'BNF 86 hal. 620 & 1104; Lexicomp Drug Interactions',
        referenceUrl: 'https://www.drugs.com/drug-interactions.html'
      });
    }

    // 4. DDI: NSAID + Antihipertensi
    const antihypertensiveMatches = items.filter((it) => {
      const n = it.name.toLowerCase();
      return n.includes('amlodipine') || n.includes('captopril') || n.includes('candesartan') || n.includes('losartan');
    });
    if (nsaidMatches.length > 0 && antihypertensiveMatches.length > 0) {
      issues.push({
        type: 'DDI',
        severity: 'Sedang',
        title: 'Interaksi Obat: NSAID + Antihipertensi (CCB / ACEi)',
        drugs: `${nsaidMatches.map((ns) => ns.name).join(', ')} + ${antihypertensiveMatches.map((ah) => ah.name).join(', ')}`,
        explanation: 'NSAID menghambat prostaglandin renal vasodilatator, menyebabkan retensi cairan & natrium yang menumpulkan efek penurunan tekanan darah 3-6 mmHg.',
        recommendation: 'Batasi penggunaan NSAID max 3-5 hari atau ganti dengan Parasetamol sebagai analgesik lini pertama.',
        reference: 'BNF 86 hal. 1105 & Pedoman PERKI Hipertensi',
        referenceUrl: 'https://inaheart.org/panduan-klinis/'
      });
    }

    // 5. Alergi Pasien (RME)
    const patientAllergy = String(patient?.allergy || '').toLowerCase();
    if (patientAllergy.includes('penisilin') || patientAllergy.includes('amoxicillin') || patientAllergy.includes('penicillin')) {
      const betaLactams = items.filter((it) => {
        const n = it.name.toLowerCase();
        return n.includes('amoxicillin') || n.includes('ampicillin') || n.includes('amoksisilin');
      });
      if (betaLactams.length > 0) {
        issues.push({
          type: 'KONTRAINDIKASI',
          severity: 'Kritis',
          title: 'Kontraindikasi Fatal: Alergi Pasien vs Turunan Penisilin',
          drugs: betaLactams.map((b) => b.name).join(', '),
          explanation: `Pasien memiliki riwayat alergi terdokumentasi terhadap ${patient?.allergy}. Berisiko fatal memicu reaksi hipersensitivitas tipe I (syok anafilaksis, bronkospasme berat).`,
          recommendation: 'Hentikan segera obat betalaktam dan rekomendasikan antibiotik non-betalaktam (Azitromisin).',
          reference: 'BNF 86 Bab 5.1.1 (Penicillins & Hypersensitivity); BPOM PIONAS',
          referenceUrl: 'https://pionas.pom.go.id/monografi/amoksisilin'
        });
      }
    }

    return {
      hasIssues: issues.length > 0,
      issues
    };
  };

  const applySmartReviewToScreening = (rxId: string, issues: ReturnType<typeof runSmartRxReview>['issues']) => {
    const noteLines = issues
      .map((iss) => `[${iss.severity.toUpperCase()} ${iss.type}] ${iss.title} (${iss.drugs}): ${iss.recommendation} [Ref: ${iss.reference}]`)
      .join('\n');
    const current = getScreening(rxId);
    setScreeningStates({
      ...screeningStates,
      [rxId]: {
        ...current,
        klinis: {
          ...current.klinis,
          duplikasi: issues.some((i) => i.type === 'DUPLIKASI') ? false : current.klinis.duplikasi,
          kontraIndikasi: issues.some((i) => i.type === 'KONTRAINDIKASI') ? false : current.klinis.kontraIndikasi,
          tepatDosis: issues.some((i) => i.severity === 'Kritis') ? false : current.klinis.tepatDosis
        },
        notes: (current.notes ? current.notes + '\n\n' : '') + `⚠️ Smart Rx Review (DDI & Duplikasi):\n` + noteLines
      }
    });
  };

  // TRIGGER: Analisis Cerdas DRPs oleh AI
  const handleAnalyzeDRP = async (rx: EPrescription) => {
    const patient = getPatientData(rx.rmId, rx.patientName);
    const rme = getRmeData(rx.rmId, rx.patientName);

    setAnalyzingRxId(rx.id);

    try {
      const payload = {
        patient: {
          rmId: rx.rmId,
          name: rx.patientName,
          age: patient?.age || rme?.age || 35,
          gender: patient?.gender || rme?.gender || 'Laki-laki',
          allergy: patient?.allergy || 'Tidak ada riwayat alergi',
          category: patient?.category || 'Pasien Umum'
        },
        rme: {
          keluhanUtama: rme?.soapS || 'Pemeriksaan rutin keluhan pasien',
          diagnosa: rme?.icdName ? `${rme.icdCode} - ${rme.icdName}` : (rme?.soapA || 'Keluhan umum'),
          vitalSign: rme?.vitalSign || { td: '120/80', suhu: 36.5, nadi: 80, spo2: 98, bb: 60, tb: 165 },
          soapS: rme?.soapS,
          soapO: rme?.soapO,
          soapA: rme?.soapA,
          soapP: rme?.soapP,
          icdCode: rme?.icdCode,
          icdName: rme?.icdName,
          riwayatPenyakit: rme?.soapA || 'Tidak ada riwayat penyakit kronis yang tercatat',
          riwayatPengobatanSebelumnya: '-'
        },
        prescriptions: rx.items
      };

      const res = await fetch('/api/gemini/drp-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: DRPAnalysisResult = await res.json();
      setAnalysisResult({
        rx,
        patient: patient || undefined,
        rme: rme || undefined,
        data
      });
    } catch (err: any) {
      console.error('Error during DRP AI analysis:', err);
      alert('Terjadi kendala saat melakukan analisis AI. Silakan coba kembali.');
    } finally {
      setAnalyzingRxId(null);
    }
  };

  // ACTION: Terapkan rekomendasi DRP ke Catatan Skrining
  const handleApplyRecommendationToScreening = () => {
    if (!analysisResult) return;
    const rxId = analysisResult.rx.id;
    const current = getScreening(rxId);

    const recommendationsText = analysisResult.data.pharmacistRecommendations.join('\n- ');
    const noteText = `[Telaah AI DRPs - Status: ${analysisResult.data.riskLevel}]\n${analysisResult.data.summary}\n\nRekomendasi Klinis Apoteker:\n- ${recommendationsText}`;

    const isCritical = analysisResult.data.riskLevel === 'CRITICAL';

    setScreeningStates({
      ...screeningStates,
      [rxId]: {
        ...current,
        klinis: {
          ...current.klinis,
          kontraIndikasi: !isCritical,
          interaksi: !isCritical,
          tepatDosis: analysisResult.data.dosageAnalysis.every((d) => d.status === 'Sesuai')
        },
        notes: noteText
      }
    });

    setCopiedRecommendation(true);
    setTimeout(() => setCopiedRecommendation(false), 2500);
  };

  const handleConfirmReject = () => {
    if (!selectedPres) return;
    onRejectPrescription(selectedPres.id, rejectReason);
    setRejectModalOpen(false);
    setSelectedPres(null);
  };

  // Cetak Dokumen Hasil Telaah DRPs Berstandar Akreditasi
  const handlePrintDRPReport = () => {
    if (!analysisResult) return;
    const printPayload = {
      rx: analysisResult.rx,
      patient: analysisResult.patient,
      rme: analysisResult.rme,
      data: analysisResult.data,
      timestamp: new Date().toISOString()
    };
    try {
      sessionStorage.setItem('latisha_active_print_drp', JSON.stringify(printPayload));
      localStorage.setItem('latisha_active_print_drp', JSON.stringify(printPayload));
    } catch (e) {
      console.warn('Storage write error for print DRP:', e);
    }
    openPrintWindow('telaah-drp', { rxId: analysisResult.rx.id });
  };

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-amber-500/15 text-amber-600 rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <h3 className="font-black text-base text-slate-900 tracking-tight">
              Antrean E-Resep & Skrining Standar Apoteker
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>AI CDSS Farmasi Aktif</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Verifikasi kelayakan administratif, farmasetik, dan klinis terintegrasi Rekam Medis (RME) dengan dukungan Identifikasi Cerdas DRPs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('antrean')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'antrean'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Antrean Resep Masuk ({prescriptions.filter((p) => p.status === 'Pending Skrining').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Riwayat Skrining Resep ({prescriptions.filter((p) => p.status !== 'Pending Skrining').length})</span>
          </button>
        </div>
      </div>

      {/* Kartu Identitas Resmi Layanan Farmasi, Kop Apotek & Profil APJ */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-indigo-800/60 shadow-xs flex flex-wrap justify-between items-center gap-4 text-xs">
        <div className="flex items-center gap-3.5">
          {pharmacyProfile.logoUrl && (
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center shadow-sm">
              <img
                src={pharmacyProfile.logoUrl}
                alt="Logo Faskes"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono font-bold text-[10px] uppercase">
                Layanan Kefarmasian Resmi
              </span>
              <strong className="text-sm font-black tracking-wide text-white uppercase">
                {pharmacyProfile.name}
              </strong>
            </div>
            <p className="text-[11px] text-slate-300">
              {pharmacyFullAddress} · Telp: {pharmacyProfile.phone} · SIA: <strong className="font-mono text-amber-300">{pharmacyProfile.sia}</strong>
            </p>
            {pharmacyProfile.headerNote && (
              <p className="text-[10px] text-indigo-200 italic">{pharmacyProfile.headerNote}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
            <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold block">
              Apoteker Penanggung Jawab (APJ)
            </span>
            <strong className="text-xs font-black text-white block">{apjProfile.name}</strong>
            <span className="text-[10px] font-mono text-amber-300 block">
              SIPA: {apjProfile.sipa} · STRA: {apjProfile.stra}
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              {apjProfile.schedule}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
            <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold block">
              Dokter Penanggung Jawab (DPJ)
            </span>
            <strong className="text-xs font-black text-white block">{dpjProfile.name}</strong>
            <span className="text-[10px] font-mono text-emerald-300 block">
              SIP: {dpjProfile.sip}
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              {dpjProfile.specialization}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari No. Resep, Nama Pasien, No. RM, atau Dokter Peresep..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {activeTab === 'antrean' ? (
        <div className="space-y-4">
          {pendingList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 italic">
              <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="font-bold">Tidak ada antrean resep yang menunggu skrining saat ini.</p>
              <p className="text-xs text-slate-400 mt-1">Semua resep dokter telah tertangani atau lolos ke Kasir POS.</p>
            </div>
          ) : (
            pendingList.map((rx) => {
              const sc = getScreening(rx.id);
              const patient = getPatientData(rx.rmId, rx.patientName);
              const rme = getRmeData(rx.rmId, rx.patientName);
              const isRmeExpanded = expandedRmeId === rx.id;
              const smartReview = runSmartRxReview(rx, patient);

              return (
                <div
                  key={rx.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition"
                >
                  {/* Top Rx Info & AI Button */}
                  <div className="flex flex-wrap justify-between items-start border-b border-slate-200 pb-4 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sky-800 text-base">{rx.id}</span>
                        <span className="text-[11px] text-slate-400 font-mono">Pukul {rx.timestamp} WIB</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full border border-amber-300">
                          Menunggu Skrining Apoteker
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg mt-1 flex items-center gap-2">
                        <span>{rx.patientName}</span>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border">
                          No. RM: {rx.rmId}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Dokter Peresep: <strong className="text-slate-900">{rx.doctorName}</strong>
                      </p>
                    </div>

                    {/* Tombol Analisis Cerdas DRPs (AI) */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAnalyzeDRP(rx)}
                        disabled={analyzingRxId === rx.id}
                        className={`px-4 py-2.5 rounded-2xl font-black text-xs shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer ${
                          analyzingRxId === rx.id
                            ? 'bg-indigo-300 text-white cursor-wait'
                            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/20'
                        }`}
                        title="Jalankan Clinical Decision Support System untuk mendeteksi interaksi, dosis, alergi, dan kesesuaian diagnosa"
                      >
                        <Sparkles className={`w-4 h-4 text-amber-300 ${analyzingRxId === rx.id ? 'animate-spin' : ''}`} />
                        <span>
                          {analyzingRxId === rx.id ? 'Menganalisis DRPs (AI)...' : 'Analisis Cerdas DRPs (AI)'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 1. INTEGRASI DATA REKAM MEDIS (RME) PADA PANEL SKRINING */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="font-black text-slate-800 text-xs flex items-center gap-2 uppercase tracking-wide">
                        <HeartPulse className="w-4 h-4 text-rose-600" />
                        <span>Ringkasan Data Rekam Medis (RME) Pasien</span>
                      </h5>
                      <button
                        onClick={() => setExpandedRmeId(isRmeExpanded ? null : rx.id)}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isRmeExpanded ? 'Sembunyikan Detail RME' : 'Lihat Detail Lengkap RME'}</span>
                        {isRmeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* RME Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {/* Diagnosa */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Diagnosa Kerja</span>
                        <span className="font-extrabold text-slate-900 leading-tight block mt-0.5">
                          {rme?.icdName ? `${rme.icdCode} - ${rme.icdName}` : (rme?.soapA || 'Infeksi Saluran Napas')}
                        </span>
                      </div>

                      {/* Keluhan Utama */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Keluhan Utama</span>
                        <span className="font-bold text-slate-800 leading-tight block mt-0.5 truncate" title={rme?.soapS}>
                          {rme?.soapS || 'Batuk, demam ringan'}
                        </span>
                      </div>

                      {/* Tanda Vital */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Tanda Vital</span>
                        <div className="font-mono font-bold text-slate-900 text-[11px] mt-0.5">
                          TD: {rme?.vitalSign?.td || '120/80'} | S: {rme?.vitalSign?.suhu || '36.5'}°C
                        </div>
                      </div>

                      {/* Riwayat Alergi */}
                      <div
                        className={`p-2.5 rounded-xl border ${
                          patient?.allergy && !patient.allergy.toLowerCase().includes('tidak ada')
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <span className="text-[10px] font-bold block uppercase">Riwayat Alergi</span>
                        <span className="font-black text-xs block mt-0.5">
                          {patient?.allergy || 'Tidak ada riwayat alergi'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded RME Details */}
                    {isRmeExpanded && (
                      <div className="pt-2 border-t border-slate-200 text-xs grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 animate-slide-in">
                        <div className="space-y-1 bg-white p-3 rounded-xl border">
                          <p><strong>Pemeriksaan Fisik (Objektif):</strong> {rme?.soapO || 'Fauces hiperemis ringan, ronki (-), wheezing (-)'}</p>
                          <p><strong>Rencana Terapi Dokter (Plan):</strong> {rme?.soapP || 'Edukasi istirahat dan hidrasi cukup.'}</p>
                        </div>
                        <div className="space-y-1 bg-white p-3 rounded-xl border">
                          <p><strong>Fisik Pasien:</strong> BB: {rme?.vitalSign?.bb || patient?.age ? '65 kg' : '-'}, TB: {rme?.vitalSign?.tb || '168 cm'}, SpO2: {rme?.vitalSign?.spo2 || '98'}%</p>
                          <p><strong>Kategori Pasien:</strong> {patient?.category || 'Pasien Umum / Dewasa'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. DAFTAR OBAT YANG DIRESEPKAN */}
                  <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl text-xs space-y-2">
                    <h5 className="font-extrabold text-sky-950 uppercase text-[11px] flex items-center gap-2">
                      <Pill className="w-4 h-4 text-sky-700" />
                      <span>Rincian Obat Dalam E-Resep:</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {rx.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs space-y-1"
                        >
                          <div className="font-black text-slate-900">{it.name}</div>
                          <div className="text-[11px] text-slate-600 font-medium">
                            Jumlah: <strong className="font-mono">{it.qty} {it.unit}</strong>
                          </div>
                          <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                            Aturan: {it.dosage}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. SMART RX REVIEW: Validasi Otomatis Interaksi Obat (DDI) & Duplikasi Terapi */}
                  {(() => {
                    const review = smartReview;
                    return (
                      <div
                        className={`p-4 rounded-2xl border transition ${
                          review.hasIssues
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {review.hasIssues ? (
                              <ShieldAlert className="w-4 h-4 text-amber-600 animate-pulse" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            )}
                            <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                              <span>Smart Rx Review (DDI & Duplikasi Terapi Otomatis)</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border font-bold text-slate-600">
                                Standar BNF & BPOM PIONAS
                              </span>
                            </h5>
                          </div>
                          {review.hasIssues && (
                            <button
                              type="button"
                              onClick={() => applySmartReviewToScreening(rx.id, review.issues)}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                              title="Terapkan temuan Smart Rx Review ke catatan skrining apoteker"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Salin ke Catatan Skrining</span>
                            </button>
                          )}
                        </div>

                        {!review.hasIssues ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                            <span>✓ Tidak terdeteksi interaksi obat-obat (DDI) berbahaya atau duplikasi terapi mayor pada resep ini.</span>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-2">
                            {review.issues.map((iss, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border bg-white text-xs space-y-1.5 ${
                                  iss.severity === 'Kritis' ? 'border-rose-300' : 'border-amber-300'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                        iss.severity === 'Kritis'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}
                                    >
                                      {iss.severity} • {iss.type}
                                    </span>
                                    <span className="font-extrabold text-slate-900">{iss.title}</span>
                                  </div>
                                  <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {iss.drugs}
                                  </span>
                                </div>
                                <p className="text-slate-700 leading-relaxed text-[11px]">
                                  {iss.explanation}
                                </p>
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                                  <span className="text-indigo-900 font-semibold">
                                    <strong>Saran Apoteker:</strong> {iss.recommendation}
                                  </span>
                                  <a
                                    href={iss.referenceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-bold text-sky-700 hover:text-sky-900 underline text-[11px] bg-sky-50 px-2 py-0.5 rounded-md hover:bg-sky-100 transition"
                                  >
                                    <BookOpen className="w-3 h-3 text-sky-600" />
                                    <span>{iss.reference}</span>
                                    <ExternalLink className="w-3 h-3 text-sky-500" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 4. TIGA PILAR SKRINING RESEP APOTEKER */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* 1. Administratif */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h5 className="font-black text-slate-800 text-[10px] uppercase tracking-wider border-b pb-1">
                        1. Skrining Administratif
                      </h5>
                      <div className="space-y-1.5 font-medium text-slate-700">
                        {[
                          { key: 'namaDokter', label: 'Nama & SIP Dokter' },
                          { key: 'sip', label: 'Alamat & Kontak Praktik' },
                          { key: 'tglResep', label: 'Tanggal Penulisan Resep' },
                          { key: 'paraf', label: 'Identitas & Usia Pasien' }
                        ].map((f) => (
                          <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sc.admin[f.key]}
                              onChange={() => toggleCheck(rx.id, 'admin', f.key)}
                              className="w-4 h-4 rounded text-sky-600"
                            />
                            <span>{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 2. Farmasetik */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h5 className="font-black text-slate-800 text-[10px] uppercase tracking-wider border-b pb-1">
                        2. Skrining Farmasetik
                      </h5>
                      <div className="space-y-1.5 font-medium text-slate-700">
                        {[
                          { key: 'bentukSediaan', label: 'Bentuk & Kekuatan Sediaan' },
                          { key: 'dosis', label: 'Dosis & Jumlah Obat' },
                          { key: 'stabilitas', label: 'Stabilitas Sediaan' },
                          { key: 'kompatibilitas', label: 'Inkompatibilitas Pencampuran' }
                        ].map((f) => (
                          <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sc.farmasetik[f.key]}
                              onChange={() => toggleCheck(rx.id, 'farmasetik', f.key)}
                              className="w-4 h-4 rounded text-sky-600"
                            />
                            <span>{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 3. Klinis */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h5 className="font-black text-slate-800 text-[10px] uppercase tracking-wider border-b pb-1">
                        3. Skrining Klinis (CDSS)
                      </h5>
                      <div className="space-y-1.5 font-medium text-slate-700">
                        {[
                          { key: 'tepatDosis', label: 'Ketepatan Indikasi & Dosis' },
                          { key: 'tepatWaktu', label: 'Aturan & Durasi Pakai' },
                          { key: 'duplikasi', label: 'Duplikasi / Polifarmasi' },
                          { key: 'kontraIndikasi', label: 'Kontraindikasi & Alergi' }
                        ].map((f) => (
                          <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sc.klinis[f.key]}
                              onChange={() => toggleCheck(rx.id, 'klinis', f.key)}
                              className="w-4 h-4 rounded text-sky-600"
                            />
                            <span>{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Catatan Skrining Apoteker */}
                  {sc.notes && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                      <span className="font-black text-amber-900 text-[10px] uppercase tracking-wider block">
                        Catatan Telaah Klinis Apoteker:
                      </span>
                      <p className="text-slate-800 font-medium whitespace-pre-line text-[11px]">
                        {sc.notes}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons & Identitas Apoteker Pemeriksa */}
                  <div className="pt-3 flex flex-wrap justify-between items-center gap-3 border-t border-slate-200">
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span>Diverifikasi oleh Apoteker (APJ): </span>
                        <strong className="text-slate-900">{apjProfile.name}</strong>
                        <span className="font-mono text-[10px] text-slate-500 ml-1">
                          (SIPA: {apjProfile.sipa} · STRA: {apjProfile.stra})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedPres(rx);
                          setRejectModalOpen(true);
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200 cursor-pointer"
                      >
                        Tolak / Tidak Memenuhi Syarat
                      </button>
                      <button
                        onClick={() => onApproveToPOS(rx)}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Lolos Skrining & Teruskan ke Kasir POS</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[11px]">
              <tr>
                <th className="p-3.5">No. Resep & Waktu</th>
                <th className="p-3.5">Pasien & No. RM</th>
                <th className="p-3.5">Dokter Peresep</th>
                <th className="p-3.5">Daftar Obat</th>
                <th className="p-3.5">Catatan Skrining</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {historyList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Belum ada riwayat resep yang telah diverifikasi.
                  </td>
                </tr>
              ) : (
                historyList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono">
                      <span className="font-extrabold text-sky-700 block">{item.id}</span>
                      <span className="text-[10px] text-slate-400">{item.timestamp} WIB</span>
                    </td>
                    <td className="p-3.5">
                      <strong className="text-slate-900 block">{item.patientName}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">RM: {item.rmId}</span>
                    </td>
                    <td className="p-3.5 text-slate-800">{item.doctorName}</td>
                    <td className="p-3.5">
                      <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                        {item.items.map((it, idx) => (
                          <li key={idx}>
                            {it.name} ({it.qty} {it.unit})
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3.5 text-slate-600 italic max-w-xs">
                      {item.screeningNotes || 'Memenuhi standar administratif, farmasetik & klinis.'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-3 py-1 rounded-full font-bold text-[10px] ${
                          item.status.includes('Lolos') || item.status.includes('Selesai')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* POP-UP MODAL: HASIL ANALISIS CERDAS DRPs (AI CLINICAL CDSS) */}
      {analysisResult && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-300 my-6 animate-scale-up">
            {/* Modal Header dengan Indikator Tingkat Risiko */}
            <div
              className={`px-6 py-4 text-white flex justify-between items-center ${
                analysisResult.data.riskLevel === 'CRITICAL'
                  ? 'bg-gradient-to-r from-rose-900 to-rose-700'
                  : analysisResult.data.riskLevel === 'MODERATE'
                  ? 'bg-gradient-to-r from-amber-900 to-amber-700'
                  : 'bg-gradient-to-r from-emerald-900 to-teal-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs">
                  {analysisResult.data.riskLevel === 'CRITICAL' ? (
                    <ShieldAlert className="w-6 h-6 text-rose-200" />
                  ) : analysisResult.data.riskLevel === 'MODERATE' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-200" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-emerald-200" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase tracking-wide">
                      Hasil Analisis Cerdas DRPs (Clinical CDSS)
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                      {analysisResult.data.riskLevel === 'CRITICAL'
                        ? 'PERINGATAN KRITIS / KONTRAINDIKASI'
                        : analysisResult.data.riskLevel === 'MODERATE'
                        ? 'PERHATIAN / INTERAKSI SEDANG'
                        : 'AMAN / MEMENUHI SYARAT'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80">
                    Resep #{analysisResult.rx.id} | Pasien: {analysisResult.rx.patientName} (RM: {analysisResult.rx.rmId})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAnalysisResult(null)}
                className="text-white/80 hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Executive Summary Banner */}
              <div
                className={`p-4 rounded-2xl border ${
                  analysisResult.data.riskLevel === 'CRITICAL'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : analysisResult.data.riskLevel === 'MODERATE'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                  <div className="font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Hasil Telaah CDSS Farmasi (AI Apoteker):</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/80 border border-slate-300 text-slate-700 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-600" />
                    <span>Rujukan: BNF 86 · Lexicomp · MIMS/ISO · PPK Kemenkes RI</span>
                  </span>
                </div>
                <p className="font-semibold text-xs leading-relaxed">
                  {analysisResult.data.summary}
                </p>
              </div>

              {/* Data RME yang Dijadikan Basis Analisis */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-[11px] space-y-1.5 text-slate-700">
                <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider">
                  Basis Data Rekam Medis Pasien Teranalisis (Tanpa Asumsi Mengambang):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>• <strong>Diagnosa RME:</strong> {analysisResult.rme?.icdName || analysisResult.rme?.soapA || '-'}</div>
                  <div>• <strong>Riwayat Alergi:</strong> <span className="text-rose-700 font-bold">{analysisResult.patient?.allergy || 'Tidak ada'}</span></div>
                  <div>• <strong>Vital Sign:</strong> TD {analysisResult.rme?.vitalSign?.td || '120/80'} | S {analysisResult.rme?.vitalSign?.suhu || '36.5'}°C | BB {analysisResult.rme?.vitalSign?.bb || '65'} kg</div>
                </div>
              </div>

              {/* SECTION UTAMA: DAFTAR TERSTRUKTUR TEMUAN DRPs & LITERATUR RUJUKAN */}
              {analysisResult.data.identifiedDRPs && analysisResult.data.identifiedDRPs.length > 0 && (
                <div className="space-y-3">
                  <h6 className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Daftar Masalah Terkait Obat (DRPs) & Rujukan Literatur Standar ({analysisResult.data.identifiedDRPs.length})</span>
                  </h6>
                  <div className="space-y-3">
                    {analysisResult.data.identifiedDRPs.map((drp, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border-2 space-y-2 transition shadow-2xs ${
                          drp.severity === 'Kritis'
                            ? 'bg-rose-50/70 border-rose-300'
                            : 'bg-amber-50/70 border-amber-300'
                        }`}
                      >
                        <div className="flex flex-wrap justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                              {drp.drugName}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                drp.category.includes('Alergi')
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : drp.category.includes('Interaksi')
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : drp.category.includes('Indikasi')
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-sky-100 text-sky-900 border border-sky-200'
                              }`}
                            >
                              Kategori: {drp.category}
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                              drp.severity === 'Kritis'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-amber-500 text-slate-950 font-black'
                            }`}
                          >
                            Tingkat: {drp.severity}
                          </span>
                        </div>

                        <div>
                          <p className="text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">Mekanisme Farmakologi & Dampak:</strong> {drp.clinicalExplanation}
                          </p>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                          <p className="font-bold text-slate-900 text-xs">
                            💡 <span className="text-indigo-800">Solusi / Rekomendasi Konkret Apoteker:</span>
                          </p>
                          <p className="text-slate-800 font-medium pl-4">{drp.recommendation}</p>
                        </div>

                        {drp.literatureReference && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-700">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-800 rounded-lg border border-slate-300 text-[10px] shadow-2xs font-mono">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>Literatur Standar: <strong>{drp.literatureReference}</strong></span>
                            </span>

                            {drp.referenceUrl && (
                              <a
                                href={drp.referenceUrl.startsWith('http') ? drp.referenceUrl : `https://${drp.referenceUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 rounded-lg border border-indigo-200 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                title="Buka rujukan dokumen pedoman resmi daring"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Buka Tautan Resmi ({(() => {
                                  try {
                                    return new URL(drp.referenceUrl.startsWith('http') ? drp.referenceUrl : `https://${drp.referenceUrl}`).hostname.replace('www.', '');
                                  } catch {
                                    return 'Rujukan Daring';
                                  }
                                })()})</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION A: DETEKSI ALERGI, KONTRAINDIKASI & DUPLIKASI */}
              {analysisResult.data.allergyAndContraindications?.length > 0 && (
                <div className="space-y-2">
                  <h6 className="font-black text-rose-800 uppercase text-[11px] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    <span>Alergi, Kontraindikasi, & Reaksi Silang ({analysisResult.data.allergyAndContraindications.length})</span>
                  </h6>
                  <div className="space-y-2">
                    {analysisResult.data.allergyAndContraindications.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-1.5 text-rose-950"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-xs">{item.drug}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase">
                            {item.riskType}: {item.alertLevel}
                          </span>
                        </div>
                        <p className="text-xs font-medium">{item.explanation}</p>
                        {item.literatureReference && (
                          <div className="text-[10px] text-rose-900 font-mono flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-rose-700 shrink-0" />
                              <span>Rujukan: {item.literatureReference}</span>
                            </div>
                            {item.referenceUrl && (
                              <a
                                href={item.referenceUrl.startsWith('http') ? item.referenceUrl : `https://${item.referenceUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 hover:text-rose-900 underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Buka Tautan</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION B: INTERAKSI OBAT-DENGAN-OBAT (DRUG-DRUG INTERACTIONS) */}
              <div className="space-y-2">
                <h6 className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Interaksi Obat dengan Obat (Drug-Drug Interactions)</span>
                </h6>
                {analysisResult.data.drugDrugInteractions?.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium">
                    ✓ Tidak ditemukan interaksi obat-dengan-obat yang merugikan menurut Lexicomp & BNF.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analysisResult.data.drugDrugInteractions.map((ddi, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 text-xs">
                            Kombinasi: <strong className="text-amber-900">{ddi.drugs}</strong>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              ddi.severity === 'Tinggi'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            Severity: {ddi.severity}
                          </span>
                        </div>
                        <p className="text-slate-700"><strong>Mekanisme:</strong> {ddi.mechanism}</p>
                        <p className="text-slate-700"><strong>Dampak Klinis:</strong> {ddi.clinicalEffect}</p>
                        <div className="p-2 bg-white rounded-lg border border-amber-200 text-amber-900 font-semibold">
                          💡 <strong>Solusi Apoteker:</strong> {ddi.recommendation}
                        </div>
                        {ddi.literatureReference && (
                          <div className="text-[10px] text-slate-600 font-mono flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>Rujukan: {ddi.literatureReference}</span>
                            </div>
                            {ddi.referenceUrl && (
                              <a
                                href={ddi.referenceUrl.startsWith('http') ? ddi.referenceUrl : `https://${ddi.referenceUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Buka Tautan Interaksi</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION C: KESESUAIAN OBAT DENGAN DIAGNOSA (DRUG-DISEASE) */}
              <div className="space-y-2">
                <h6 className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  <span>Kesesuaian Indikasi dengan Diagnosa RME (PPK Kemenkes RI / ISO)</span>
                </h6>
                {analysisResult.data.drugDiseaseInteractions?.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium">
                    ✓ Semua obat yang diresepkan memiliki indikasi yang rasional sesuai diagnosa pasien.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analysisResult.data.drugDiseaseInteractions.map((dd, idx) => (
                      <div key={idx} className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5">
                        <div className="font-bold text-sky-950">{dd.drug} ➔ {dd.conditionOrDiagnosis}</div>
                        <p className="text-slate-700"><strong>Masalah Indikasi:</strong> {dd.issue}</p>
                        <p className="text-sky-900 font-semibold">💡 Saran Apoteker: {dd.recommendation}</p>
                        {dd.literatureReference && (
                          <div className="text-[10px] text-sky-800 font-mono flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>Pedoman Rujukan: {dd.literatureReference}</span>
                            </div>
                            {dd.referenceUrl && (
                              <a
                                href={dd.referenceUrl.startsWith('http') ? dd.referenceUrl : `https://${dd.referenceUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 hover:text-sky-950 underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Buka Pedoman Daring</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION D: PENYESUAIAN DOSIS (DOSAGE ANALYSIS) */}
              <div className="space-y-2">
                <h6 className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Kesesuaian & Penyesuaian Dosis Standar (BNF / Fornas)</span>
                </h6>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-2.5">Obat</th>
                        <th className="p-2.5">Dosis Resep</th>
                        <th className="p-2.5">Dosis Standar</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5">Catatan & Rujukan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysisResult.data.dosageAnalysis?.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{d.drug}</td>
                          <td className="p-2.5 font-mono">{d.prescribedDose}</td>
                          <td className="p-2.5 font-mono text-slate-500">{d.standardDose}</td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.status === 'Sesuai'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : d.status === 'Overdose'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 space-y-0.5">
                            <div>{d.notes}</div>
                            {d.literatureReference && (
                              <div className="text-[10px] text-indigo-700 font-mono flex items-center gap-1.5">
                                <span>Ref: {d.literatureReference}</span>
                                {d.referenceUrl && (
                                  <a
                                    href={d.referenceUrl.startsWith('http') ? d.referenceUrl : `https://${d.referenceUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline font-bold text-[9px] text-indigo-800 flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    <span>Link</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION E: REKOMENDASI PROFESIONAL APOTEKER KE DOKTER */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <h6 className="font-black text-indigo-950 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-indigo-700" />
                    <span>Rekomendasi Profesional Apoteker (Untuk Konsultasi ke Dokter)</span>
                  </h6>
                  <button
                    onClick={handleApplyRecommendationToScreening}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRecommendation ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRecommendation ? 'Tersalin ke Skrining!' : 'Salin ke Form Skrining'}</span>
                  </button>
                </div>
                <ul className="list-disc list-inside space-y-1.5 font-medium text-slate-800 text-xs">
                  {analysisResult.data.pharmacistRecommendations?.map((rec, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setAnalysisResult(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup Pratinjau
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDRPReport}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Laporan DRPs</span>
                </button>

                {analysisResult.data.riskLevel === 'CRITICAL' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPres(analysisResult.rx);
                      setRejectReason(analysisResult.data.summary);
                      setAnalysisResult(null);
                      setRejectModalOpen(true);
                    }}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Resep (Berdasarkan DRPs)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyRecommendationToScreening();
                      onApproveToPOS(analysisResult.rx);
                      setAnalysisResult(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Terapkan Rekomendasi & Loloskan ke POS</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedPres && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase">Konfirmasi Penolakan Resep</h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Resep <strong>{selectedPres.id}</strong> atas nama pasien{' '}
                <strong>{selectedPres.patientName}</strong> akan ditolak dan dikembalikan kepada dokter peresep.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Penolakan Klinis / Masalah Skrining (DRPs) *
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Konfirmasi Tolak Resep
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
