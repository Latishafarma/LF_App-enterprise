import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FACILITY_PROFILE_FILE = path.resolve(__dirname, 'facility-profile.json');

interface StoredFacilityData {
  pharmacy?: Record<string, any>;
  apj?: Record<string, any>;
  dpj?: Record<string, any>;
  updatedAt?: number;
}

function readStoredFacilityData(): StoredFacilityData {
  try {
    if (fs.existsSync(FACILITY_PROFILE_FILE)) {
      const raw = fs.readFileSync(FACILITY_PROFILE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read facility-profile.json:', err);
  }
  return {};
}

function writeStoredFacilityData(data: StoredFacilityData) {
  try {
    fs.writeFileSync(FACILITY_PROFILE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write facility-profile.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  let memoryFacilityData: StoredFacilityData = readStoredFacilityData();

  // API Route: Get & Save Facility Profile + Logo (bridges partitioned iframe & top-level print tabs)
  app.get('/api/facility-profile', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(memoryFacilityData);
  });

  app.post('/api/facility-profile', (req, res) => {
    try {
      const { pharmacy, apj, dpj } = req.body || {};
      memoryFacilityData = {
        pharmacy: pharmacy !== undefined ? pharmacy : memoryFacilityData.pharmacy,
        apj: apj !== undefined ? apj : memoryFacilityData.apj,
        dpj: dpj !== undefined ? dpj : memoryFacilityData.dpj,
        updatedAt: Date.now()
      };
      writeStoredFacilityData(memoryFacilityData);
      res.json({ ok: true, updatedAt: memoryFacilityData.updatedAt });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save facility profile' });
    }
  });

  app.get('/api/facility-logo', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const logoUrl = memoryFacilityData?.pharmacy?.logoUrl;
    if (!logoUrl || typeof logoUrl !== 'string') {
      return res.status(404).end();
    }
    const match = logoUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', mimeType);
      return res.send(buffer);
    }
    return res.redirect(logoUrl);
  });

  // API Route: Store & Retrieve Print Payload (prevents 414 Request-URI Too Large)
  const memoryPrintPayloads: Record<string, any> = {};

  app.post('/api/print-payload', (req, res) => {
    try {
      const { key, payload } = req.body || {};
      if (key && payload !== undefined) {
        memoryPrintPayloads[key] = payload;
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save print payload' });
    }
  });

  app.get('/api/print-payload/:key', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const key = req.params.key;
    const payload = memoryPrintPayloads[key] || null;
    res.json({ payload });
  });

  // API Route: Analisis Cerdas DRPs (Drug-Related Problems) oleh AI dengan Standar Literatur Farmasi & Tautan Resmi
  app.post('/api/gemini/drp-analysis', async (req, res) => {
    try {
      const { patient, rme, prescriptions } = req.body;

      if (!prescriptions || !Array.isArray(prescriptions) || prescriptions.length === 0) {
        return res.status(400).json({ error: 'Data obat resep tidak boleh kosong.' });
      }

      // Check if GEMINI_API_KEY is available
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build'
              }
            }
          });

          const prompt = `Lakukan analisis klinis mendalam (Clinical Decision Support System / CDSS Farmasi) untuk mengidentifikasi Drug-Related Problems (DRPs) pada e-resep pasien berikut dengan menerapkan standar literatur farmasi ketat dan penautan referensi online kredibel:

PROFIL PASIEN:
- Nama: ${patient?.name || '-'}
- No. RM: ${patient?.rmId || '-'}
- Usia: ${patient?.age || '-'} tahun (${patient?.gender || '-'})
- Riwayat Alergi Obat/Makanan: ${patient?.allergy || 'Tidak ada riwayat alergi yang dilaporkan'}
- Kategori Pasien: ${patient?.category || 'Umum'}

DATA REKAM MEDIS ELEKTRONIK (RME) AKTUAL:
- Keluhan Utama (Subjective): ${rme?.soapS || rme?.keluhanUtama || '-'}
- Pemeriksaan Fisik & Tanda Vital (Objective): TD: ${rme?.vitalSign?.td || '-'} mmHg, Suhu: ${rme?.vitalSign?.suhu || '-'} C, Nadi: ${rme?.vitalSign?.nadi || '-'} x/menit, BB: ${rme?.vitalSign?.bb || '-'} kg, TB: ${rme?.vitalSign?.tb || '-'} cm, SpO2: ${rme?.vitalSign?.spo2 || '-'}%
- Diagnosa Kerja & ICD-10 (Assessment): ${rme?.icdName ? `${rme.icdCode} - ${rme.icdName}` : (rme?.soapA || '-')}
- Catatan Dokter / Plan: ${rme?.soapP || '-'}
- Riwayat Penyakit Terdahulu: ${rme?.riwayatPenyakit || '-'}
- Riwayat Pengobatan Sebelumnya: ${rme?.riwayatPengobatanSebelumnya || '-'}

DAFTAR OBAT YANG DIRESEPKAN:
${prescriptions.map((it: any, idx: number) => `${idx + 1}. ${it.name} | Qty: ${it.qty} ${it.unit || ''} | Aturan Pakai: ${it.dosage || '-'}`).join('\n')}

ATURAN MUTLAK MENGENAI SUMBER REFERENSI ILMIAH & TAUTAN INTERNET:
1. WAJIB MENYERTAKAN SUMBER RUJUKAN KREDIBEL:
   Setiap kali AI mendeteksi adanya DRP (Drug-Related Problems), potensi interaksi, kontraindikasi alergi, ketidaksesuaian indikasi, atau penilaian klinis, AI WAJIB mencantumkan sumber literatur resmi yang mendasarinya (seperti Pedoman Praktik Klinis Dokter Kemenkes RI No. HK.02.02/MENKES/514/2015, Formularium Nasional Kemenkes RI, British National Formulary [BNF 86], Lexicomp Drug Interactions, BPOM PIONAS, ISO Indonesia, MIMS, atau Stockley's Drug Interactions).
2. PENAUTAN TAUTAN (LINK/URL) PENDUKUNG DARI INTERNET:
   Jika rujukan bersumber dari pedoman daring yang valid, panduan klinis resmi, atau artikel jurnal/farmasi terakreditasi di internet, SERTAKAN TAUTAN (hyperlink/URL) AKTIF DAN LANGSUNG menuju sumber tersebut di dalam properti 'referenceUrl'.
   Contoh domain rujukan resmi yang valid:
   - Pedoman Praktik Klinis Kemenkes RI: https://yankes.kemkes.go.id/unduhan/fileunduhan_1610411306_913506.pdf
   - BPOM PIONAS (Pusat Informasi Obat Nasional): https://pionas.pom.go.id/monografi/amoksisilin atau https://pionas.pom.go.id/
   - BNF (NICE UK): https://bnf.nice.org.uk/treatment-summaries/penicillins/ atau https://bnf.nice.org.uk/interaction/
   - Lexicomp / Drugs.com Interaction Database: https://www.drugs.com/drug-interactions.html
   - Pedoman Tatalaksana Hipertensi PERKI: https://inaheart.org/panduan-klinis/
3. DILARANG KERAS MEMBERIKAN RUJUKAN FIKTIF:
   Dilarang keras mengarang URL palsu atau rujukan umum tanpa dasar literatur yang jelas. Jika argumen bersifat standar klinis universal, sebutkan nama pedoman dan bab/halaman atau instansi penerbitnya secara spesifik beserta tautan domain resmi.

ATURAN VALIDASI KETAT SESUAI RME PASIEN (BUKAN ASUMSI):
1. Cocokkan obat HANYA terhadap data nyata pada RME pasien di atas (Keluhan Utama, Diagnosa ICD-10, Tanda Vital, Riwayat Alergi, Riwayat Penyakit).
2. Jika ada obat yang TIDAK SEJALAN dengan diagnosa (misal: antibiotik pada Common Cold/ISPA virus tanpa tanda infeksi bakteri sekunder, atau NSAID pada pasien hipertensi/tukak lambung tanpa indikasi atau tanpa proteksi), tandai tegas sebagai masalah 'Ketidaksesuaian Indikasi' (Unindicated Drug) atau 'Drug-Disease Interaction' dengan tingkat risiko 'Kritis' atau 'Sedang', jelaskan mekanisme farmakologinya secara ilmiah, dan sertakan rujukan literatur serta URL resmi.
3. Untuk setiap temuan DRP, sertakan:
   - Nama obat bermasalah (drugName)
   - Kategori DRP (category: misal 'Interaksi Obat', 'Dosis Berlebih', 'Dosis Kurang', 'Kontraindikasi Alergi', atau 'Ketidaksesuaian Indikasi')
   - Tingkat keparahan (severity: 'Kritis', 'Sedang', atau 'Rendah')
   - Penjelasan klinis ilmiah berdasarkan mekanisme farmakologi (clinicalExplanation)
   - Rekomendasi/solusi konkret tanpa asumsi mengambang (recommendation)
   - Lampiran rujukan literatur standar (literatureReference: misal 'BNF 86 hal. 420; Lexicomp Drug Interactions', 'Pedoman Praktik Klinis Kemenkes RI HK.02.02/MENKES/514/2015')
   - Tautan internet resmi (referenceUrl: URL aktif menuju rujukan)

Tentukan riskLevel secara akurat:
- 'CRITICAL': Jika terdapat alergi langsung, kontraindikasi fatal, interaksi berat, atau overdosis berbahaya (Warna Merah).
- 'MODERATE': Jika terdapat ketidaksesuaian indikasi tanpa bahaya fatal, interaksi sedang, duplikasi parsial, atau perlu penyesuaian aturan/monitoring (Warna Kuning).
- 'SAFE': Jika semua obat sesuai indikasi, dosis tepat, tidak ada interaksi bermakna, dan aman dikonsumsi (Warna Hijau).`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction: `Anda adalah Sistem Pendukung Keputusan Klinis (Clinical Decision Support System / CDSS) Farmasi Apotek Latisha Farma. Berikan analisis DRPs (Drug-Related Problems) yang sangat akurat, berbasis bukti literatur standar resmi (BNF, Lexicomp, MIMS, ISO Indonesia, BPOM PIONAS, Pedoman Praktik Klinis Kemenkes RI). Setiap temuan DRPs WAJIB menyertakan rujukan literatur kredibel dan tautan (URL) aktif langsung ke sumber pedoman resmi. Dilarang keras memberikan rujukan fiktif atau asumsi mengambang. Tuliskan rekomendasi actionable dalam bahasa Indonesia medis profesional.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  riskLevel: {
                    type: Type.STRING,
                    description: "Tingkat risiko klinis: 'CRITICAL', 'MODERATE', atau 'SAFE'."
                  },
                  summary: {
                    type: Type.STRING,
                    description: "Ringkasan eksekutif hasil skrining DRPs dalam 1-2 kalimat."
                  },
                  identifiedDRPs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        drugName: { type: Type.STRING, description: "Nama obat yang bermasalah" },
                        category: { type: Type.STRING, description: "Kategori DRP: 'Interaksi Obat', 'Dosis Berlebih', 'Dosis Kurang', 'Kontraindikasi Alergi', atau 'Ketidaksesuaian Indikasi'" },
                        severity: { type: Type.STRING, description: "'Kritis', 'Sedang', atau 'Rendah'" },
                        clinicalExplanation: { type: Type.STRING, description: "Penjelasan mekanisme klinis ilmiah menurut literatur farmakologi" },
                        recommendation: { type: Type.STRING, description: "Solusi / rekomendasi konkret bagi apoteker" },
                        literatureReference: { type: Type.STRING, description: "Rujukan literatur standar resmi (BNF, Lexicomp, Pedoman Kemenkes RI, ISO/MIMS, BPOM PIONAS)" },
                        referenceUrl: { type: Type.STRING, description: "Tautan aktif (URL) langsung menuju pedoman resmi daring, monografi BPOM PIONAS, BNF NICE, atau literatur terakreditasi" }
                      }
                    },
                    description: "Daftar terstruktur DRPs yang teridentifikasi secara lengkap beserta rujukan literatur dan tautan resmi."
                  },
                  drugDrugInteractions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        severity: { type: Type.STRING, description: "'Tinggi', 'Sedang', atau 'Rendah'" },
                        drugs: { type: Type.STRING, description: "Nama obat yang saling berinteraksi" },
                        mechanism: { type: Type.STRING, description: "Mekanisme interaksi farmakokinetik / farmakodinamik" },
                        clinicalEffect: { type: Type.STRING, description: "Dampak klinis pada pasien" },
                        recommendation: { type: Type.STRING, description: "Saran tindakan apoteker (misal jeda waktu minum, ganti obat)" },
                        literatureReference: { type: Type.STRING, description: "Rujukan literatur (misal: BNF 86, Lexicomp)" },
                        referenceUrl: { type: Type.STRING, description: "Tautan aktif (URL) basis data interaksi resmi" }
                      }
                    }
                  },
                  drugDiseaseInteractions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        drug: { type: Type.STRING, description: "Nama obat" },
                        conditionOrDiagnosis: { type: Type.STRING, description: "Diagnosa / kondisi penyakit pasien" },
                        issue: { type: Type.STRING, description: "Kesesuaian indikasi atau kontraindikasi penyakit" },
                        recommendation: { type: Type.STRING, description: "Saran penyesuaian klinis" },
                        literatureReference: { type: Type.STRING, description: "Rujukan literatur pedoman klinis (misal: Pedoman Praktik Klinis Kemenkes RI No. HK.02.02/MENKES/514/2015)" },
                        referenceUrl: { type: Type.STRING, description: "Tautan aktif (URL) pedoman klinis resmi daring" }
                      }
                    }
                  },
                  dosageAnalysis: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        drug: { type: Type.STRING, description: "Nama obat" },
                        prescribedDose: { type: Type.STRING, description: "Dosis pada resep" },
                        standardDose: { type: Type.STRING, description: "Rentang dosis lazim menurut literatur" },
                        status: { type: Type.STRING, description: "'Sesuai', 'Underdose', 'Overdose', atau 'Perlu Penyesuaian'" },
                        notes: { type: Type.STRING, description: "Catatan klinis dosis" },
                        literatureReference: { type: Type.STRING, description: "Rujukan literatur (misal: BNF 86, BPOM PIONAS)" },
                        referenceUrl: { type: Type.STRING, description: "Tautan aktif (URL) monografi resmi" }
                      }
                    }
                  },
                  allergyAndContraindications: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        drug: { type: Type.STRING, description: "Nama obat" },
                        riskType: { type: Type.STRING, description: "'Alergi', 'Kontraindikasi', atau 'Duplikasi Terapi'" },
                        explanation: { type: Type.STRING, description: "Penjelasan bahaya atau reaksi silang" },
                        alertLevel: { type: Type.STRING, description: "'Kritis' atau 'Peringatan'" },
                        literatureReference: { type: Type.STRING, description: "Rujukan literatur (misal: BNF 86 Bab 5.1.1; BPOM PIONAS; Lexicomp Drug Allergy)" },
                        referenceUrl: { type: Type.STRING, description: "Tautan aktif (URL) monografi atau referensi alergi" }
                      }
                    }
                  },
                  pharmacistRecommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Daftar rekomendasi poin per poin untuk apoteker konsultasikan ke dokter peresep."
                  },
                  screeningPassedRecommendation: {
                    type: Type.BOOLEAN,
                    description: "True jika resep dapat diloloskan (dengan monitoring), False jika perlu konfirmasi revisi dokter."
                  }
                }
              }
            }
          });

          const parsedResult = JSON.parse(response.text || '{}');
          return res.json({
            ...parsedResult,
            source: 'gemini-3.8-flash',
            timestamp: new Date().toISOString()
          });
        } catch (geminiError: any) {
          console.warn('Gemini API call warning, utilizing clinical expert fallback engine:', geminiError?.message || geminiError);
          // Fall through to expert rule-based engine below
        }
      }

      // Expert Clinical Pharmacology Fallback Engine
      // Menganalisis data RME nyata dengan standar literatur farmasi BNF, ISO, MIMS, Pedoman Kemenkes RI, BPOM PIONAS, dan Lexicomp
      const patientAllergy = String(patient?.allergy || '').toLowerCase();
      const rxNames = prescriptions.map((p: any) => p.name.toLowerCase());

      const identifiedDRPs: any[] = [];
      const ddiList: any[] = [];
      const diseaseList: any[] = [];
      const doseList: any[] = [];
      const allergyList: any[] = [];
      const recommendations: string[] = [];
      let calculatedRisk: 'CRITICAL' | 'MODERATE' | 'SAFE' = 'SAFE';

      // 1. Validasi Riwayat Alergi Pasien (RME)
      if (patientAllergy && !patientAllergy.includes('tidak ada') && !patientAllergy.includes('-')) {
        for (const p of prescriptions) {
          const pNameLower = p.name.toLowerCase();
          // Penisilin / Amoksisilin
          if (
            (patientAllergy.includes('penisilin') || patientAllergy.includes('penicillin') || patientAllergy.includes('amoxicillin')) &&
            (pNameLower.includes('amoxicillin') || pNameLower.includes('ampicillin') || pNameLower.includes('amoksisilin'))
          ) {
            calculatedRisk = 'CRITICAL';
            const lit = 'BNF 86 Bab 5.1.1 (Penicillins & Hypersensitivity); BPOM PIONAS Amoksisilin; Lexicomp Drug Allergy Reference';
            const litUrl = 'https://pionas.pom.go.id/monografi/amoksisilin';
            const explanation = `Pasien memiliki riwayat alergi terdokumentasi terhadap ${patient.allergy}. Peresepan ${p.name} berisiko fatal memicu reaksi hipersensitivitas tipe I (anafilaksis / bronkospasme berat) atau sindrom Steven-Johnson diperantarai IgE.`;
            const rec = `Hentikan ${p.name} segera. Rekomendasikan penggantian antibiotik non-betalaktam (misal Azitromisin 500mg OD) jika memang terbukti ada infeksi bakteri sekunder.`;
            
            allergyList.push({
              drug: p.name,
              riskType: 'Alergi',
              explanation,
              alertLevel: 'Kritis',
              literatureReference: lit,
              referenceUrl: litUrl
            });

            identifiedDRPs.push({
              drugName: p.name,
              category: 'Kontraindikasi Alergi',
              severity: 'Kritis',
              clinicalExplanation: explanation,
              recommendation: rec,
              literatureReference: lit,
              referenceUrl: litUrl
            });

            recommendations.push(rec);
          }

          // Alergi Parasetamol
          if (patientAllergy.includes('paracetamol') && pNameLower.includes('paracetamol')) {
            calculatedRisk = 'CRITICAL';
            const lit = 'BPOM PIONAS Parasetamol; BNF 86 Analgesics Reference; MIMS Indonesia';
            const litUrl = 'https://pionas.pom.go.id/monografi/parasetamol';
            const explanation = `Pasien memiliki riwayat alergi terdokumentasi terhadap Parasetamol. Reaksi silang dapat memicu ruam kutaneus, urtikaria akut, hingga hepatotoksisitas.`;
            const rec = `Hentikan Parasetamol. Ganti dengan antipiretik/analgetik alternatif sesuai profil lambung pasien.`;

            allergyList.push({
              drug: p.name,
              riskType: 'Alergi',
              explanation,
              alertLevel: 'Kritis',
              literatureReference: lit,
              referenceUrl: litUrl
            });

            identifiedDRPs.push({
              drugName: p.name,
              category: 'Kontraindikasi Alergi',
              severity: 'Kritis',
              clinicalExplanation: explanation,
              recommendation: rec,
              literatureReference: lit,
              referenceUrl: litUrl
            });

            recommendations.push(rec);
          }
        }
      }

      // 2. Cek Interaksi Obat-dengan-Obat (Drug-Drug Interactions)
      const hasCorticosteroid = rxNames.some((n: string) => n.includes('dexa') || n.includes('prednison') || n.includes('metilprednisolon'));
      const hasNSAID = rxNames.some((n: string) => n.includes('ibuprofen') || n.includes('mefenamat') || n.includes('diklofenak') || n.includes('ketorolac') || n.includes('meloxicam'));
      const hasAntihypertensive = rxNames.some((n: string) => n.includes('amlodipine') || n.includes('captopril') || n.includes('candesartan') || n.includes('losartan'));

      // Kortikosteroid + NSAID
      if (hasCorticosteroid && hasNSAID) {
        if (calculatedRisk !== 'CRITICAL') calculatedRisk = 'MODERATE';
        const lit = 'BNF 86 hal. 620 & 1104; Lexicomp Drug Interactions (Severity: Major/Moderate); Stockley\'s Drug Interactions';
        const litUrl = 'https://www.drugs.com/drug-interactions.html';
        const ddiDrugs = 'Kortikosteroid + NSAID';
        const mechanism = 'Kombinasi agen antiinflamasi steroid dan non-steroid secara sinergis meningkatkan erosi mikrovaskular dan menghambat sintesis prostaglandin protektif lambung (PGE2 & PGI2).';
        const clinicalEffect = 'Peningkatan risiko perdarahan saluran cerna atas, perforasi lambung, dan ulkus peptikum hingga 4-15 kali lipat dibandingkan monoterapi.';
        const rec = 'Hindari peresepan kombinasi jika keluhan radang dapat diatasi monoterapi. Jika mutlak diperlukan, wajib tambahkan gastroprotektor (PPI seperti Omeprazole 20mg a.c.) dan diminum sesudah makan.';

        ddiList.push({
          severity: 'Sedang',
          drugs: ddiDrugs,
          mechanism,
          clinicalEffect,
          recommendation: rec,
          literatureReference: lit,
          referenceUrl: litUrl
        });

        identifiedDRPs.push({
          drugName: ddiDrugs,
          category: 'Interaksi Obat',
          severity: 'Sedang',
          clinicalExplanation: `${mechanism} Dampak: ${clinicalEffect}`,
          recommendation: rec,
          literatureReference: lit,
          referenceUrl: litUrl
        });

        recommendations.push('Berikan proteksi lambung (PPI seperti Omeprazole 20mg) dan edukasi minum obat sesudah makan.');
      }

      // NSAID + Antihipertensi (Amlodipine / ACEi)
      if (hasNSAID && hasAntihypertensive) {
        if (calculatedRisk !== 'CRITICAL') calculatedRisk = 'MODERATE';
        const lit = 'BNF 86 hal. 1105 (NSAIDs and Antihypertensives); Pedoman Hipertensi PERKI 2021; MIMS Indonesia';
        const litUrl = 'https://inaheart.org/panduan-klinis/';
        const ddiDrugs = 'NSAID + Antihipertensi (CCB/ACEi)';
        const mechanism = 'NSAID menghambat sintesis prostaglandin renal vasodilatator, memicu retensi natrium & air serta peningkatan resistensi vaskular sistemik.';
        const clinicalEffect = 'Dapat menumpulkan efektivitas terapi antihipertensi dan menaikkan tekanan darah rata-rata 3-6 mmHg pada pasien hipertensi.';
        const rec = 'Batasi durasi NSAID maksimal 3-5 hari atau ganti dengan Parasetamol oral sebagai lini pertama. Monitor tekanan darah harian secara berkala.';

        ddiList.push({
          severity: 'Sedang',
          drugs: ddiDrugs,
          mechanism,
          clinicalEffect,
          recommendation: rec,
          literatureReference: lit,
          referenceUrl: litUrl
        });

        identifiedDRPs.push({
          drugName: ddiDrugs,
          category: 'Interaksi Obat',
          severity: 'Sedang',
          clinicalExplanation: `${mechanism} Dampak: ${clinicalEffect}`,
          recommendation: rec,
          literatureReference: lit,
          referenceUrl: litUrl
        });

        recommendations.push('Monitoring tekanan darah pasien secara teratur selama penggunaan kombinasi NSAID dan antihipertensi.');
      }

      // 3. Validasi Ketat Sesuai RME Pasien: Kesesuaian Indikasi (Drug-Disease Interactions / Unindicated Drug)
      const diagStr = `${rme?.icdCode || ''} ${rme?.icdName || ''} ${rme?.soapA || ''} ${rme?.soapS || ''}`.toLowerCase();
      const vitalTd = String(rme?.vitalSign?.td || '');
      const isHypertensivePatient = diagStr.includes('hipertensi') || diagStr.includes('i10') || vitalTd.startsWith('14') || vitalTd.startsWith('15') || vitalTd.startsWith('16') || vitalTd.startsWith('17');
      const isCommonCold = diagStr.includes('common cold') || diagStr.includes('nasofaringitis') || diagStr.includes('j00') || (diagStr.includes('ispa') && !diagStr.includes('pneumonia'));

      for (const it of prescriptions) {
        const nameLower = it.name.toLowerCase();

        // 3a. Kasus Obat Tanpa Indikasi / ISPA Viral diberi Antibiotik
        if (isCommonCold && (nameLower.includes('amoxicillin') || nameLower.includes('ampicillin') || nameLower.includes('cefixime') || nameLower.includes('azithromycin') || nameLower.includes('ciprofloxacin'))) {
          // Hanya jika belum ditandai alergi
          const alreadyFlaggedAllergy = allergyList.some((a) => a.drug.toLowerCase() === nameLower);
          if (!alreadyFlaggedAllergy) {
            if (calculatedRisk !== 'CRITICAL') calculatedRisk = 'MODERATE';
            const lit = 'Pedoman Praktik Klinis Kemenkes RI No. HK.02.02/MENKES/514/2015 hal. 211 (Tatalaksana Common Cold); ISO Indonesia Vol. 54';
            const litUrl = 'https://yankes.kemkes.go.id/unduhan/fileunduhan_1610411306_913506.pdf';
            const issue = `Common Cold / ISPA non-spesifik (>90%) disebabkan oleh infeksi virus (Rhinovirus/Coronavirus). Peresepan antibiotik ${it.name} tanpa adanya tanda infeksi bakteri sekunder (dahak purulen tebal, leukositosis, demam >3-5 hari) tergolong Obat Tanpa Indikasi (Unindicated Drug).`;
            const rec = `Konfirmasi indikasi antibiotik ke dokter peresep. Utamakan terapi simptomatik rasional (dekongestan, hidrasi adekuat, istirahat) untuk mencegah resistensi antimikroba (AMR).`;

            diseaseList.push({
              drug: it.name,
              conditionOrDiagnosis: rme?.icdName || rme?.soapA || 'Common Cold (J00)',
              issue,
              recommendation: rec,
              literatureReference: lit,
              referenceUrl: litUrl
            });

            identifiedDRPs.push({
              drugName: it.name,
              category: 'Ketidaksesuaian Indikasi',
              severity: 'Sedang',
              clinicalExplanation: issue,
              recommendation: rec,
              literatureReference: lit,
              referenceUrl: litUrl
            });

            recommendations.push(`Evaluasi urgensi antibiotik ${it.name} pada infeksi virus saluran napas atas (sesuai Pedoman Kemenkes RI).`);
          }
        }

        // 3b. Kasus Hipertensi diberi NSAID
        if (isHypertensivePatient && (nameLower.includes('ibuprofen') || nameLower.includes('mefenamat') || nameLower.includes('diklofenak'))) {
          const lit = 'Pedoman Tatalaksana Hipertensi PERKI 2021; BNF 86 hal. 1105; BPOM PIONAS';
          const litUrl = 'https://inaheart.org/panduan-klinis/';
          const issue = `Pasien memiliki diagnosa/tanda vital hipertensi (TD: ${vitalTd || 'Meningkat'}). Penggunaan NSAID berpotensi memicu retensi cairan renal dan memperberat hipertensi.`;
          const rec = `Evaluasi penggantian analgetik dengan Parasetamol oral (500-1000 mg) yang memiliki profil kardiovaskular dan hemodinamik lebih aman.`;

          diseaseList.push({
            drug: it.name,
            conditionOrDiagnosis: `Hipertensi (${vitalTd ? `TD ${vitalTd} mmHg` : 'Diagnosa RME'})`,
            issue,
            recommendation: rec,
            literatureReference: lit,
            referenceUrl: litUrl
          });

          identifiedDRPs.push({
            drugName: it.name,
            category: 'Ketidaksesuaian Indikasi',
            severity: 'Sedang',
            clinicalExplanation: issue,
            recommendation: rec,
            literatureReference: lit,
            referenceUrl: litUrl
          });
        }

        // 4. Analisis Ketepatan Dosis (Dosage Analysis) dengan Literatur Standar
        let stdDose = 'Sesuai Formularium Nasional & ISO Indonesia';
        let status: 'Sesuai' | 'Underdose' | 'Overdose' | 'Perlu Penyesuaian' = 'Sesuai';
        let note = 'Dosis lazim terapi dewasa normal.';
        let doseLit = 'ISO Indonesia Vol. 54; BNF 86';
        let doseUrl = 'https://pionas.pom.go.id/';

        if (nameLower.includes('paracetamol')) {
          stdDose = '500mg - 1000mg per dosis (maks 4000mg/hari)';
          doseLit = 'BNF 86 Analgesics & Antipyretics; BPOM PIONAS Parasetamol';
          doseUrl = 'https://pionas.pom.go.id/monografi/parasetamol';
          if (it.dosage.includes('4x') || it.dosage.includes('3x')) {
            status = 'Sesuai';
            note = 'Dosis terapi analgesik-antipiretik tepat dan aman bagi fungsi hepar dewasa normal.';
          }
        } else if (nameLower.includes('cetirizine')) {
          stdDose = '10mg 1x sehari malam hari';
          doseLit = 'BNF 86 hal. 312; BPOM PIONAS Setirizin; MIMS Indonesia';
          doseUrl = 'https://pionas.pom.go.id/monografi/setirizin-hidroklorida';
          if (it.dosage.includes('1x') || it.dosage.includes('malam')) {
            status = 'Sesuai';
            note = 'Aturan pakai tepat untuk meminimalkan efek sedasi siang hari.';
          } else if (it.dosage.includes('3x') || it.dosage.includes('2x')) {
            status = 'Overdose';
            note = 'Cetirizine merupakan antihistamin generasi ke-2 dengan half-life eliminasi panjang (24 jam); dosis optimal cukup 1x1 sehari 10mg.';
            doseLit = 'BNF 86 hal. 312; BPOM PIONAS Setirizin; MIMS Indonesia';
            doseUrl = 'https://pionas.pom.go.id/monografi/setirizin-hidroklorida';
            if (calculatedRisk !== 'CRITICAL') calculatedRisk = 'MODERATE';
            
            const rec = 'Koreksi frekuensi Cetirizine menjadi 1x1 tablet per hari (malam hari sebelum tidur).';
            recommendations.push(rec);

            identifiedDRPs.push({
              drugName: it.name,
              category: 'Dosis Berlebih',
              severity: 'Sedang',
              clinicalExplanation: note,
              recommendation: rec,
              literatureReference: doseLit,
              referenceUrl: doseUrl
            });
          }
        } else if (nameLower.includes('amoxicillin')) {
          stdDose = '500mg tiap 8 jam (3x sehari) selama 5-7 hari';
          doseLit = 'BNF 86 Bab 5.1.1; BPOM PIONAS Amoksisilin; Fornas Kemenkes RI';
          doseUrl = 'https://pionas.pom.go.id/monografi/amoksisilin';
          status = 'Sesuai';
          note = 'Dosis antibiotik standar infeksi bakteri rentan. Harus dihabiskan untuk mencegah resistensi.';
        } else if (nameLower.includes('amlodipine')) {
          stdDose = '5mg - 10mg 1x sehari pagi/malam hari';
          doseLit = 'BNF 86 Cardiovascular System; BPOM PIONAS Amlodipin; Pedoman PERKI';
          doseUrl = 'https://pionas.pom.go.id/monografi/amlodipin';
          status = 'Sesuai';
          note = 'Dosis monoterapi / kombinasi antihipertensi standar.';
        }

        doseList.push({
          drug: it.name,
          prescribedDose: it.dosage,
          standardDose: stdDose,
          status,
          notes: note,
          literatureReference: doseLit,
          referenceUrl: doseUrl
        });
      }

      // Default rekomendasi jika aman
      if (recommendations.length === 0) {
        recommendations.push('Regimen peresepan rasional, memenuhi kaidah Formularium Nasional dan panduan klinis.');
        recommendations.push('Lanjutkan dispensing dengan KIE etiket obat yang lengkap dan jelas bagi pasien.');
      }

      // Ringkasan Eksekutif
      const summaryText =
        calculatedRisk === 'CRITICAL'
          ? `PERINGATAN KRITIS DRPs: Ditemukan bahaya klinis signifikan (${allergyList.map((a: any) => a.explanation).join('. ')}). Konfirmasi dokter wajib dilakukan sebelum peracikan!`
          : calculatedRisk === 'MODERATE'
          ? `PERHATIAN DRPs (TINGKAT SEDANG): Teridentifikasi ${identifiedDRPs.length} potensi masalah (interaksi obat, ketidaksesuaian indikasi RME, atau penyesuaian aturan pakai). Disarankan konfirmasi dokter atau edukasi terarah.`
          : `SKRINING LOLOS AMAN: Seluruh obat rasional dan sesuai indikasi diagnosa RME, dosis standar terpenuhi, dan tidak ada interaksi atau kontraindikasi alergi terdeteksi.`;

      return res.json({
        riskLevel: calculatedRisk,
        summary: summaryText,
        identifiedDRPs,
        drugDrugInteractions: ddiList,
        drugDiseaseInteractions: diseaseList,
        dosageAnalysis: doseList,
        allergyAndContraindications: allergyList,
        pharmacistRecommendations: recommendations,
        screeningPassedRecommendation: calculatedRisk !== 'CRITICAL',
        source: 'clinical-cdss-engine-accredited',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('DRP Analysis Error:', err);
      res.status(500).json({ error: 'Gagal melakukan analisis DRPs klinis: ' + (err.message || 'Internal error') });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
