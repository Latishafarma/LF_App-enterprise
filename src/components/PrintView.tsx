import React, { useEffect, useState } from 'react';
import { Printer, X, CheckCircle, FileText } from 'lucide-react';
import { INITIAL_MEDICINES, INITIAL_STOCK_MUTATIONS, INITIAL_TRANSACTIONS, INITIAL_RME_RECORDS, INITIAL_PATIENTS } from '../data/initialData';
import { Medicine, StockMutation, Transaction, RMERecord, Patient } from '../types';
import {
  getSavedPharmacyProfile,
  getSavedAPJProfile,
  getSavedDPJProfile,
  useFacilityProfiles,
  formatPharmacyAddress
} from './PharmacySettingsModal';

interface PrintViewProps {
  mode: string;
  searchParams: URLSearchParams;
}

export const PrintView: React.FC<PrintViewProps> = ({ mode, searchParams }) => {
  // Sync payload from URL parameter into new tab's localStorage if present
  try {
    const rawPayload = searchParams.get('_payload');
    if (rawPayload) {
      const payloadKeyMap: Record<string, string> = {
        rme: 'latisha_active_print_rme',
        'copy-resep': 'latisha_active_print_rme',
        'surat-sakit': 'latisha_active_print_rme',
        'laporan-morbiditas': 'latisha_active_print_morbiditas',
        'hasil-lab': 'latisha_active_print_lab',
        'faktur-penjualan': 'latisha_active_print_trx',
        'kwitansi-penjualan': 'latisha_active_print_trx',
        'struk-pos': 'latisha_active_print_receipt',
        'kartu-pasien': 'latisha_active_print_patient',
        'nota-retur': 'latisha_active_print_retur',
        'retur-pembelian': 'latisha_active_print_retur',
        'telaah-drp': 'latisha_active_print_drp'
      };
      const storageKey = payloadKeyMap[mode];
      if (storageKey) {
        localStorage.setItem(storageKey, rawPayload);
      }
    }
  } catch {}

  const {
    pharmacyProfile: reactivePharm,
    apjProfile: reactiveApj,
    dpjProfile: reactiveDpj
  } = useFacilityProfiles();

  const [serverSyncedPharm, setServerSyncedPharm] = useState(() => getSavedPharmacyProfile());
  const [serverSyncedApj, setServerSyncedApj] = useState(() => getSavedAPJProfile());
  const [serverSyncedDpj, setServerSyncedDpj] = useState(() => getSavedDPJProfile());
  const [activeInvoicePrintType, setActiveInvoicePrintType] = useState<'faktur' | 'kwitansi'>(
    mode === 'kwitansi-penjualan' ? 'kwitansi' : 'faktur'
  );

  const safePrint = () => {
    if (typeof window !== 'undefined' && window.self === window.top) {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.warn('Print error:', err);
      }
    }
  };

  const [remotePayloadFetched, setRemotePayloadFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const payloadKeyMap: Record<string, string> = {
      rme: 'latisha_active_print_rme',
      'copy-resep': 'latisha_active_print_rme',
      'surat-sakit': 'latisha_active_print_rme',
      'laporan-morbiditas': 'latisha_active_print_morbiditas',
      'hasil-lab': 'latisha_active_print_lab',
      'faktur-penjualan': 'latisha_active_print_trx',
      'kwitansi-penjualan': 'latisha_active_print_trx',
      'struk-pos': 'latisha_active_print_receipt',
      'kartu-pasien': 'latisha_active_print_patient',
      'nota-retur': 'latisha_active_print_retur',
      'retur-pembelian': 'latisha_active_print_retur',
      'telaah-drp': 'latisha_active_print_drp'
    };
    const storageKey = payloadKeyMap[mode];
    if (storageKey) {
      fetch(`/api/print-payload/${storageKey}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.payload && !cancelled) {
            const rawStr = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
            try {
              localStorage.setItem(storageKey, rawStr);
            } catch {}
            setRemotePayloadFetched(true);
          }
        })
        .catch(() => {});
    }

    let hasTriggeredPrint = false;

    const triggerPrintWhenImagesReady = () => {
      if (cancelled || hasTriggeredPrint) return;

      const doPrint = () => {
        if (cancelled || hasTriggeredPrint) return;
        hasTriggeredPrint = true;

        const executePrint = () => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (!cancelled) {
                safePrint();
              }
            }, 200);
          });
        };

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(executePrint).catch(executePrint);
        } else {
          executePrint();
        }
      };

      const images = Array.from(document.querySelectorAll('#printable-section img')) as HTMLImageElement[];
      const pending = images.filter((img) => !img.complete);

      if (pending.length === 0) {
        doPrint();
      } else {
        let resolvedCount = 0;
        const onDone = () => {
          resolvedCount += 1;
          if (resolvedCount >= pending.length) {
            doPrint();
          }
        };
        pending.forEach((img) => {
          img.addEventListener('load', onDone, { once: true });
          img.addEventListener('error', onDone, { once: true });
        });
        // Fallback timeout in case image loading stalls
        setTimeout(() => {
          if (!hasTriggeredPrint) doPrint();
        }, 1500);
      }
    };

    fetch('/api/facility-profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.pharmacy) {
          const currentLocal = getSavedPharmacyProfile();
          const mergedPharm = {
            ...currentLocal,
            ...data.pharmacy,
            logoUrl: data.pharmacy.logoUrl || currentLocal.logoUrl || ''
          };
          if (mergedPharm.logoUrl) {
            try {
              localStorage.setItem('latisha_facility_logo', mergedPharm.logoUrl);
            } catch {}
          }
          try {
            localStorage.setItem('latisha_pharmacy_profile', JSON.stringify(mergedPharm));
          } catch {}
          setServerSyncedPharm(mergedPharm);
        }
        if (data?.apj) {
          const mergedApj = { ...getSavedAPJProfile(), ...data.apj };
          try {
            localStorage.setItem('latisha_apj_profile', JSON.stringify(mergedApj));
          } catch {}
          setServerSyncedApj(mergedApj);
        }
        if (data?.dpj) {
          const mergedDpj = { ...getSavedDPJProfile(), ...data.dpj };
          try {
            localStorage.setItem('latisha_dpj_profile', JSON.stringify(mergedDpj));
          } catch {}
          setServerSyncedDpj(mergedDpj);
        }
        setTimeout(triggerPrintWhenImagesReady, 150);
      })
      .catch(() => {
        setTimeout(triggerPrintWhenImagesReady, 300);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pharmacyProfile = {
    ...reactivePharm,
    ...serverSyncedPharm,
    logoUrl: serverSyncedPharm.logoUrl || reactivePharm.logoUrl || ''
  };
  const pharmacyFullAddress = formatPharmacyAddress(pharmacyProfile);
  const apjProfile = { ...reactiveApj, ...serverSyncedApj };
  const dpjProfile = { ...reactiveDpj, ...serverSyncedDpj };

  // Shared Floating Top Action Bar
  const renderFloatingTopBar = (title: string) => (
    <div className="no-print bg-slate-900 text-white p-3.5 rounded-2xl mb-6 flex justify-between items-center shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold text-xs">
          {title} · Pratinjau Cetak Mandiri Bebas Hambatan Sandbox
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={safePrint}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Sekarang (Ctrl+P)</span>
        </button>
        <button
          onClick={() => window.close()}
          className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer text-xs transition"
        >
          <X className="w-4 h-4" />
          <span>Tutup Jendela</span>
        </button>
      </div>
    </div>
  );

  // Print style sheet
  const printStyles = (
    <style>{`
      @media print {
        .no-print { display: none !important; }
        html, body { background: #ffffff !important; color: #000000 !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
        #printable-section { display: block !important; visibility: visible !important; border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; }
        #printable-section * { visibility: visible !important; color: #000000 !important; }
        #printable-section img { display: block !important; visibility: visible !important; opacity: 1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `}</style>
  );

  // Helper Terbilang
  const getTerbilang = (amount: number) => {
    const rounded = Math.round(Math.abs(amount));
    if (rounded === 0) return 'Nol Rupiah';
    const bil = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    function convert(x: number): string {
      if (x < 12) return bil[x];
      if (x < 20) return convert(x - 10) + ' Belas';
      if (x < 100) return convert(Math.floor(x / 10)) + ' Puluh ' + convert(x % 10);
      if (x < 200) return 'Seratus ' + convert(x - 100);
      if (x < 1000) return convert(Math.floor(x / 100)) + ' Ratus ' + convert(x % 100);
      if (x < 2000) return 'Seribu ' + convert(x - 1000);
      if (x < 1000000) return convert(Math.floor(x / 1000)) + ' Ribu ' + convert(x % 1000);
      if (x < 1000000000) return convert(Math.floor(x / 1000000)) + ' Juta ' + convert(x % 1000000);
      return convert(Math.floor(x / 1000000000)) + ' Milyar ' + convert(x % 1000000000);
    }
    return convert(rounded).trim().replace(/\s+/g, ' ') + ' Rupiah';
  };

  // 1. SURAT PESANAN (SP / DEFECTA / RE-ORDER RESMI BPOM)
  if (mode === 'surat-pesanan') {
    const supplierParam = searchParams.get('supplier') || 'SEMUA';
    const typeParam = (searchParams.get('spType') || 'REG') as string;
    const poIdParam = searchParams.get('poId') || '';
    const dataParam = searchParams.get('data');

    let defectaItems: any[] = [];
    let spData: any = null;

    // 1. First priority: decode directly from URL query param (100% resilient across iframe sandboxes and tabs)
    if (dataParam) {
      try {
        const decoded = decodeURIComponent(dataParam);
        spData = JSON.parse(decoded);
        if (spData?.items && Array.isArray(spData.items) && spData.items.length > 0) {
          defectaItems = spData.items;
        }
      } catch (err) {
        console.warn('URL data param decode error:', err);
      }
    }

    // 2. Second priority: lookup purchase order from localStorage by poId
    if (defectaItems.length === 0 && poIdParam) {
      try {
        const savedPOs = localStorage.getItem('latisha_purchase_orders');
        if (savedPOs) {
          const pos = JSON.parse(savedPOs);
          const foundPo = pos.find((p: any) => p.id === poIdParam || p.poNumber === poIdParam);
          if (foundPo && foundPo.items && foundPo.items.length > 0) {
            const currentSpType = typeParam || 'SEMUA';
            const matchedItems =
              currentSpType === 'SEMUA' || currentSpType === 'ALL'
                ? foundPo.items
                : foundPo.items.filter((it: any) => it.spType === currentSpType);

            const itemsToUse = matchedItems.length > 0 ? matchedItems : foundPo.items;

            spData = {
              spNumber: foundPo.spNumbers?.[currentSpType] || foundPo.poNumber,
              spType: currentSpType,
              supplierName: foundPo.supplierName,
              supplierAddress: foundPo.supplierAddress,
              supplierPhone: foundPo.supplierPhone,
              orderDate: foundPo.date,
              notes: foundPo.notes,
              items: itemsToUse
            };
            defectaItems = itemsToUse;
          }
        }
      } catch (err) {
        console.warn('PO lookup error:', err);
      }
    }

    // 3. Third priority: localStorage latisha_active_print_sp
    if (defectaItems.length === 0) {
      try {
        const savedSp = localStorage.getItem('latisha_active_print_sp');
        if (savedSp) {
          const parsed = JSON.parse(savedSp);
          if (parsed?.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
            spData = parsed;
            defectaItems = parsed.items;
          }
        }
      } catch (e) {
        console.warn('Storage read error:', e);
      }
    }

    // 4. Fourth priority: Fallback to active medicines defecta list
    if (defectaItems.length === 0) {
      let medicines: Medicine[] = INITIAL_MEDICINES;
      try {
        const savedMed = localStorage.getItem('latisha_medicines');
        if (savedMed) medicines = JSON.parse(savedMed);
      } catch (e) {}
      defectaItems = medicines.filter((m) => m.stock <= m.minStock);
      if (supplierParam !== 'SEMUA') {
        defectaItems = defectaItems.filter((m) => (m.supplier || 'PBF Umum') === supplierParam);
      }
    }

    const rawType = spData?.spType || typeParam || 'REG';
    const spType = (rawType === 'ALL' || rawType === 'SEMUA' ? 'ALL' : rawType) as
      | 'REG'
      | 'ALK'
      | 'PRE'
      | 'OOT'
      | 'PSI'
      | 'NAR'
      | 'ALL';

    const currentSupplier =
      spData?.supplierName ||
      spData?.supplier ||
      (supplierParam === 'SEMUA'
        ? 'PT Kimia Farma Trading & Distribution / PBF Rekanan'
        : supplierParam);
    const supplierAddress =
      spData?.supplierAddress || 'Distributor Resmi Farmasi & Alat Kesehatan Indonesia';
    const todayStr = spData?.orderDate
      ? new Date(spData.orderDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

    // Format No Surat Pesanan ALF/{jenis SP}/{BLN}/{THN}/{No. Urut}
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const currentMonthRoman = romanMonths[new Date().getMonth()];
    const currentYear = new Date().getFullYear();
    const defaultSpNumber = `ALF/${spType === 'ALL' ? 'REG' : spType}/${currentMonthRoman}/${currentYear}/001`;
    const spNumber = spData?.spNumber || defaultSpNumber;

    // SP Titles based on BPOM / Kemenkes
    const spMeta: Record<string, { title: string; badge: string; notes: string }> = {
      ALL: {
        title: 'SURAT PESANAN PEMBELIAN OBAT & ALKES',
        badge: 'SURAT PESANAN LENGKAP',
        notes: 'Seluruh daftar pesanan sediaan farmasi dan perbekalan kesehatan apotek.'
      },
      REG: {
        title: 'SURAT PESANAN OBAT JADI (REGULER)',
        badge: 'SURAT PESANAN OBAT REGULER',
        notes: 'Obat yang dipesan adalah obat bebas, bebas terbatas, dan obat keras non-NAPPZA.'
      },
      ALK: {
        title: 'SURAT PESANAN ALAT KESEHATAN & BMHP',
        badge: 'SURAT PESANAN ALAT KESEHATAN',
        notes: 'Barang yang dipesan adalah Alat Kesehatan dan Bahan Medis Habis Pakai berizin edar resmi Kemenkes.'
      },
      PRE: {
        title: 'SURAT PESANAN OBAT MENGANDUNG PREKURSOR FARMASI',
        badge: 'SURAT PESANAN PREKURSOR FARMASI',
        notes: 'Surat Pesanan ini terpisah dan tidak dicampur dengan pesanan obat non-prekursor sesuai regulasi BPOM RI.'
      },
      OOT: {
        title: 'SURAT PESANAN OBAT-OBAT TERTENTU (OOT)',
        badge: 'SURAT PESANAN OBAT-OBAT TERTENTU (BPOM)',
        notes: 'Meliputi Tramadol, Trihexyphenidyl, Chlorpromazine, Amitriptyline, Haloperidol, dan Dextromethorphan.'
      },
      PSI: {
        title: 'SURAT PESANAN PSIKOTROPIKA',
        badge: 'SURAT PESANAN PSIKOTROPIKA',
        notes: 'Surat Pesanan Psikotropika hanya dapat digunakan untuk 1 (satu) PBF dan tidak boleh digabung dengan pesanan obat lain.'
      },
      NAR: {
        title: 'SURAT PESANAN NARKOTIKA',
        badge: 'SURAT PESANAN NARKOTIKA',
        notes: 'Surat Pesanan Narkotika hanya ditujukan kepada PT. Kimia Farma Trading & Distribution sebagai PBF resmi penyalur narkotika.'
      }
    };

    const currentMeta = spMeta[spType] || spMeta.REG;

    return (
      <div className="bg-white min-h-screen text-slate-800 p-6 max-w-4xl mx-auto font-sans text-xs">
        {printStyles}
        {renderFloatingTopBar(`${currentMeta.title} (${spType})`)}

        <div
          id="printable-section"
          className="space-y-4 border-2 border-slate-900 p-8 rounded-2xl bg-white shadow-xs text-xs leading-relaxed"
        >
          {/* KOP APOTEK RESMI */}
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
              <div className="flex-1 text-center">
                <h2 className="font-black text-xl text-slate-900 uppercase tracking-wide">
                  {pharmacyProfile.name}
                </h2>
                <p className="text-[11px] text-slate-800 font-medium">
                  {pharmacyFullAddress}
                </p>
                <p className="text-[10px] text-slate-600">
                  Telp / WhatsApp: {pharmacyProfile.phone} | Email: {pharmacyProfile.email}
                </p>
                <div className="flex flex-wrap justify-center gap-x-4 text-[10px] text-slate-700 font-mono mt-1 border-t border-slate-300 pt-1">
                  <span>SIA: <strong>{pharmacyProfile.sia}</strong></span>
                  {pharmacyProfile.nib && <span>NIB: <strong>{pharmacyProfile.nib}</strong></span>}
                  <span>APJ: <strong>{apjProfile.name}</strong> (SIPA: {apjProfile.sipa})</span>
                </div>
              </div>
              {pharmacyProfile.logoUrl ? <div className="w-16 shrink-0" /> : <div className="w-16 shrink-0" />}
            </div>

            <div className="text-center">
              <div className="mt-3 inline-block px-5 py-1 bg-slate-900 text-white rounded-md font-black text-xs uppercase tracking-wider">
                {currentMeta.title}
              </div>
            </div>
          </div>

          {/* Nomor SP & Tujuan PBF */}
          <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-300 text-xs">
            <div>
              <p className="text-slate-600 font-bold">NOMOR SURAT PESANAN:</p>
              <p className="font-mono font-black text-slate-900 text-sm mt-0.5 tracking-wide">
                {spNumber}
              </p>
              <p className="text-slate-600 mt-2 font-bold">TANGGAL PEMESANAN:</p>
              <p className="font-bold text-slate-800">{todayStr}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Kelompok Regulasi: <strong className="text-slate-800">{spType} ({currentMeta.badge})</strong>
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                KEPADA YTH. PIMPINAN PBF / DISTRIBUTOR:
              </p>
              <p className="font-black text-slate-900 text-sm mt-0.5">
                {currentSupplier}
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">{supplierAddress}</p>
              <p className="text-slate-500 text-[10px]">Di Tempat</p>
            </div>
          </div>

          <div className="text-slate-800 leading-normal">
            <p className="font-medium">
              Yang bertanda tangan di bawah ini Apoteker Penanggung Jawab (APJ) <strong>{pharmacyProfile.name}</strong> ({apjProfile.name} · SIPA: {apjProfile.sipa}), dengan ini mengajukan pesanan sediaan farmasi dengan rincian sebagai berikut:
            </p>
          </div>

          {/* Tabel Pesanan Resmi BPOM */}
          <table className="w-full text-left text-xs border border-collapse border-slate-400">
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-900 border-b border-slate-400">
              <tr>
                <th className="p-2 border border-slate-400 text-center w-8">No</th>
                <th className="p-2 border border-slate-400">Nama Obat / Barang</th>
                <th className="p-2 border border-slate-400 text-center w-28">Kekuatan & Bentuk</th>
                <th className="p-2 border border-slate-400 text-center w-36">Kemasan</th>
                <th className="p-2 border border-slate-400 text-center w-28 bg-slate-200">
                  Jumlah Pesanan
                </th>
                <th className="p-2 border border-slate-400">Jumlah Dalam Huruf (Terbilang)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-medium text-slate-900">
              {defectaItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Tidak ada obat dalam daftar surat pesanan ini.
                  </td>
                </tr>
              ) : (
                defectaItems.map((item, idx) => {
                  const qty = item.qtyBesar || item.qtyOrder || Math.max(1, (item.minStock * 2) - item.stock);
                  const satuan = item.satuanBesar || item.unit || 'Box';
                  return (
                    <tr key={item.id || idx} className="border-b border-slate-300">
                      <td className="p-2 border border-slate-400 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-400 font-bold text-slate-900">
                        {item.name}
                        {item.nappza && item.nappza !== 'Non-NAPPZA' && (
                          <span className="ml-1 text-[9px] font-mono px-1 bg-slate-200 rounded">
                            {item.nappza}
                          </span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-400 text-center font-mono text-[11px]">
                        {item.kekuatan || '-'} · {item.form || 'Tablet'}
                      </td>
                      <td className="p-2 border border-slate-400 text-center text-[11px]">
                        {item.satuanBesar || 'Box'}
                        {item.rasioKonversi > 1 ? ` @ ${item.rasioKonversi} ${item.satuanKecil || item.unit}` : ''}
                      </td>
                      <td className="p-2 border border-slate-400 text-center font-mono font-black text-slate-900 bg-slate-100 text-xs">
                        {qty} {satuan}
                      </td>
                      <td className="p-2 border border-slate-400 italic text-[11px] text-slate-800">
                        {getTerbilang(qty).replace('Rupiah', satuan)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pernyataan & Regulasi BPOM */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1 text-[10px] text-slate-700">
            <p className="font-bold text-slate-900">Pernyataan Kepatuhan Regulasi BPOM:</p>
            <p>
              1. Obat-obatan / sediaan farmasi tersebut di atas akan dipergunakan untuk memenuhi kebutuhan pelayanan kefarmasian resmi di sarana <strong>{pharmacyProfile.name}</strong> (SIA: {pharmacyProfile.sia}) sesuai ketentuan perundang-undangan.
            </p>
            <p>
              2. PBF wajib melampirkan salinan Certificate of Analysis (CoA) untuk setiap batch, serta menjamin tanggal kedaluwarsa (Expired Date) minimal 2 (dua) tahun pada saat penyerahan barang.
            </p>
            {spType === 'NAR' && (
              <p className="font-bold text-rose-800">
                3. Khusus Narkotika: Surat Pesanan ini hanya berlaku untuk 1 (satu) jenis sediaan Narkotika sesuai Pasal 10 Permenkes No. 3/2015.
              </p>
            )}
            {spType === 'PSI' && (
              <p className="font-bold text-purple-800">
                3. Khusus Psikotropika: Surat Pesanan dibuat terpisah dari obat lain dan dilaporkan secara berkala melalui aplikasi SIPNAP Kemenkes RI.
              </p>
            )}
          </div>

          {/* Tanda Tangan APJ Resmi & Pemesan */}
          <div className="grid grid-cols-2 pt-6 text-xs">
            <div className="space-y-1 text-slate-600">
              <p className="font-bold text-slate-900">Alamat Pengiriman Obat:</p>
              <p className="font-bold text-slate-800">{pharmacyProfile.name}</p>
              <p>{pharmacyFullAddress}</p>
              <p>CP: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}</p>
            </div>

            <div className="text-center space-y-14">
              <p className="font-bold text-slate-800">
                {pharmacyProfile.city}, {todayStr}<br />
                Apoteker Pengelola Apotek (APJ),
              </p>
              <div>
                <p className="font-black underline text-slate-900 text-sm">{apjProfile.name}</p>
                <p className="text-[10px] text-slate-700 font-mono">SIPA: {apjProfile.sipa}</p>
                <p className="text-[10px] text-slate-600 font-mono">STRA: {apjProfile.stra}</p>
                <p className="text-[9px] text-slate-500 italic mt-0.5">(Tanda Tangan Asli & Stempel Basah)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. STRUK KASIR POS (THERMAL RECEIPT 58MM / 80MM STYLE)
  if (mode === 'struk-pos') {
    const trxId = searchParams.get('trxId') || '';
    let selectedTrx: Transaction | null = null;

    try {
      const savedReceipt = localStorage.getItem('latisha_active_print_receipt');
      if (savedReceipt) {
        const parsed = JSON.parse(savedReceipt);
        if (!trxId || parsed.id === trxId) {
          selectedTrx = parsed;
        }
      }
      if (!selectedTrx) {
        const savedList = localStorage.getItem('latisha_transactions');
        if (savedList) {
          const list: Transaction[] = JSON.parse(savedList);
          selectedTrx = list.find((t) => t.id === trxId) || list[0] || null;
        }
      }
    } catch (e) {}

    if (!selectedTrx) {
      return (
        <div className="bg-slate-100 min-h-screen text-slate-900 p-8 font-sans flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center max-w-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-2">Data Transaksi Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mb-4">Tidak ada data transaksi yang dapat dicetak saat ini.</p>
            <button onClick={() => window.close()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Tutup Halaman
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-100 min-h-screen text-slate-900 p-4 font-mono text-xs flex flex-col items-center">
        {printStyles}
        <div className="w-full max-w-sm mb-4">
          {renderFloatingTopBar('Struk Pembayaran Kasir')}
        </div>

        {/* Thermal Receipt Paper Card (80mm width standard) */}
        <div
          id="printable-section"
          className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 w-full max-w-sm text-xs space-y-3 leading-relaxed"
        >
          {/* Header Struk Terintegrasi Profil Apotek & APJ */}
          <div className="text-center border-b border-dashed border-slate-400 pb-3">
            {pharmacyProfile.logoUrl && (
              <div className="flex justify-center mb-1.5">
                <img
                  src={pharmacyProfile.logoUrl}
                  alt="Logo Faskes"
                  className="h-12 w-auto max-w-[110px] object-contain"
                />
              </div>
            )}
            <h2 className="font-black text-sm text-slate-900 uppercase">
              {pharmacyProfile.name}
            </h2>
            <p className="text-[10px] text-slate-600">
              {pharmacyFullAddress}
            </p>
            <p className="text-[10px] text-slate-600">Telp / WA: {pharmacyProfile.phone}</p>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">
              SIA: {pharmacyProfile.sia} · APJ: {apjProfile.name}
            </p>
          </div>

          {/* Meta Info Transaksi */}
          <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Struk:</span>
              <strong className="font-bold">{selectedTrx.id}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waktu:</span>
              <span>{selectedTrx.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span>{selectedTrx.kasir}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pelanggan:</span>
              <strong className="text-slate-800">
                {!selectedTrx.customerName || selectedTrx.customerName === 'Pelanggan Umum'
                  ? 'Reguler'
                  : selectedTrx.customerName}
              </strong>
            </div>
            {selectedTrx.rmId && (
              <div className="flex justify-between">
                <span className="text-slate-500">No. RM:</span>
                <span className="font-bold text-sky-800">{selectedTrx.rmId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Jalur Transaksi:</span>
              <span className="font-bold text-indigo-700">{selectedTrx.type}</span>
            </div>
          </div>

          {/* Petugas yang Bertugas (Multi-Petugas) jika ada */}
          {selectedTrx.assignedStaff && selectedTrx.assignedStaff.length > 0 && (
            <div className="text-[10px] bg-slate-50 p-2 rounded border border-slate-200 space-y-0.5">
              <span className="text-slate-500 font-bold block uppercase text-[9px]">
                Tim Petugas Bertugas:
              </span>
              {selectedTrx.assignedStaff.map((s, idx) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span>{s.staffName}</span>
                  <span className="text-slate-500">({s.role})</span>
                </div>
              ))}
            </div>
          )}

          {/* Daftar Item Obat */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-2">
            {selectedTrx.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <div className="flex-1 pr-2">
                  <div className="font-bold text-slate-900">{it.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {it.qty} {it.unit} x Rp {it.price.toLocaleString('id-ID')}
                    {it.discount ? ` (disc ${it.discount}%)` : ''}
                  </div>
                </div>
                <div className="font-bold text-slate-900 text-right">
                  Rp {it.subtotal.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>

          {/* Ringkasan Pembayaran */}
          <div className="space-y-1 text-right border-b border-dashed border-slate-400 pb-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>Rp {selectedTrx.subtotal.toLocaleString('id-ID')}</span>
            </div>
            {selectedTrx.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Diskon:</span>
                <span>-Rp {selectedTrx.discount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {Boolean(selectedTrx.serviceCharge) && selectedTrx.serviceCharge! > 0 && (
              <div className="flex justify-between text-indigo-700 font-bold">
                <span>Service Charge:</span>
                <span>+Rp {selectedTrx.serviceCharge!.toLocaleString('id-ID')}</span>
              </div>
            )}
            {Boolean(selectedTrx.pembulatan) && selectedTrx.pembulatan! > 0 && (
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Pembulatan:</span>
                <span>+Rp {selectedTrx.pembulatan!.toLocaleString('id-ID')}</span>
              </div>
            )}
            {selectedTrx.ppn ? (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>PPN 11%:</span>
                <span>Rp {selectedTrx.ppn.toLocaleString('id-ID')}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL:</span>
              <span className="text-emerald-800">Rp {selectedTrx.total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1">
              <span>Metode:</span>
              <span className="font-bold">{selectedTrx.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Bayar:</span>
              <span>Rp {selectedTrx.payAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Kembali:</span>
              <span>Rp {selectedTrx.change.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Footer Struk */}
          <div className="text-center text-[10px] text-slate-500 pt-2 space-y-1">
            <p className="font-bold text-slate-700">
              Terima kasih atas kepercayaan Anda.
            </p>
            <p>Semoga lekas sembuh dan sehat selalu!</p>
            <p className="text-[9px] text-slate-400 font-mono">
              Barang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali ada perjanjian.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. KARTU STOK FARMASI
  if (mode === 'kartu-stok') {
    const medId = searchParams.get('medId') || 'OBT-001';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let medicines: Medicine[] = INITIAL_MEDICINES;
    let mutations: StockMutation[] = INITIAL_STOCK_MUTATIONS;

    try {
      const savedMed = localStorage.getItem('latisha_medicines');
      if (savedMed) medicines = JSON.parse(savedMed);
      const savedMut = localStorage.getItem('latisha_stock_mutations');
      if (savedMut) mutations = JSON.parse(savedMut);
    } catch (e) {}

    const selectedMed = medicines.find((m) => m.id === medId) || medicines[0];
    if (!selectedMed) {
      return (
        <div className="bg-slate-100 min-h-screen text-slate-900 p-8 font-sans flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center max-w-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-2">Data Obat Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mb-4">Belum ada data master obat untuk kartu stok ini.</p>
            <button onClick={() => window.close()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Tutup Halaman
            </button>
          </div>
        </div>
      );
    }
    const filteredMutations = mutations.filter((m) => {
      const matchMed = m.medicineId === medId;
      if (!matchMed) return false;
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });

    const totalIn = filteredMutations.reduce((acc, m) => acc + m.inQty, 0);
    const totalOut = filteredMutations.reduce((acc, m) => acc + m.outQty, 0);

    return (
      <div className="bg-white min-h-screen text-slate-800 p-6 max-w-4xl mx-auto font-sans text-xs">
        {printStyles}
        {renderFloatingTopBar('Kartu Stok Resmi Farmasi')}

        <div id="printable-section" className="space-y-4 border border-slate-300 p-6 rounded-2xl bg-white shadow-xs">
          <div className="border-b-2 border-slate-900 pb-3">
            <div className="flex items-center justify-between gap-4">
              {pharmacyProfile.logoUrl ? (
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  <img
                    src={pharmacyProfile.logoUrl}
                    alt="Logo Faskes"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              ) : (
                <div className="w-14 shrink-0" />
              )}
              <div className="flex-1 text-center">
                <h2 className="font-black text-base text-slate-900 uppercase">
                  {pharmacyProfile.name}
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  {pharmacyFullAddress} · Telp: {pharmacyProfile.phone} · SIA: {pharmacyProfile.sia}
                </p>
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide mt-1">
                  KARTU STOK RESMI FARMASI (FEFO AUDIT LEDGER)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                  Nama Obat: <strong className="text-slate-900">{selectedMed?.name}</strong> · Batch:{' '}
                  <strong className="text-slate-900">{selectedMed?.batchNo}</strong> · Exp Date:{' '}
                  <strong className="text-slate-900">{selectedMed?.expDate}</strong> · Lokasi:{' '}
                  <strong className="text-slate-900">{selectedMed?.rack}</strong>
                </p>
              </div>
              <div className="w-14 shrink-0" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-[11px]">
            <div>Total Masuk: <span className="text-emerald-700">+{totalIn} {selectedMed?.unit}</span></div>
            <div>Total Keluar: <span className="text-rose-700">-{totalOut} {selectedMed?.unit}</span></div>
            <div>Saldo Saat Ini: <span className="text-sky-800">{selectedMed?.stock} {selectedMed?.unit}</span></div>
          </div>

          <table className="w-full text-left text-xs border border-collapse">
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
              <tr>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">No. Referensi</th>
                <th className="p-2 border">Jenis Mutasi</th>
                <th className="p-2 border text-center w-20">Masuk</th>
                <th className="p-2 border text-center w-20">Keluar</th>
                <th className="p-2 border text-center w-24">Saldo Akhir</th>
                <th className="p-2 border">Keterangan</th>
                <th className="p-2 border">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-slate-700">
              {filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    Belum ada catatan mutasi pergerakan stok untuk obat ini pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredMutations.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-2 border font-mono">{m.date}</td>
                    <td className="p-2 border font-mono font-bold text-sky-700">{m.refNo}</td>
                    <td className="p-2 border">
                      <span className="font-bold text-[10px] uppercase">{m.type}</span>
                    </td>
                    <td className="p-2 border text-center font-mono font-bold text-emerald-600">
                      {m.inQty > 0 ? `+${m.inQty}` : '-'}
                    </td>
                    <td className="p-2 border text-center font-mono font-bold text-rose-600">
                      {m.outQty > 0 ? `-${m.outQty}` : '-'}
                    </td>
                    <td className="p-2 border text-center font-mono font-black text-slate-900 bg-slate-50">
                      {m.balance}
                    </td>
                    <td className="p-2 border text-slate-600 text-[11px]">{m.ket}</td>
                    <td className="p-2 border text-slate-500 font-mono text-[10px]">{m.petugas}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="grid grid-cols-2 pt-6 text-xs">
            <div />
            <div className="text-center space-y-12">
              <p className="font-semibold text-slate-700">
                {pharmacyProfile.city}, {new Date().toLocaleDateString('id-ID')}<br />
                Penanggung Jawab Teknis Kefarmasian (APJ),
              </p>
              <div>
                <p className="font-extrabold underline text-slate-900">{apjProfile.name}</p>
                <p className="text-[10px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
                <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. FAKTUR PENJUALAN RESMI & KWITANSI PEMBAYARAN
  if (mode === 'faktur-penjualan' || mode === 'kwitansi-penjualan') {
    const trxId = searchParams.get('trxId') || '';
    const loggedInStaffName =
      searchParams.get('petugas') || localStorage.getItem('latisha_user_name') || '';

    let selectedTrx: Transaction | null = null;
    try {
      const activeSaved = localStorage.getItem('latisha_active_print_trx');
      if (activeSaved) {
        const parsed = JSON.parse(activeSaved);
        if (!trxId || parsed.id === trxId) {
          selectedTrx = parsed;
        }
      }
      if (!selectedTrx) {
        const savedList = localStorage.getItem('latisha_transactions');
        if (savedList) {
          const list: Transaction[] = JSON.parse(savedList);
          selectedTrx = list.find((t) => t.id === trxId) || list[0] || null;
        }
      }
    } catch (e) {}

    if (!selectedTrx) {
      return (
        <div className="bg-slate-100 min-h-screen text-slate-900 p-8 font-sans flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center max-w-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-2">Data Faktur Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mb-4">Tidak ada data faktur penjualan yang dapat dicetak saat ini.</p>
            <button onClick={() => window.close()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Tutup Halaman
            </button>
          </div>
        </div>
      );
    }

    const resolvedCustomer =
      !selectedTrx.customerName || selectedTrx.customerName === 'Pelanggan Umum'
        ? 'Reguler'
        : selectedTrx.customerName;

    const petugasAkun = loggedInStaffName || selectedTrx.kasir || apjProfile.name;

    return (
      <div className="bg-white min-h-screen text-slate-800 p-6 max-w-4xl mx-auto font-sans text-xs">
        {printStyles}
        <div className="no-print bg-slate-900 text-white p-3.5 rounded-2xl mb-6 flex flex-wrap justify-between items-center gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-xs">
              {activeInvoicePrintType === 'kwitansi' ? 'Kwitansi Pembayaran' : 'Faktur Penjualan Apotek'} · Pratinjau Cetak Mandiri
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveInvoicePrintType('faktur');
                setTimeout(safePrint, 150);
              }}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-sm transition ${
                activeInvoicePrintType === 'faktur'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Faktur</span>
            </button>
            <button
              onClick={() => {
                setActiveInvoicePrintType('kwitansi');
                setTimeout(safePrint, 150);
              }}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-sm transition ${
                activeInvoicePrintType === 'kwitansi'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kwitansi</span>
            </button>
            <button
              onClick={() => window.close()}
              className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer text-xs transition"
            >
              <X className="w-4 h-4" />
              <span>Tutup Jendela</span>
            </button>
          </div>
        </div>

        {activeInvoicePrintType === 'kwitansi' ? (
          <div
            id="printable-section"
            className="bg-white p-8 rounded-2xl shadow-xs border-2 border-slate-800 w-full max-w-2xl mx-auto text-slate-900 text-xs leading-relaxed space-y-4"
          >
            {/* KOP KWITANSI */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-center gap-4">
              <div className="flex items-center gap-3.5">
                {pharmacyProfile.logoUrl && (
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                    <img
                      src={pharmacyProfile.logoUrl}
                      alt="Logo Faskes"
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                    {pharmacyProfile.name}
                  </h2>
                  <p className="text-[11px] text-slate-700 font-medium">
                    {pharmacyFullAddress}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Telp / WhatsApp: {pharmacyProfile.phone} | Email: {pharmacyProfile.email}
                  </p>
                  <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                    <span>SIA: <strong>{pharmacyProfile.sia}</strong></span> |{' '}
                    <span>APJ: <strong>{apjProfile.name}</strong></span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-block px-3.5 py-1.5 bg-slate-900 text-white font-mono font-black text-sm rounded tracking-widest uppercase">
                  KWITANSI
                </div>
              </div>
            </div>

            {/* ISI KWITANSI */}
            <div className="space-y-4 text-xs my-4">
              <div className="grid grid-cols-12 items-center border-b border-dashed border-slate-300 pb-2.5">
                <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider">
                  No. Transaksi
                </div>
                <div className="col-span-8 font-mono font-black text-slate-900 text-sm">
                  : {selectedTrx.id}
                </div>
              </div>

              <div className="grid grid-cols-12 items-center border-b border-dashed border-slate-300 pb-2.5">
                <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider">
                  DITERIMA Dari
                </div>
                <div className="col-span-8 font-extrabold text-slate-900 text-sm">
                  : {resolvedCustomer}
                </div>
              </div>

              <div className="grid grid-cols-12 items-center border-b border-dashed border-slate-300 pb-2.5">
                <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider">
                  Nilai Tagihan
                </div>
                <div className="col-span-8">
                  <span className="inline-block px-4 py-1.5 bg-slate-100 border-2 border-slate-800 rounded font-mono font-black text-base text-slate-900">
                    Rp {selectedTrx.total.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 items-start border-b border-dashed border-slate-300 pb-3">
                <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider pt-1">
                  Terbilang
                </div>
                <div className="col-span-8 p-2.5 bg-slate-50 border border-slate-300 rounded italic font-bold text-slate-900">
                  # {getTerbilang(selectedTrx.total)} #
                </div>
              </div>
            </div>

            {/* TANGGAL & TANDA TANGAN PETUGAS SESUAI AKUN */}
            <div className="mt-8 pt-4 flex justify-end">
              <div className="w-64 text-center space-y-1">
                <p className="text-[11px] font-semibold text-slate-700">
                  {pharmacyProfile.city || 'Tangerang'}, {selectedTrx.date}
                </p>
                <p className="text-[11px] font-bold text-slate-800">
                  Petugas Penerima,
                </p>
                <div className="h-20 flex items-end justify-center">
                  <span className="text-[9px] text-slate-400 italic">(Tanda Tangan & Stempel)</span>
                </div>
                <p className="font-black text-slate-900 border-t border-slate-800 pt-1 text-xs">
                  {petugasAkun}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            id="printable-section"
            className="bg-white p-8 rounded-2xl shadow-xs border border-slate-300 w-full text-slate-900 text-xs leading-relaxed space-y-4"
          >
            {/* KOP APOTEK RESMI */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-center gap-4">
              <div className="flex items-center gap-3.5">
                {pharmacyProfile.logoUrl && (
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                    <img
                      src={pharmacyProfile.logoUrl}
                      alt="Logo Faskes"
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                    {pharmacyProfile.name}
                  </h2>
                  <p className="text-[11px] text-slate-700 font-medium">
                    {pharmacyFullAddress}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Telp / WhatsApp: {pharmacyProfile.phone} | Email: {pharmacyProfile.email}
                  </p>
                  <div className="text-[10px] text-slate-600 font-medium mt-1">
                    <span>SIA: <strong>{pharmacyProfile.sia}</strong></span> |{' '}
                    <span>NPWP: <strong>{pharmacyProfile.npwp}</strong></span> |{' '}
                    <span>APJ: <strong>{apjProfile.name}</strong> (SIPA: {apjProfile.sipa})</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-black text-xs rounded">
                  FAKTUR PENJUALAN
                </div>
                <div className="text-[10px] font-mono text-slate-600 mt-1">
                  No: <strong>{selectedTrx.id}</strong>
                </div>
              </div>
            </div>

            {/* Info Header */}
            <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  KEPADA YTH. (PEMESAN / FASKES):
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {resolvedCustomer}
                </p>
                {selectedTrx.customerAddress && (
                  <p className="text-slate-600 mt-0.5">{selectedTrx.customerAddress}</p>
                )}
                {selectedTrx.customerPhone && (
                  <p className="text-slate-600">Telp: {selectedTrx.customerPhone}</p>
                )}
              </div>

              <div className="space-y-1 text-right">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Faktur:</span>
                  <strong className="text-slate-800">{selectedTrx.date}</strong>
                </div>
                {selectedTrx.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jatuh Tempo:</span>
                    <strong className="text-amber-700">{selectedTrx.dueDate}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Syarat Pembayaran:</span>
                  <strong>{selectedTrx.term || 'Tunai / COD'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Petugas / Kasir:</span>
                  <strong>{selectedTrx.kasir}</strong>
                </div>
              </div>
            </div>

            {/* Tabel Rincian */}
            <table className="w-full border-collapse border border-slate-300 text-[11px] mb-4">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="border border-slate-300 p-2 text-center w-8">No</th>
                  <th className="border border-slate-300 p-2 text-left">Nama Obat / Alat Kesehatan</th>
                  <th className="border border-slate-300 p-2 text-left">Kekuatan</th>
                  <th className="border border-slate-300 p-2 text-left">No. Batch</th>
                  <th className="border border-slate-300 p-2 text-center">Exp Date</th>
                  <th className="border border-slate-300 p-2 text-center">Qty</th>
                  <th className="border border-slate-300 p-2 text-center">Satuan</th>
                  <th className="border border-slate-300 p-2 text-right">Harga</th>
                  <th className="border border-slate-300 p-2 text-center">Diskon</th>
                  <th className="border border-slate-300 p-2 text-right">Total (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {selectedTrx.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-800">{it.name}</td>
                    <td className="border border-slate-300 p-1.5">{it.kekuatan || '-'}</td>
                    <td className="border border-slate-300 p-1.5 font-mono">{it.batchNo || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono">{it.expDate || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold">{it.qty}</td>
                    <td className="border border-slate-300 p-1.5 text-center">{it.unit}</td>
                    <td className="border border-slate-300 p-1.5 text-right">{it.price.toLocaleString('id-ID')}</td>
                    <td className="border border-slate-300 p-1.5 text-center">
                      {it.discount && it.discount > 100
                        ? `Rp ${it.discount.toLocaleString('id-ID')}`
                        : `${it.discount || 0}%`}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold">
                      {it.subtotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Ringkasan */}
            <div className="flex justify-between items-start gap-6 mb-6 text-[11px]">
              <div className="flex-1 space-y-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <p className="font-bold text-slate-700">Terbilang:</p>
                  <p className="italic font-semibold text-slate-900 mt-0.5">
                    # {getTerbilang(selectedTrx.total)} #
                  </p>
                </div>

                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p><strong>Ketentuan Faktur:</strong></p>
                  <p>1. Barang yang sudah diterima dalam kondisi baik tidak dapat dikembalikan tanpa persetujuan.</p>
                  <p>2. Pembayaran via transfer harap ke Rekening Resmi: <strong>SEABANK 9015-5031-5849 a/n Mardin, BRI 7704-0101-3765-531 a/n Mardin</strong>.</p>
                </div>
              </div>

              <div className="w-64 space-y-1 text-slate-700 border border-slate-300 p-3 rounded bg-slate-50">
                <div className="flex justify-between">
                  <span>Dasar Pengenaan Pajak (DPP):</span>
                  <span className="font-mono">
                    Rp {(selectedTrx.dpp || (selectedTrx.total - (selectedTrx.ppn || 0))).toLocaleString('id-ID')}
                  </span>
                </div>
                {selectedTrx.ppn ? (
                  <div className="flex justify-between">
                    <span>PPN 11%:</span>
                    <span className="font-mono">Rp {selectedTrx.ppn.toLocaleString('id-ID')}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-slate-900 border-t border-slate-300 pt-1 text-xs">
                  <span>TOTAL FAKTUR:</span>
                  <span className="font-mono text-emerald-800">Rp {selectedTrx.total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* 3 Kolom Tanda Tangan */}
            <div className="grid grid-cols-3 gap-4 text-center text-[10px] pt-4 border-t border-slate-300">
              <div>
                <p className="font-bold text-slate-700">Yang Menerima / Faskes Pemesan,</p>
                <div className="h-16 flex items-end justify-center">
                  <p className="text-slate-400 italic text-[9px]">(Stempel & Tanda Tangan)</p>
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                  {resolvedCustomer}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">Petugas Gudang / Kasir,</p>
                <div className="h-16 flex items-end justify-center">
                  <p className="text-slate-400 italic text-[9px]">(Tanda Tangan)</p>
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                  {selectedTrx.kasir}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">Apoteker Pengelola Apotek (APJ),</p>
                <div className="h-16 flex items-end justify-center">
                  <p className="text-indigo-600 font-mono font-bold text-[9px]">Latisha Farma APJ Seal</p>
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                  {apjProfile.name}
                </p>
                <p className="text-[9px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
                <p className="text-[9px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. RESUME RME, SALINAN RESEP (COPY RX / APOGRAPH), ATAU SURAT SAKIT
  if (mode === 'rme' || mode === 'copy-resep' || mode === 'surat-sakit') {
    const rmeId = searchParams.get('rmeId') || '';
    let record: RMERecord | null = null;

    try {
      const activeRme = localStorage.getItem('latisha_active_print_rme');
      if (activeRme) {
        const parsed = JSON.parse(activeRme);
        if (!rmeId || parsed.id === rmeId) {
          record = parsed;
        }
      }
      if (!record) {
        const savedList = localStorage.getItem('latisha_rme_records');
        const list: RMERecord[] = savedList ? JSON.parse(savedList) : INITIAL_RME_RECORDS;
        record = list.find((r) => r.id === rmeId) || list[0] || null;
      }
    } catch (e) {
      record = INITIAL_RME_RECORDS.find((r) => r.id === rmeId) || INITIAL_RME_RECORDS[0] || null;
    }

    if (!record) {
      return (
        <div className="bg-slate-100 min-h-screen text-slate-900 p-8 font-sans flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center max-w-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-2">Data Rekam Medis Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mb-4">Tidak ada catatan RME yang dipilih untuk dicetak saat ini.</p>
            <button onClick={() => window.close()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Tutup Halaman
            </button>
          </div>
        </div>
      );
    }

    const toRomanNumeral = (num: number): string => {
      const n = Math.max(1, Math.round(num || 1));
      const map: [number, string][] = [
        [1000, 'M'],
        [900, 'CM'],
        [500, 'D'],
        [400, 'CD'],
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I']
      ];
      let res = '';
      let rem = n;
      for (const [val, sym] of map) {
        while (rem >= val) {
          res += sym;
          rem -= val;
        }
      }
      return res;
    };

    const formatStandardSigna = (dosage: string, unit: string): { latin: string; clearText: string } => {
      const raw = (dosage || '3x1 Sesudah Makan').trim();
      const lower = raw.toLowerCase();
      const unitLower = (unit || 'Tablet').toLowerCase();

      let freqLatin = '3 d.d. I';
      const freqMatch = lower.match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)/);
      if (freqMatch) {
        const times = parseInt(freqMatch[1], 10) || 1;
        const doseNum = parseFloat(freqMatch[2].replace(',', '.')) || 1;
        const doseRoman = Number.isInteger(doseNum) ? toRomanNumeral(doseNum) : String(doseNum);
        freqLatin = `${times} d.d. ${doseRoman}`;
      } else if (lower.includes('bila perlu') || lower.includes('prn')) {
        freqLatin = 'p.r.n. I';
      }

      let unitLatin = 'tab.';
      if (unitLower.includes('kapsul') || lower.includes('kapsul')) unitLatin = 'caps.';
      else if (unitLower.includes('kaplet') || lower.includes('kaplet')) unitLatin = 'capl.';
      else if (unitLower.includes('botol') || unitLower.includes('sirup') || lower.includes('sendok') || lower.includes('ml')) unitLatin = 'cth.';
      else if (unitLower.includes('tube') || unitLower.includes('salep') || unitLower.includes('krim') || lower.includes('oles')) unitLatin = 'u.e.';
      else if (unitLower.includes('bungkus') || unitLower.includes('puyer') || unitLower.includes('sachet')) unitLatin = 'pulv.';
      else if (unitLower.includes('ampul') || unitLower.includes('vial')) unitLatin = 'inj.';
      else if (unitLower.includes('tetes')) unitLatin = 'gtt.';

      let timeLatin = '';
      if (lower.includes('sesudah makan') || lower.includes('setelah makan') || lower.includes('p.c')) {
        timeLatin = 'p.c.';
      } else if (lower.includes('sebelum makan') || lower.includes('a.c')) {
        timeLatin = 'a.c.';
      } else if (lower.includes('bersama makan') || lower.includes('d.c')) {
        timeLatin = 'd.c.';
      }
      if (lower.includes('malam')) timeLatin = `${timeLatin} h.v.`.trim();
      if (lower.includes('pagi')) timeLatin = `${timeLatin} m.`.trim();
      if (lower.includes('habiskan') || lower.includes('antibiotik')) timeLatin = `${timeLatin} (habiskan)`.trim();

      const latin = `S ${freqLatin} ${unitLatin} ${timeLatin}`.replace(/\s+/g, ' ').trim();
      return { latin, clearText: raw };
    };

    const lookupPatientForRx = (rmId: string, patientName: string): Patient | null => {
      try {
        const saved = localStorage.getItem('latisha_patients');
        const list: Patient[] = saved ? JSON.parse(saved) : INITIAL_PATIENTS;
        return list.find((p) => p.id === rmId || p.name.toLowerCase() === patientName.toLowerCase()) || null;
      } catch {
        return INITIAL_PATIENTS.find((p) => p.id === rmId || p.name.toLowerCase() === patientName.toLowerCase()) || null;
      }
    };

    const patientInfo = lookupPatientForRx(record.rmId, record.patientName);
    const patientAddress = patientInfo?.address || `${pharmacyProfile.city} (Sesuai Data Rekam Medis)`;
    const patientPhone = patientInfo?.phone || '-';
    const patientAllergy = patientInfo?.allergy || 'Tidak ada riwayat alergi obat';

    return (
      <div className="bg-white min-h-screen text-slate-800 p-6 max-w-4xl mx-auto font-sans text-xs">
        {printStyles}
        {renderFloatingTopBar(
          mode === 'rme'
            ? 'Resume e-RME Pasien'
            : mode === 'copy-resep'
            ? 'Salinan Resep (Copy Rx / Apograph)'
            : 'Surat Keterangan Sakit'
        )}

        <div
          id="printable-section"
          className="space-y-6 border border-slate-300 p-8 rounded-2xl bg-white shadow-xs text-xs"
        >
          {/* Header Terintegrasi Profil Apotek (Hanya untuk RME & Surat Sakit) */}
          {mode !== 'copy-resep' && (
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between gap-4">
                {pharmacyProfile.logoUrl ? (
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                    <img
                      src={pharmacyProfile.logoUrl || '/api/facility-logo'}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/api/facility-logo';
                      }}
                      alt="Logo Faskes"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 shrink-0" />
                )}
                <div className="flex-1 text-center">
                  <h2 className="text-base font-black tracking-wider text-slate-900 uppercase">
                    {pharmacyProfile.name}
                  </h2>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {pharmacyFullAddress} · Telp / WA: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    SIA: {pharmacyProfile.sia} · APJ: {apjProfile.name} (SIPA: {apjProfile.sipa}) · DPJ: {dpjProfile.name} (SIP: {dpjProfile.sip})
                  </p>
                </div>
                <div className="w-16 shrink-0" />
              </div>
              <div className="text-center">
                <div className="mt-2 inline-block px-4 py-1 bg-sky-50 text-sky-900 rounded-full font-black text-xs uppercase border border-sky-200">
                  {mode === 'rme'
                    ? 'RESUME REKAM MEDIS PASIEN'
                    : 'SURAT KETERANGAN ISTIRAHAT SAKIT'}
                </div>
              </div>
            </div>
          )}

          {mode === 'rme' ? (
            <>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Identitas Pasien</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{record.patientName}</div>
                  <div className="font-mono text-slate-600 mt-0.5">
                    No. RM: <strong>{record.rmId}</strong> · {record.gender}, {record.age} tahun
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Waktu Pemeriksaan</span>
                  <div className="font-bold text-slate-800 mt-0.5">{record.date} · {record.time} WIB</div>
                  <div className="text-slate-600">Dokter: <strong>{record.doctorName}</strong></div>
                </div>
              </div>

              {record.assignedStaff && record.assignedStaff.length > 0 && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs">
                  <span className="text-[10px] text-indigo-900 font-bold uppercase block mb-1">
                    Tim Petugas Medis Bertugas:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {record.assignedStaff.map((st, i) => (
                      <span
                        key={i}
                        className="bg-white px-2 py-1 rounded-md border border-indigo-200 text-indigo-950 text-[10px] font-medium"
                      >
                        <strong>{st.staffName}</strong> ({st.role})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 font-mono text-xs flex flex-wrap gap-4 justify-between">
                <span>TD: <strong>{record.vitalSign.td} mmHg</strong></span>
                <span>Suhu: <strong>{record.vitalSign.suhu}°C</strong></span>
                <span>Nadi: <strong>{record.vitalSign.nadi} bpm</strong></span>
                <span>SpO2: <strong>{record.vitalSign.spo2}%</strong></span>
                {record.vitalSign.bb && <span>BB: <strong>{record.vitalSign.bb} kg</strong></span>}
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-sky-800 block text-[11px] mb-0.5 font-extrabold uppercase">
                    S - Subjective:
                  </strong>
                  <p className="text-slate-700">{record.soapS}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-sky-800 block text-[11px] mb-0.5 font-extrabold uppercase">
                    O - Objective:
                  </strong>
                  <p className="text-slate-700">{record.soapO}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <strong className="text-emerald-900 block text-[11px] mb-0.5 font-extrabold uppercase">
                    A - Assessment (Diagnosis ICD-10):
                  </strong>
                  <p className="font-extrabold text-emerald-950 text-sm">{record.soapA}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-sky-800 block text-[11px] mb-0.5 font-extrabold uppercase">
                    P - Plan:
                  </strong>
                  <p className="text-slate-700">{record.soapP || 'Edukasi dan terapi farmakologis sesuai resep.'}</p>
                </div>
              </div>
            </>
          ) : mode === 'copy-resep' ? (
            /* FORMAT BAKU SALINAN RESEP (COPY RX / APOGRAPH) SESUAI DESAIN ACUAN */
            <div className="space-y-4 text-xs font-mono text-green-700 bg-white p-2">
              {/* KOP SALINAN RESEP */}
              <div className="border-b-2 border-green-700 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                    <img
                      src={pharmacyProfile.logoUrl || '/api/facility-logo'}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/api/facility-logo';
                      }}
                      alt="Logo Faskes"
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  <div className="flex-1 text-center font-mono">
                    <h1 className="text-xl font-black text-green-700 tracking-wide uppercase">
                      {pharmacyProfile.name || 'Apotek LATISHA FARMA'}
                    </h1>
                    <p className="text-[11px] text-green-700 font-bold mt-0.5">
                      {pharmacyFullAddress || 'Jl. Poros KTM Tanjung Mas Makmur RT 004 RW 002'}
                    </p>
                    <p className="text-[11px] text-green-700 font-bold">
                      Kec. Mesuji Timur Kabupaten Mesuji - Lampung
                    </p>
                    <p className="text-[11px] text-green-700 font-bold">
                      Telp. {pharmacyProfile.phone || '0895326272957'}
                    </p>
                    <p className="text-[11px] text-green-700 font-bold">
                      SIA : {pharmacyProfile.sia || '23082300357340002'}
                    </p>
                    <p className="text-[11px] text-green-700 font-bold">
                      SIPA : {apjProfile.sipa || '400.7.5.4/256/SIPA/IV.13/MSJ/2026'}
                    </p>
                  </div>
                  <div className="w-20 shrink-0" />
                </div>
              </div>

              {/* JUDUL SALINAN RESEP */}
              <div className="text-center my-3">
                <h2 className="font-black text-base text-green-700 uppercase tracking-widest">
                  SALINAN RESEP
                </h2>
              </div>

              {/* METADATA INFORMASI RESEP & PASIEN (TABLE 2 KOLOM) */}
              <div className="grid grid-cols-2 gap-4 py-2 border-b-2 border-green-700 text-[11px] text-green-700 font-mono">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 shrink-0">No</span>
                    <span>: {record.id ? `RX/${record.date?.split('-').reverse().join('/') || '11/2026'}/00080` : 'RX/11/2026/00080'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Pelanggan</span>
                    <span>: {record.patientName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Dari Dokter</span>
                    <span>: {record.doctorName || dpjProfile.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Nama Pasien</span>
                    <span>: {record.patientName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Alamat</span>
                    <span>: {patientAddress}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Telepon</span>
                    <span>: {patientPhone}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-32 shrink-0">Tgl. Resep Asli</span>
                    <span>: {record.date}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 shrink-0">Tgl. Cetak</span>
                    <span>: {new Date().toISOString().split('T')[0].split('-').reverse().join('-')}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 shrink-0">Umur</span>
                    <span>: {record.age} Tahun</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 shrink-0">Iter</span>
                    <span>: 0</span>
                  </div>
                </div>
              </div>

              {/* DAFTAR ITEM RESEP */}
              <div className="py-4 space-y-6 text-xs text-slate-900 font-mono">
                {record.prescription && record.prescription.length > 0 ? (
                  record.prescription.map((item, idx) => {
                    const romanQty = toRomanNumeral(item.qty);
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-baseline gap-3">
                          <span className="font-black text-base text-slate-900 shrink-0">R /</span>
                          <span className="font-bold text-sm text-slate-900 flex-1 uppercase">
                            {item.name} No. {romanQty}
                          </span>
                        </div>
                        <div className="pl-8 text-xs font-semibold text-slate-800">
                          S {item.dosage || '1x Sehari'}
                        </div>
                        <div className="text-right text-xs font-mono font-bold text-slate-900 pt-1">
                          det {item.qty || 1}
                        </div>
                        <div className="border-b-2 border-slate-900 pt-2" />
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 italic">
                    Tidak ada item obat pada resep ini.
                  </div>
                )}
              </div>

              {/* FOOTER PCC & TANDA TANGAN APOTEKER */}
              <div className="pt-8 space-y-12 text-green-700 font-mono">
                <div className="text-center font-bold text-sm tracking-widest text-green-700">
                  PCC
                </div>
                <div className="text-center font-bold text-xs space-y-1">
                  <p className="underline text-green-700 font-bold">
                    apt. {apjProfile.name || 'Mardin, S.Farm'}
                  </p>
                  <p className="uppercase text-[10px] text-green-700 font-bold tracking-wider">
                    APOTEKER
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4 text-xs leading-relaxed">
              <p>
                Yang bertanda tangan di bawah ini, Dokter Pemeriksa <strong>{pharmacyProfile.name}</strong> ({dpjProfile.name} · {dpjProfile.specialization}) menerangkan bahwa:
              </p>
              <div className="pl-6 space-y-1.5 font-medium">
                <div className="grid grid-cols-4">
                  <span className="text-slate-500">Nama Pasien</span>
                  <span className="col-span-3 font-bold text-slate-900">: {record.patientName}</span>
                </div>
                <div className="grid grid-cols-4">
                  <span className="text-slate-500">No. Rekam Medis</span>
                  <span className="col-span-3 font-mono font-bold">: {record.rmId}</span>
                </div>
                <div className="grid grid-cols-4">
                  <span className="text-slate-500">Umur / Gender</span>
                  <span className="col-span-3">: {record.age} tahun / {record.gender}</span>
                </div>
                <div className="grid grid-cols-4">
                  <span className="text-slate-500">Diagnosis Medis</span>
                  <span className="col-span-3 font-bold text-emerald-800">: {record.soapA}</span>
                </div>
              </div>

              <p>
                Berdasarkan hasil pemeriksaan klinis kami, yang bersangkutan dalam keadaan <strong>SAKIT</strong> dan memerlukan istirahat selama <strong>2 (dua) hari</strong> terhitung sejak tanggal <strong>{record.date}</strong> sampai dengan <strong>{new Date(Date.now() + 86400000).toISOString().split('T')[0]}</strong>.
              </p>
              <p>Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
            </div>
          )}

          {mode === 'copy-resep' ? null : (
            <div className="grid grid-cols-2 pt-6 text-xs">
              <div />
              <div className="text-center space-y-14">
                <p className="font-semibold text-slate-700">
                  {pharmacyProfile.city}, {record.date}<br />
                  Dokter Pemeriksa / Penanggung Jawab Klinis (DPJ),
                </p>
                <div>
                  <p className="font-extrabold underline text-slate-900">{record.doctorName || dpjProfile.name}</p>
                  <p className="text-[10px] text-slate-600 font-mono">SIP: {dpjProfile.sip}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{dpjProfile.idi}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6. KARTU PASIEN (PATIENT MEMBERSHIP CARD)
  if (mode === 'kartu-pasien') {
    const patientId = searchParams.get('patientId') || '';
    let patient: Patient | null = null;

    try {
      const savedActive = localStorage.getItem('latisha_active_print_patient');
      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        if (!patientId || parsed.id === patientId) {
          patient = parsed;
        }
      }
      if (!patient) {
        const savedList = localStorage.getItem('latisha_patients');
        if (savedList) {
          const list: Patient[] = JSON.parse(savedList);
          patient = list.find((p) => p.id === patientId) || list[0] || null;
        }
      }
    } catch (e) {}

    if (!patient) {
      return (
        <div className="bg-slate-100 min-h-screen text-slate-900 p-8 font-sans flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center max-w-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-2">Data Pasien Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mb-4">Tidak ada data pasien yang dipilih untuk dicetak saat ini.</p>
            <button onClick={() => window.close()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Tutup Halaman
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-100 min-h-screen text-slate-900 p-6 flex flex-col items-center justify-center font-sans text-xs">
        {printStyles}
        <div className="w-full max-w-md mb-4">
          {renderFloatingTopBar('Kartu Berobat Pasien')}
        </div>

        {/* Card Component */}
        <div
          id="printable-section"
          className="w-full max-w-md bg-gradient-to-br from-sky-900 via-sky-800 to-indigo-900 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-sky-700 space-y-4"
        >
          <div className="flex justify-between items-start border-b border-sky-700/60 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              {pharmacyProfile.logoUrl && (
                <div className="w-10 h-10 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center shadow-xs">
                  <img
                    src={pharmacyProfile.logoUrl}
                    alt="Logo Faskes"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h2 className="font-black text-sm tracking-wide uppercase text-white">
                  {pharmacyProfile.name}
                </h2>
                <p className="text-[9px] text-sky-200 mt-0.5">
                  {pharmacyFullAddress} · Telp: {pharmacyProfile.phone}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-full uppercase tracking-wider shrink-0">
              {patient.category || 'Pasien Umum'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider block">
              Nomor Rekam Medis (No. RM)
            </span>
            <div className="font-mono font-black text-2xl tracking-widest text-white">
              {patient.id}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[9px] text-sky-300 uppercase block font-semibold">Nama Pasien</span>
              <strong className="text-white text-sm block font-bold truncate">{patient.name}</strong>
              <span className="text-[10px] text-sky-200 font-mono">
                {patient.gender} · {patient.age} Tahun
              </span>
            </div>
            <div>
              <span className="text-[9px] text-sky-300 uppercase block font-semibold">NIK Pasien</span>
              <span className="font-mono text-white text-[11px] block">{patient.nik}</span>
              <span className="text-[10px] text-sky-200 font-mono">
                Telp: {patient.phone || '-'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-sky-700/60 flex justify-between items-center text-[9px] text-sky-200">
            <span>Tgl Registrasi: {patient.registrationDate || '2026-01-01'}</span>
            <span className="font-mono italic font-bold">Wajib dibawa saat berobat</span>
          </div>
        </div>
      </div>
    );
  }

  // 7. LAPORAN KEUANGAN & AUDIT MEDIS
  if (mode === 'laporan-keuangan') {
    const tabParam = searchParams.get('tab') || 'fee-medis';
    const startDate = searchParams.get('startDate') || '2026-10-01';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    let transactions: Transaction[] = INITIAL_TRANSACTIONS;
    let rmeRecords: RMERecord[] = INITIAL_RME_RECORDS;
    try {
      const savedTrx = localStorage.getItem('latisha_transactions');
      if (savedTrx) transactions = JSON.parse(savedTrx);
      const savedRme = localStorage.getItem('latisha_rme_records');
      if (savedRme) rmeRecords = JSON.parse(savedRme);
    } catch (e) {}

    const filteredTrx = transactions.filter((t) => {
      const d = t.date.split(' ')[0];
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });

    const totalOmzet = filteredTrx.reduce((acc, t) => acc + t.total, 0);
    const totalHpp = filteredTrx.reduce((acc, t) => acc + t.hppTotal, 0);
    const grossProfit = totalOmzet - totalHpp;

    return (
      <div className="bg-white min-h-screen text-slate-800 p-6 max-w-4xl mx-auto font-sans text-xs">
        {printStyles}
        {renderFloatingTopBar('Laporan Keuangan & Rekapitulasi')}

        <div id="printable-section" className="space-y-6 border border-slate-300 p-8 rounded-2xl bg-white shadow-xs">
          <div className="border-b-2 border-slate-900 pb-4">
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
              <div className="flex-1 text-center">
                <h2 className="font-black text-base text-slate-900 uppercase">
                  {pharmacyProfile.name}
                </h2>
                <p className="text-[11px] text-slate-600">
                  {pharmacyFullAddress} · Telp: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  SIA: {pharmacyProfile.sia} · NPWP: {pharmacyProfile.npwp} · APJ: {apjProfile.name} (SIPA: {apjProfile.sipa})
                </p>
              </div>
              <div className="w-16 shrink-0" />
            </div>
            <div className="text-center">
              <div className="mt-2 inline-block px-4 py-1 bg-emerald-50 text-emerald-900 rounded-full font-black text-xs uppercase border border-emerald-300">
                LAPORAN KEUANGAN RESMI & REKAPITULASI PELAYANAN
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                Periode: {startDate} s.d. {endDate}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Omzet Penjualan</span>
              <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                Rp {totalOmzet.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">HPP Obat Terjual (COGS)</span>
              <span className="text-base font-black font-mono text-amber-800 mt-1 block">
                Rp {totalHpp.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-800 uppercase block font-bold">Laba Kotor (Gross Profit)</span>
              <span className="text-base font-black font-mono text-emerald-800 mt-1 block">
                Rp {grossProfit.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Daftar Riwayat Transaksi Jalur Kasir & Pasien:
            </h3>
            <table className="w-full text-left text-xs border border-collapse">
              <thead className="bg-slate-100 font-bold text-[10px] uppercase text-slate-700">
                <tr>
                  <th className="p-2 border">No. Transaksi</th>
                  <th className="p-2 border">Tanggal & Waktu</th>
                  <th className="p-2 border">Nama Pelanggan / Pasien</th>
                  <th className="p-2 border">Jalur</th>
                  <th className="p-2 border text-right">Total Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700 font-medium">
                {filteredTrx.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-2 border font-mono font-bold text-sky-800">{t.id}</td>
                    <td className="p-2 border font-mono">{t.date}</td>
                    <td className="p-2 border font-bold text-slate-900">{t.customerName}</td>
                    <td className="p-2 border">{t.type}</td>
                    <td className="p-2 border text-right font-mono font-bold">
                      Rp {t.total.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 pt-8 text-xs">
            <div className="text-center space-y-12">
              <p className="font-semibold text-slate-700">
                Mengetahui,<br />
                Dokter Penanggung Jawab Klinis (DPJ),
              </p>
              <div>
                <p className="font-extrabold underline text-slate-900">{dpjProfile.name}</p>
                <p className="text-[10px] text-slate-600 font-mono">SIP: {dpjProfile.sip}</p>
                <p className="text-[10px] text-slate-500 font-mono">{dpjProfile.idi}</p>
              </div>
            </div>
            <div className="text-center space-y-12">
              <p className="font-semibold text-slate-700">
                {pharmacyProfile.city}, {new Date().toLocaleDateString('id-ID')}<br />
                Disahkan oleh Apoteker Penanggung Jawab (APJ),
              </p>
              <div>
                <p className="font-extrabold underline text-slate-900">{apjProfile.name}</p>
                <p className="text-[10px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
                <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. RETUR PEMBELIAN (PURCHASE RETURN NOTE)
  if (mode === 'retur-pembelian') {
    const invoiceId = searchParams.get('invoiceId') || '';
    const returId = searchParams.get('returId') || '';
    let returInv: any = null;

    try {
      // Prioritas 1: Sesi cetak retur aktif (latisha_active_print_retur)
      // Membawa state input atau edit terbaru hasil two-way binding dari form secara 100% dinamis
      const savedRetur = localStorage.getItem('latisha_active_print_retur');
      let parsedActive: any = null;
      if (savedRetur) {
        try {
          parsedActive = JSON.parse(savedRetur);
        } catch (e) {}
      }

      const savedReturns = localStorage.getItem('latisha_purchase_returns');
      let returnList: any[] = [];
      if (savedReturns) {
        try {
          returnList = JSON.parse(savedReturns);
        } catch (e) {}
      }

      // A. Jika returId ditentukan, utamakan yang memiliki ID cocok
      if (returId) {
        if (parsedActive && (parsedActive.id === returId || parsedActive.returnId === returId)) {
          returInv = parsedActive;
        } else if (returnList.length > 0) {
          const matchInList = returnList.find((r: any) => r.id === returId || r.returnId === returId);
          if (matchInList) {
            returInv = matchInList;
          }
        }
      }

      // B. Jika belum ketemu dan ada parsedActive dari sesi form saat ini, gunakan parsedActive
      if (!returInv && parsedActive && Array.isArray(parsedActive.items) && parsedActive.items.length > 0) {
        returInv = parsedActive;
      }

      // C. Prioritas jika belum ketemu: cari di arsip returnList
      if (!returInv && returnList.length > 0) {
        const matchByInv = returnList.find(
          (r: any) =>
            (invoiceId && (r.invoiceId === invoiceId || r.invoiceNo === invoiceId || r.id === invoiceId)) ||
            (returId && (r.id === returId || r.returnId === returId))
        );
        if (matchByInv) {
          returInv = matchByInv;
        }
      }

      // D. Prioritas terakhir: arsip faktur pembelian (latisha_purchase_invoices) jika cetak awal
      if (!returInv && invoiceId) {
        const savedInvoices = localStorage.getItem('latisha_purchase_invoices');
        if (savedInvoices) {
          const invList = JSON.parse(savedInvoices);
          const foundInv = invList.find((i: any) => i.id === invoiceId || i.invoiceNo === invoiceId) || invList[0] || null;
          if (foundInv) {
            returInv = foundInv;
          }
        }
      }
    } catch (e) {
      console.error('Error loading print retur data:', e);
    }

    if (!returInv) {
      returInv = {
        id: 'RET-SAMPLE',
        pbfName: 'PT Kimia Farma Trading & Distribution',
        invoiceNo: 'FP/2026/001',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        salesman: 'Budi Santoso',
        term: '30 Hari',
        usePpn: true,
        items: [
          { medicineId: 'OBT-001', name: 'Paracetamol 500mg Tablet', qty: 10, unit: 'Box', batchNo: 'B260101', expDate: '2028-12-31', price: 50000, disc: 0, subtotal: 500000, reason: '', alasan: '' }
        ],
        grossDpp: 500000,
        totalDiscountAmount: 0,
        dpp: 500000,
        ppn: 55000,
        totalTagihan: 555000,
        status: 'Belum Lunas',
        branchId: 'BR-01'
      };
    }

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const totalRetur = (returInv.items || []).reduce((acc: number, it: any) => acc + (it.subtotal || (it.qty * it.price) || 0), 0);

    return (
      <div className="bg-white min-h-screen text-slate-800 p-6 max-w-4xl mx-auto font-sans text-xs">
        {printStyles}
        {renderFloatingTopBar('Surat Retur Pembelian / Pengembalian Barang')}

        <div
          id="printable-section"
          className="space-y-4 border-2 border-slate-900 p-8 rounded-2xl bg-white shadow-xs text-xs leading-relaxed"
        >
          {/* KOP APOTEK TERINTEGRASI PROFIL APOTEK & APJ */}
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
              <div className="flex-1 text-center">
                <h2 className="font-black text-xl text-slate-900 uppercase tracking-wide">
                  {pharmacyProfile.name}
                </h2>
                <p className="text-[11px] text-slate-800 font-medium">
                  {pharmacyFullAddress}
                </p>
                <p className="text-[10px] text-slate-600">
                  Telp / WhatsApp: {pharmacyProfile.phone} | Email: {pharmacyProfile.email} | SIA: {pharmacyProfile.sia}
                </p>
              </div>
              <div className="w-16 shrink-0" />
            </div>
            <div className="text-center">
              <div className="mt-3 inline-block px-5 py-1 bg-rose-700 text-white rounded-md font-black text-xs uppercase tracking-wider">
                NOTA / SURAT RETUR PEMBELIAN BARANG KE PBF
              </div>
            </div>
          </div>

          {/* Info Faktur Asal & PBF */}
          <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-300 text-xs">
            <div>
              <p className="text-slate-600 font-bold uppercase text-[10px]">FAKTUR ASAL PBF:</p>
              <p className="font-mono font-black text-slate-900 text-sm mt-0.5">
                No. Faktur: {returInv.invoiceNo}
              </p>
              {(returInv.returnId || (returInv.id && String(returInv.id).startsWith('RET-'))) && (
                <p className="text-rose-700 font-mono font-extrabold text-xs mt-0.5">
                  No. Dokumen Retur: {returInv.returnId || returInv.id}
                </p>
              )}
              <p className="text-slate-600 mt-1 font-medium">Tanggal Faktur: {returInv.date}</p>
              <p className="text-slate-600 font-medium">Tanggal Cetak Retur: {todayStr}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-600 font-bold uppercase text-[10px]">DIKEMBALIKAN KEPADA PBF:</p>
              <p className="font-black text-slate-900 text-sm mt-0.5">{returInv.pbfName}</p>
              <p className="text-slate-600 text-[11px]">Salesman: {returInv.salesman || '-'}</p>
              {returInv.petugas && (
                <p className="text-slate-500 text-[10px] mt-0.5">Petugas Apotek: {returInv.petugas}</p>
              )}
            </div>
          </div>

          <p className="text-slate-800 font-medium">
            Bersama surat ini, pihak <strong>{pharmacyProfile.name}</strong> secara resmi mengajukan pengembalian (retur) barang/sediaan farmasi dengan rincian dan alasan retur sebagai berikut:
          </p>

          {/* Tabel Item Retur */}
          <table className="w-full text-left text-xs border border-collapse border-slate-400">
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-900 border-b border-slate-400">
              <tr>
                <th className="p-2 border border-slate-400 text-center w-8">No</th>
                <th className="p-2 border border-slate-400">Nama Obat / Sediaan</th>
                <th className="p-2 border border-slate-400 text-center w-28">No. Batch & ED</th>
                <th className="p-2 border border-slate-400 text-center w-24">Jumlah Retur</th>
                <th className="p-2 border border-slate-400 text-right">Harga Satuan</th>
                <th className="p-2 border border-slate-400 text-right">Subtotal Retur</th>
                <th className="p-2 border border-slate-400">Alasan Retur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-medium text-slate-900">
              {(returInv.items || []).map((it: any, idx: number) => {
                // Ekstraksi nilai string alasan retur secara akurat dan bersih tanpa nilai default statis
                const rawReason = (it.reason && String(it.reason).trim() !== '') ? it.reason
                  : (it.alasan && String(it.alasan).trim() !== '') ? it.alasan
                  : (it.alasanRetur && String(it.alasanRetur).trim() !== '') ? it.alasanRetur
                  : (it.notes && String(it.notes).trim() !== '') ? it.notes
                  : (it.keterangan && String(it.keterangan).trim() !== '') ? it.keterangan
                  : (returInv.reason ?? returInv.alasan ?? returInv.alasanRetur ?? returInv.notes ?? '');
                const finalReason = typeof rawReason === 'string' ? rawReason.trim() : String(rawReason || '').trim();

                return (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="p-2 border border-slate-400 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border border-slate-400 font-bold text-slate-900">{it.name}</td>
                    <td className="p-2 border border-slate-400 text-center font-mono text-[10px]">
                      <div>{it.batchNo || '-'}</div>
                      <div className="text-slate-500">ED: {it.expDate || '-'}</div>
                    </td>
                    <td className="p-2 border border-slate-400 text-center font-mono font-black text-rose-700">
                      {it.qty} {it.unit}
                    </td>
                    <td className="p-2 border border-slate-400 text-right font-mono">
                      Rp {Number(it.price || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-2 border border-slate-400 text-right font-mono font-bold">
                      Rp {Number(it.subtotal || (it.qty * it.price) || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-2 border border-slate-400 text-[11px] text-slate-900">
                      {finalReason !== '' ? (
                        <span className="font-bold text-slate-950">{finalReason}</span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-400 text-slate-900">
                <td colSpan={5} className="p-2 border border-slate-400 text-right uppercase text-[10px]">
                  Total Nilai Barang Retur:
                </td>
                <td className="p-2 border border-slate-400 text-right font-mono font-black text-rose-700 text-sm">
                  Rp {totalRetur.toLocaleString('id-ID')}
                </td>
                <td className="p-2 border border-slate-400 bg-slate-50"></td>
              </tr>
            </tfoot>
          </table>

          {/* Tanda Tangan */}
          <div className="grid grid-cols-2 pt-8 text-xs">
            <div className="text-center space-y-12">
              <p className="font-bold text-slate-800">
                Disetujui Oleh (Sales / PBF),
              </p>
              <div>
                <p className="font-bold border-b border-slate-400 pb-1 text-slate-900">( ........................................ )</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Nama & Stempel PBF</p>
              </div>
            </div>

            <div className="text-center space-y-12">
              <p className="font-bold text-slate-800">
                {pharmacyProfile.city}, {todayStr}<br />
                Hormat Kami, Apoteker Penanggung Jawab (APJ),
              </p>
              <div>
                <p className="font-black underline text-slate-900 text-sm">{apjProfile.name}</p>
                <p className="text-[10px] text-slate-700 font-mono">SIPA: {apjProfile.sipa}</p>
                <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE 9: DOKUMEN RESMI TELAAH DRPs (CDSS APOTEKER)
  // ==========================================
  if (mode === 'telaah-drp') {
    let drpPayload: any = null;
    try {
      const raw = sessionStorage.getItem('latisha_active_print_drp') || localStorage.getItem('latisha_active_print_drp');
      if (raw) {
        drpPayload = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading active print DRP:', e);
    }

    const rx = drpPayload?.rx;
    const patient = drpPayload?.patient;
    const rme = drpPayload?.rme;
    const drpData = drpPayload?.data;

    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex flex-col items-center">
        {printStyles}
        <div className="w-full max-w-4xl">
          {renderFloatingTopBar('Lembar Hasil Telaah DRPs & Rekomendasi Apoteker (CDSS)')}
        </div>

        <div
          id="printable-section"
          className="bg-white w-full max-w-4xl p-8 rounded-3xl shadow-xl border border-slate-300 text-slate-800 space-y-6"
        >
          {/* Header Kop Apotek Terintegrasi Profil Apotek & APJ */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3.5">
              {pharmacyProfile.logoUrl && (
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  <img
                    src={pharmacyProfile.logoUrl}
                    alt="Logo Faskes"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  {pharmacyProfile.name}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  SIA: {pharmacyProfile.sia} · SIPA APJ: {apjProfile.sipa} · STRA: {apjProfile.stra}
                </p>
                <p className="text-xs text-slate-600">
                  {pharmacyFullAddress} · Telp: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black rounded-lg inline-block uppercase">
                CDSS Clinical Pharmacy
              </span>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Waktu Telaah: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
              </p>
            </div>
          </div>

          <div className="text-center pt-1">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
              Lembar Telaah Drug-Related Problems (DRPs) & Keputusan Klinis Apoteker
            </h2>
            <p className="text-xs text-slate-500">
              Berdasarkan Standar BNF 86, Lexicomp, Pedoman Praktik Klinis Kemenkes RI, dan Rekam Medis Elektronik (RME)
            </p>
          </div>

          {/* Profil Pasien & Resep */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">No. E-Resep</span>
              <span className="font-mono font-black text-slate-900 text-sm">{rx?.id || searchParams.get('rxId') || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Nama Pasien</span>
              <span className="font-black text-slate-900 text-sm">{patient?.name || rx?.patientName || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">No. RM / Usia</span>
              <span className="font-bold text-slate-900">{patient?.rmId || rx?.rmId || '-'} ({patient?.age || '-'} th)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Dokter Peresep</span>
              <span className="font-bold text-slate-900">{rx?.doctorName || dpjProfile.name}</span>
            </div>

            <div className="col-span-2">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Diagnosa ICD-10 (RME)</span>
              <span className="font-bold text-slate-900">
                {rme?.icdName ? `${rme.icdCode} - ${rme.icdName}` : (rme?.soapA || 'Infeksi Saluran Napas')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Tanda Vital RME</span>
              <span className="font-mono font-bold text-slate-900">
                TD: {rme?.vitalSign?.td || '120/80'} | S: {rme?.vitalSign?.suhu || '36.5'}°C
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Riwayat Alergi</span>
              <span className="font-bold text-rose-700">
                {patient?.allergy || 'Tidak ada riwayat'}
              </span>
            </div>
          </div>

          {/* Banner Tingkat Risiko */}
          <div
            className={`p-3.5 rounded-2xl border-2 text-xs flex justify-between items-center ${
              drpData?.riskLevel === 'CRITICAL'
                ? 'bg-rose-50 border-rose-400 text-rose-950'
                : drpData?.riskLevel === 'MODERATE'
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-emerald-50 border-emerald-400 text-emerald-950'
            }`}
          >
            <div>
              <span className="font-black uppercase tracking-wider block text-[11px]">
                Status Telaah Risiko Klinis: {drpData?.riskLevel || 'EVALUASI'}
              </span>
              <p className="font-medium mt-0.5">{drpData?.summary || '-'}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase text-white shrink-0 ml-4 ${
                drpData?.riskLevel === 'CRITICAL'
                  ? 'bg-rose-600'
                  : drpData?.riskLevel === 'MODERATE'
                  ? 'bg-amber-600'
                  : 'bg-emerald-600'
              }`}
            >
              {drpData?.riskLevel === 'CRITICAL' ? 'BAHAYA KRITIS' : drpData?.riskLevel === 'MODERATE' ? 'PERHATIAN / MODERATE' : 'AMAN'}
            </span>
          </div>

          {/* Resep Obat */}
          <div className="space-y-2">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wide">
              1. Daftar Obat yang Diresepkan:
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2 border-b">No</th>
                    <th className="p-2 border-b">Nama Obat</th>
                    <th className="p-2 border-b">Jumlah</th>
                    <th className="p-2 border-b">Aturan Pakai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rx?.items?.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{it.name}</td>
                      <td className="p-2 font-mono">{it.qty} {it.unit}</td>
                      <td className="p-2 font-medium">{it.dosage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Terstruktur Temuan DRPs & Literatur Standar */}
          <div className="space-y-2">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wide">
              2. Temuan Drug-Related Problems (DRPs) & Rujukan Literatur Standar:
            </h3>
            {drpData?.identifiedDRPs && drpData.identifiedDRPs.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-2 border-b">Obat Bermasalah</th>
                      <th className="p-2 border-b">Kategori DRP</th>
                      <th className="p-2 border-b text-center">Tingkat</th>
                      <th className="p-2 border-b">Penjelasan Klinis & Mekanisme</th>
                      <th className="p-2 border-b">Rekomendasi Apoteker</th>
                      <th className="p-2 border-b">Literatur Acuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {drpData.identifiedDRPs.map((drp: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900 align-top">{drp.drugName}</td>
                        <td className="p-2 align-top">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border text-slate-800">
                            {drp.category}
                          </span>
                        </td>
                        <td className="p-2 text-center align-top">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${
                              drp.severity === 'Kritis' ? 'bg-rose-600' : 'bg-amber-600'
                            }`}
                          >
                            {drp.severity}
                          </span>
                        </td>
                        <td className="p-2 text-slate-700 align-top leading-relaxed">{drp.clinicalExplanation}</td>
                        <td className="p-2 text-slate-900 font-semibold align-top leading-relaxed">{drp.recommendation}</td>
                        <td className="p-2 text-indigo-900 font-mono text-[10px] align-top space-y-1">
                          <div className="font-semibold">{drp.literatureReference}</div>
                          {drp.referenceUrl && (
                            <div className="text-[9px] text-slate-500 break-all underline">
                              Tautan: {drp.referenceUrl}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold">
                ✓ Tidak ditemukan masalah DRPs bermakna. Seluruh peresepan rasional menurut BNF dan Formularium Nasional.
              </div>
            )}
          </div>

          {/* Rekomendasi Apoteker */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300 space-y-1.5 text-xs">
            <h4 className="font-black text-slate-900 uppercase text-[11px]">
              3. Poin Konsultasi Apoteker ke Dokter Peresep:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium">
              {drpData?.pharmacistRecommendations?.map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Tanda Tangan Pengesahan Terintegrasi DPJ & APJ */}
          <div className="grid grid-cols-2 pt-8 text-xs">
            <div className="text-center space-y-12">
              <p className="font-bold text-slate-800">
                Dokter Penulis Resep (DPJ),
              </p>
              <div>
                <p className="font-bold border-b border-slate-400 pb-1 text-slate-900">
                  {rx?.doctorName || dpjProfile.name}
                </p>
                <p className="text-[10px] text-slate-600 font-mono mt-0.5">SIP: {dpjProfile.sip}</p>
                <p className="text-[10px] text-slate-500 font-mono">{dpjProfile.idi}</p>
              </div>
            </div>

            <div className="text-center space-y-12">
              <p className="font-bold text-slate-800">
                {pharmacyProfile.city}, {new Date().toLocaleDateString('id-ID')}<br />
                Apoteker Penelaah Resep (APJ),
              </p>
              <div>
                <p className="font-black underline text-slate-900 text-sm">{apjProfile.name}</p>
                <p className="text-[10px] text-slate-700 font-mono">SIPA: {apjProfile.sipa}</p>
                <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE 10: LAPORAN MEDIS & MORBIDITAS ICD-10 (DOKUMEN RESMI DPJ)
  // ==========================================
  if (mode === 'laporan-morbiditas') {
    const reportType = (searchParams.get('reportType') || 'KUNJUNGAN') as 'KUNJUNGAN' | 'KASUS';
    const startDate = searchParams.get('startDate') || '2026-10-01';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    let rmeRecords: RMERecord[] = INITIAL_RME_RECORDS;
    try {
      const savedRme = localStorage.getItem('latisha_rme_records');
      if (savedRme) rmeRecords = JSON.parse(savedRme);
    } catch (e) {}

    const filteredRecords = rmeRecords.filter((ex) => {
      const matchDate = (!startDate || ex.date >= startDate) && (!endDate || ex.date <= endDate);
      return matchDate;
    });

    return (
      <div className="bg-white min-h-screen text-slate-800 p-6 max-w-4xl mx-auto font-sans text-xs">
        {printStyles}
        {renderFloatingTopBar('Laporan Medis & Morbiditas ICD-10')}

        <div id="printable-section" className="space-y-6 border border-slate-300 p-8 rounded-2xl bg-white shadow-xs">
          {/* Kop Surat Terintegrasi Profil Apotek, APJ, dan DPJ */}
          <div className="border-b-2 border-slate-900 pb-4">
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
              <div className="flex-1 text-center">
                <h2 className="font-black text-base text-slate-900 uppercase tracking-wider">
                  {pharmacyProfile.name}
                </h2>
                <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                  {pharmacyFullAddress} · Telepon / WA: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
                </p>
                <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                  SIA: <strong>{pharmacyProfile.sia}</strong> · NIB: {pharmacyProfile.nib} · APJ: <strong>{apjProfile.name}</strong> (SIPA: {apjProfile.sipa})
                </p>
                <p className="text-[10px] text-emerald-800 font-mono font-bold mt-0.5">
                  Dokter Penanggung Jawab (DPJ): {dpjProfile.name} · SIP: {dpjProfile.sip} · {dpjProfile.idi}
                </p>
              </div>
              <div className="w-16 shrink-0" />
            </div>
            <div className="text-center">
              <div className="mt-3 inline-block px-4 py-1 bg-sky-100 text-sky-900 rounded-full font-black text-xs uppercase border border-sky-200">
                {reportType === 'KUNJUNGAN' && 'LAPORAN REKAPITULASI KUNJUNGAN PASIEN'}
                {reportType === 'KASUS' && 'LAPORAN DISTRIBUSI KASUS & DIAGNOSA (ICD-10)'}
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                Periode Evaluasi: {startDate} s.d. {endDate}
              </p>
            </div>
          </div>

          {/* Profil DPJ pada Laporan Medis */}
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 block">
                Dokter Penanggung Jawab (DPJ) Layanan Medis
              </span>
              <strong className="text-slate-900">{dpjProfile.name}</strong> ({dpjProfile.specialization})
              <span className="block font-mono text-[10px] text-slate-600">
                SIP: {dpjProfile.sip} · {dpjProfile.idi} · Telp: {dpjProfile.phone}
              </span>
            </div>
            <div className="text-right font-mono text-[10px] text-slate-700">
              <span className="block font-sans text-[9px] uppercase text-slate-400 font-bold">Jadwal Praktik</span>
              <strong>{dpjProfile.schedule}</strong>
            </div>
          </div>

          <table className="w-full text-left text-xs border border-collapse">
            <thead className="bg-slate-100 font-bold text-[10px] uppercase text-slate-700">
              <tr>
                <th className="p-2 border text-center w-10">No</th>
                <th className="p-2 border w-24">Tanggal</th>
                <th className="p-2 border w-24">No. RM</th>
                <th className="p-2 border">Nama Pasien</th>
                <th className="p-2 border text-center w-20">Usia</th>
                <th className="p-2 border">Diagnosa ICD-10</th>
                <th className="p-2 border">Terapi / Obat</th>
                <th className="p-2 border w-32">Dokter Pemeriksa</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    Tidak ada data rekam medis pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2 border text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border font-mono">{item.date}</td>
                    <td className="p-2 border font-mono font-bold text-sky-700">{item.rmId}</td>
                    <td className="p-2 border font-bold text-slate-900">{item.patientName}</td>
                    <td className="p-2 border text-center">{item.age} thn</td>
                    <td className="p-2 border font-semibold">{item.soapA}</td>
                    <td className="p-2 border text-[11px]">
                      {item.prescription?.map((p) => `${p.name} (${p.qty} ${p.unit})`).join(', ') || '-'}
                    </td>
                    <td className="p-2 border">{item.doctorName || dpjProfile.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="grid grid-cols-2 pt-8 text-xs">
            <div className="text-center space-y-12">
              <p className="font-semibold text-slate-700">
                Mengetahui,<br />
                Apoteker Penanggung Jawab (APJ),
              </p>
              <div>
                <p className="font-extrabold underline text-slate-900">{apjProfile.name}</p>
                <p className="text-[10px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
                <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
              </div>
            </div>
            <div className="text-center space-y-12">
              <p className="font-semibold text-slate-700">
                {pharmacyProfile.city}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                Dokter Penanggung Jawab Klinis (DPJ),
              </p>
              <div>
                <p className="font-extrabold underline text-slate-900">{dpjProfile.name}</p>
                <p className="text-[10px] text-slate-600 font-mono">SIP: {dpjProfile.sip}</p>
                <p className="text-[10px] text-slate-500 font-mono">{dpjProfile.idi}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 11. HASIL PEMERIKSAAN LABORATORIUM SEDERHANA (POCT)
  if (mode === 'hasil-lab') {
    let labRecord: any = null;
    try {
      const savedActive = localStorage.getItem('latisha_active_print_lab');
      if (savedActive) {
        labRecord = JSON.parse(savedActive);
      }
      if (!labRecord) {
        const labId = searchParams.get('labId');
        const savedList = localStorage.getItem('latisha_lab_records');
        if (savedList && labId) {
          const list = JSON.parse(savedList);
          labRecord = list.find((r: any) => r.id === labId);
        }
      }
    } catch {}

    return (
      <div className="p-8 bg-white min-h-screen text-slate-900 font-sans max-w-3xl mx-auto">
        {printStyles}
        {renderFloatingTopBar('Lembar Hasil Pemeriksaan Laboratorium Resmi')}

        <div id="printable-section" className="p-8 bg-white border border-slate-300 rounded-2xl space-y-5 text-xs text-slate-900 shadow-xs">
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
                <p className="text-[11px] text-slate-700 font-medium">
                  {pharmacyFullAddress} · Telp / WA: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
                </p>
                <p className="text-[10px] text-slate-600 font-mono">
                  SIA: {pharmacyProfile.sia} · APJ: {apjProfile.name} (SIPA: {apjProfile.sipa}) · DPJ: {dpjProfile.name} (SIP: {dpjProfile.sip})
                </p>
              </div>
              <div className="w-16 shrink-0" />
            </div>
          </div>

          <div className="text-center space-y-0.5 pt-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 underline">
              SURAT HASIL PEMERIKSAAN LABORATORIUM SEDERHANA (POCT)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              No. Registrasi Lab: {labRecord?.id || '-'}
            </span>
          </div>

          {labRecord ? (
            <>
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-24 text-slate-500">Nama Pasien</span>
                    <strong className="text-slate-900">: {labRecord.patientName}</strong>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500">No. RM</span>
                    <span className="font-mono font-bold">: {labRecord.rmId}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500">Usia / Gender</span>
                    <span>: {labRecord.age} th / {labRecord.gender}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-slate-500">Tanggal Periksa</span>
                    <span className="font-mono">: {labRecord.date} ({labRecord.time} WIB)</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Dokter Pengirim</span>
                    <span>: {labRecord.doctorName || dpjProfile.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Petugas Analis</span>
                    <span>: {labRecord.analystName}</span>
                  </div>
                </div>
              </div>

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
                    {(labRecord.items || []).map((it: any, idx: number) => {
                      const isHigh = it.status === 'Tinggi' || it.status === 'Kritis';
                      const isLow = it.status === 'Rendah';
                      return (
                        <tr key={idx}>
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

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-extrabold text-slate-800 text-[10px] uppercase block">
                  Kesimpulan / Catatan Laboratorium:
                </span>
                <p className="text-slate-700 text-xs italic leading-relaxed">
                  "{labRecord.conclusion || 'Hasil pemeriksaan dalam batas normal.'}"
                </p>
              </div>

              <div className="grid grid-cols-2 pt-6 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-12">Petugas Pemeriksa / Analis,</span>
                  <strong className="text-slate-900 underline block">{labRecord.analystName}</strong>
                  <span className="text-[10px] text-slate-400">Petugas Laboratorium</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-12">
                    {pharmacyProfile.city}, {labRecord.date}<br />
                    Dokter Pemeriksa / Penanggung Jawab (DPJ),
                  </span>
                  <strong className="text-slate-900 underline block">
                    {labRecord.doctorName || dpjProfile.name}
                  </strong>
                  <span className="text-[10px] text-slate-600 font-mono block">
                    SIP: {dpjProfile.sip}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {dpjProfile.idi}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400 italic">
              Data hasil laboratorium tidak ditemukan.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="p-6 text-center">
      <h2 className="font-bold text-sm mb-4">Mempersiapkan Dokumen Cetak...</h2>
      <button
        onClick={safePrint}
        className="px-4 py-2 bg-sky-600 text-white rounded-xl font-bold cursor-pointer"
      >
        Cetak Sekarang
      </button>
    </div>
  );
};
