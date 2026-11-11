import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, Save, Plus, Edit2, Trash2, X, AlertTriangle, Stethoscope } from 'lucide-react';
import { FeeConfig, DEFAULT_FEE_CONFIG, TariffItem } from '../types';
import { RupiahInput } from './RupiahInput';

interface FeeSettingsViewProps {
  feeConfig?: FeeConfig;
  onSaveFeeConfig?: (newConfig: FeeConfig) => void;
}

export const FeeSettingsView: React.FC<FeeSettingsViewProps> = ({
  feeConfig: initialFeeConfig,
  onSaveFeeConfig
}) => {
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(() => {
    if (initialFeeConfig) return initialFeeConfig;
    const saved = localStorage.getItem('latisha_fee_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_FEE_CONFIG;
      }
    }
    return DEFAULT_FEE_CONFIG;
  });

  useEffect(() => {
    if (initialFeeConfig) {
      setFeeConfig(initialFeeConfig);
    }
  }, [initialFeeConfig]);

  const [isSaved, setIsSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<TariffItem | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Poli Umum');
  const [formPrice, setFormPrice] = useState<number>(10000);
  const [formDesc, setFormDesc] = useState('');

  const handleSaveAll = (updatedConfig: FeeConfig) => {
    setFeeConfig(updatedConfig);
    localStorage.setItem('latisha_fee_config', JSON.stringify(updatedConfig));
    if (onSaveFeeConfig) {
      onSaveFeeConfig(updatedConfig);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingTariff(null);
    setFormName('');
    setFormCategory('Poli Umum');
    setFormPrice(10000);
    setFormDesc('');
    setShowModal(true);
  };

  const handleOpenEditModal = (tariff: TariffItem) => {
    setEditingTariff(tariff);
    setFormName(tariff.name);
    setFormCategory(tariff.category || 'Poli Umum');
    setFormPrice(tariff.price || 0);
    setFormDesc(tariff.description || '');
    setShowModal(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama Jasa & Tarif harus diisi!');
      return;
    }

    let updatedConfig: FeeConfig = { ...feeConfig };

    if (editingTariff) {
      // Editing existing
      if (editingTariff.isSystem) {
        if (editingTariff.id === 'JASA-DOKTER-UMUM') updatedConfig.doctorFee = formPrice;
        else if (editingTariff.id === 'JASA-PENUNJANG-MEDIS') updatedConfig.medicalSupportFee = formPrice;
        else if (editingTariff.id === 'JASA-ADMIN-LOKET') updatedConfig.adminFee = formPrice;
        else if (editingTariff.id === 'JASA-HOME-VISIT') updatedConfig.homeVisitFee = formPrice;
        else if (editingTariff.id === 'JASA-APOTEKER') updatedConfig.pharmacistFee = formPrice;
      } else {
        const customs = updatedConfig.customTariffs ? [...updatedConfig.customTariffs] : [];
        const idx = customs.findIndex((c) => c.id === editingTariff.id);
        if (idx !== -1) {
          customs[idx] = {
            ...customs[idx],
            name: formName,
            category: formCategory,
            price: formPrice,
            description: formDesc
          };
          updatedConfig.customTariffs = customs;
        }
      }
    } else {
      // Adding new custom tariff
      const newItem: TariffItem = {
        id: `JASA-CUSTOM-${Date.now().toString().slice(-6)}`,
        name: formName,
        category: formCategory,
        price: formPrice,
        description: formDesc,
        isSystem: false
      };
      const customs = updatedConfig.customTariffs ? [...updatedConfig.customTariffs] : [];
      customs.push(newItem);
      updatedConfig.customTariffs = customs;
    }

    handleSaveAll(updatedConfig);
    setShowModal(false);
  };

  const handleDeleteTariff = (tariff: TariffItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${tariff.name}"?`)) return;

    let updatedConfig: FeeConfig = { ...feeConfig };

    if (tariff.isSystem) {
      // Reset/Zero out system fee
      if (tariff.id === 'JASA-DOKTER-UMUM') updatedConfig.doctorFee = 0;
      else if (tariff.id === 'JASA-PENUNJANG-MEDIS') updatedConfig.medicalSupportFee = 0;
      else if (tariff.id === 'JASA-ADMIN-LOKET') updatedConfig.adminFee = 0;
      else if (tariff.id === 'JASA-HOME-VISIT') updatedConfig.homeVisitFee = 0;
      else if (tariff.id === 'JASA-APOTEKER') updatedConfig.pharmacistFee = 0;
    } else {
      const customs = (updatedConfig.customTariffs || []).filter((c) => c.id !== tariff.id);
      updatedConfig.customTariffs = customs;
    }

    handleSaveAll(updatedConfig);
  };

  // Compile list of system & custom tariffs
  const allTariffs: TariffItem[] = [
    {
      id: 'JASA-DOKTER-UMUM',
      name: 'Jasa Dokter Umum / Pasien',
      category: 'Poli Umum',
      price: feeConfig.doctorFee ?? 20000,
      description: 'Diberikan per pasien poli umum yang berobat.',
      isSystem: true
    },
    {
      id: 'JASA-PENUNJANG-MEDIS',
      name: 'Jasa Penunjang Medis (Perawat / Bidan)',
      category: 'Skrining & Nakes',
      price: feeConfig.medicalSupportFee ?? 5000,
      description: 'Alokasi skrining tanda vital dan tindakan perawat.',
      isSystem: true
    },
    {
      id: 'JASA-ADMIN-LOKET',
      name: 'Biaya Administrasi Pendaftaran',
      category: 'Administrasi',
      price: feeConfig.adminFee ?? 1000,
      description: 'Biaya kartu rekam medis & administrasi loket.',
      isSystem: true
    },
    {
      id: 'JASA-HOME-VISIT',
      name: 'Jasa Kunjungan Rumah (Home Visit)',
      category: 'Home Care',
      price: feeConfig.homeVisitFee ?? 35000,
      description: 'Tarif khusus pemeriksaan home care luar gedung.',
      isSystem: true
    },
    {
      id: 'JASA-APOTEKER',
      name: 'Jasa Apoteker',
      category: 'Telaah & Konseling',
      price: feeConfig.pharmacistFee ?? 10000,
      description: 'Tarif jasa pelayanan kefarmasian, telaah resep, & konseling apoteker.',
      isSystem: true
    },
    ...(feeConfig.customTariffs || [])
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto text-xs">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Pengaturan Tarif Jasa Medis & Pembagian Fee Layanan
          </h3>
          <p className="text-slate-500 mt-0.5">
            Konfigurasi tarif jasa dokter, apoteker, perawat/bidan, administrasi, dan layanan tarif khusus klinik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tersimpan!
            </span>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center gap-2 text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jasa & Tarif</span>
          </button>
        </div>
      </div>

      {/* Grid of Tariff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTariffs.map((tariff) => {
          const categoryColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
            'Poli Umum': { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', badge: 'bg-sky-100 text-sky-800' },
            'Skrining & Nakes': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
            'Administrasi': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
            'Home Care': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
            'Telaah & Konseling': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', badge: 'bg-teal-100 text-teal-800' }
          };

          const styling = categoryColors[tariff.category] || {
            bg: 'bg-slate-50',
            border: 'border-slate-200',
            text: 'text-slate-800',
            badge: 'bg-slate-200 text-slate-700'
          };

          return (
            <div
              key={tariff.id}
              className={`p-4 rounded-2xl border ${styling.bg} ${styling.border} shadow-xs flex flex-col justify-between space-y-3 relative group transition hover:shadow-md`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${styling.badge}`}>
                    {tariff.category}
                  </span>
                  {tariff.isSystem && (
                    <span className="text-[10px] text-slate-400 font-medium">System Core</span>
                  )}
                </div>

                <h4 className={`font-black text-sm ${styling.text}`}>{tariff.name}</h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {tariff.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Tarif Biaya</span>
                  <span className="font-mono font-black text-base text-slate-900">
                    Rp {tariff.price.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(tariff)}
                    title="Edit Jasa & Tarif"
                    className="p-2 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-xl font-bold transition shadow-xs flex items-center gap-1 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTariff(tariff)}
                    title="Hapus Tarif"
                    className="p-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold transition shadow-xs flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Tariff & Jasa */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-400" />
                {editingTariff ? 'Edit Jasa & Tarif' : 'Tambah Jasa & Tarif Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Jasa / Layanan *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Jasa Konsultasi Spesialis, Tindakan Nebulizer..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Layanan *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Poli Umum">Poli Umum</option>
                  <option value="Skrining & Nakes">Skrining & Nakes</option>
                  <option value="Administrasi">Administrasi</option>
                  <option value="Home Care">Home Care</option>
                  <option value="Telaah & Konseling">Telaah & Konseling</option>
                  <option value="Tindakan Medis">Tindakan Medis</option>
                  <option value="Lab & Penunjang">Lab & Penunjang</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tarif / Biaya Layanan (Rp) *
                </label>
                <RupiahInput
                  value={formPrice}
                  onChangeValue={setFormPrice}
                  className="w-full py-2.5 pr-3 border rounded-xl font-mono font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nominal uang otomatis diberi titik ribuan saat mengetik.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat mengenai layanan atau kriteria tarif ini..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl uppercase tracking-wider shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Jasa & Tarif</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
