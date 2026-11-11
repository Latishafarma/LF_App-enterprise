import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  UserCheck,
  Save,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  RefreshCw,
  Stethoscope,
  Users,
  Lock,
  Plus,
  Trash2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Edit2
} from 'lucide-react';
import {
  PharmacyProfile,
  APJProfile,
  DPJProfile,
  Staff,
  StaffRole,
  Branch,
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getStaffActiveRoles,
  resolveStaffEffectivePermissions
} from '../types';

export const DEFAULT_PHARMACY_PROFILE: PharmacyProfile = {
  name: 'Apotek Latisha Farma',
  sia: '445/098/SIA/DPMPTSP/2023',
  address: 'Jl. KTM Tanjung Mas Makmur Kec. Mesuji Timur',
  city: 'Kab. Mesuji, Lampung',
  phone: '0895326272957',
  email: 'apotek@latishafarma.com',
  npwp: '09.876.543.2-012.000',
  nib: '9120003456789',
  headerNote: 'Melayani Resep Dokter, Konsultasi Apoteker & Swamedikasi Terpercaya'
};

export const DEFAULT_APJ_PROFILE: APJProfile = {
  name: 'apt. Mardin, S.Farm',
  sipa: '1993/SIPA/MSJ/2023',
  stra: '19930815/STRA-IAI/2018/2234',
  phone: '0812-8899-7722',
  schedule: 'Senin - Jumat: 08.00 - 16.00 WIB | Sabtu: 08.00 - 13.00 WIB',
  notes: 'Tersedia untuk Pelayanan Informasi Obat (PIO) & Konseling Pasien'
};

export const DEFAULT_DPJ_PROFILE: DPJProfile = {
  name: 'dr. Anis Prima Dewi',
  sip: 'SIP/2024/001-KNA',
  idi: 'KKI: 33.1.1.100.2.20.123456',
  specialization: 'Dokter Umum / Penanggung Jawab Klinis',
  phone: '0812-7389-1122',
  schedule: 'Senin - Sabtu: 08.00 - 20.00 WIB',
  notes: 'Penanggung Jawab Pelayanan Medis, RME SOAP & Surat Keterangan Dokter'
};

export const formatPharmacyAddress = (prof: PharmacyProfile): string => {
  const addr = (prof.address || '').trim();
  const city = (prof.city || '').trim();
  if (!addr) return city;
  if (!city) return addr;
  if (addr.toLowerCase().includes(city.toLowerCase())) {
    return addr;
  }
  return `${addr}, ${city}`;
};

const sanitizeLegacyDummyPharmacy = (raw: Partial<PharmacyProfile>): PharmacyProfile => {
  let branchName = DEFAULT_PHARMACY_PROFILE.name;
  let branchAddress = DEFAULT_PHARMACY_PROFILE.address;
  const branchCity = DEFAULT_PHARMACY_PROFILE.city;
  let branchPhone = DEFAULT_PHARMACY_PROFILE.phone;
  let branchSia = DEFAULT_PHARMACY_PROFILE.sia;

  try {
    const rawBranches = localStorage.getItem('latisha_branches');
    if (rawBranches) {
      const parsedBranches = JSON.parse(rawBranches);
      if (Array.isArray(parsedBranches) && parsedBranches.length > 0) {
        const b0 = parsedBranches[0];
        if (
          b0.name &&
          b0.name.trim().toLowerCase() !== 'apotek & klinik pratama latisha farma'
        ) {
          branchName = b0.name.replace(/\s*\(Pusat\)\s*$/i, '').trim() || b0.name;
        }
        if (
          b0.address &&
          !b0.address.toLowerCase().includes('jl. raya kesehatan no. 45')
        ) {
          branchAddress = b0.address;
        }
        if (b0.phone && b0.phone.trim() !== '(021) 8899-7722') {
          branchPhone = b0.phone;
        }
        if (b0.siaNumber) {
          branchSia = b0.siaNumber;
        }
      }
    }
  } catch {}

  let savedLogo: string | undefined = raw.logoUrl;
  try {
    if (savedLogo === undefined) {
      const dedicatedLogo = localStorage.getItem('latisha_facility_logo');
      if (dedicatedLogo) {
        savedLogo = dedicatedLogo;
      } else {
        const existingSaved = localStorage.getItem('latisha_pharmacy_profile');
        if (existingSaved) {
          const parsedExisting = JSON.parse(existingSaved);
          if (parsedExisting?.logoUrl) {
            savedLogo = parsedExisting.logoUrl;
          }
        }
      }
    }
  } catch {}

  const isLegacyName =
    !raw.name ||
    raw.name.trim().toLowerCase() === 'apotek & klinik pratama latisha farma';
  const isLegacyAddress =
    !raw.address ||
    raw.address.trim().toLowerCase() === 'jl. raya kesehatan no. 45' ||
    raw.address.trim().toLowerCase() === 'jl. raya kesehatan no. 45, jakarta selatan';
  const isLegacyCity =
    !raw.city || raw.city.trim().toLowerCase() === 'jakarta selatan';
  const isLegacyPhone =
    !raw.phone || raw.phone.trim() === '(021) 8899-7722';

  const resolvedAddress = isLegacyAddress ? branchAddress : raw.address!;
  const resolvedCity = isLegacyCity ? branchCity : raw.city!;

  const cleaned: PharmacyProfile = {
    ...DEFAULT_PHARMACY_PROFILE,
    ...raw,
    name: isLegacyName ? branchName : raw.name!,
    address: resolvedAddress,
    city: resolvedCity,
    phone: isLegacyPhone ? branchPhone : raw.phone!,
    sia: raw.sia || branchSia,
    logoUrl: savedLogo || ''
  };

  if (isLegacyName || isLegacyAddress || isLegacyCity || isLegacyPhone) {
    try {
      localStorage.setItem('latisha_pharmacy_profile', JSON.stringify(cleaned));
    } catch {}
  }

  return cleaned;
};

export const syncFacilityProfileToServer = (payload: {
  pharmacy?: PharmacyProfile;
  apj?: APJProfile;
  dpj?: DPJProfile;
}) => {
  try {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    fetch('/api/facility-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {}
};

export const getSavedPharmacyProfile = (): PharmacyProfile => {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const urlPharm = params.get('_pharm');
      if (urlPharm) {
        const rawUrlObj = JSON.parse(urlPharm);
        if (rawUrlObj?.logoUrl) {
          try {
            localStorage.setItem('latisha_facility_logo', rawUrlObj.logoUrl);
          } catch {}
        }
        const parsedFromUrl = sanitizeLegacyDummyPharmacy(rawUrlObj);
        localStorage.setItem('latisha_pharmacy_profile', JSON.stringify(parsedFromUrl));
        return parsedFromUrl;
      }
    }
    const saved = localStorage.getItem('latisha_pharmacy_profile');
    if (saved) {
      return sanitizeLegacyDummyPharmacy(JSON.parse(saved));
    }
    return sanitizeLegacyDummyPharmacy(DEFAULT_PHARMACY_PROFILE);
  } catch {
    return DEFAULT_PHARMACY_PROFILE;
  }
};

export const getSavedAPJProfile = (): APJProfile => {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const urlApj = params.get('_apj');
      if (urlApj) {
        const parsedFromUrl = { ...DEFAULT_APJ_PROFILE, ...JSON.parse(urlApj) };
        localStorage.setItem('latisha_apj_profile', JSON.stringify(parsedFromUrl));
        return parsedFromUrl;
      }
    }
    const saved = localStorage.getItem('latisha_apj_profile');
    return saved ? { ...DEFAULT_APJ_PROFILE, ...JSON.parse(saved) } : DEFAULT_APJ_PROFILE;
  } catch {
    return DEFAULT_APJ_PROFILE;
  }
};

export const getSavedDPJProfile = (): DPJProfile => {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const urlDpj = params.get('_dpj');
      if (urlDpj) {
        const parsedFromUrl = { ...DEFAULT_DPJ_PROFILE, ...JSON.parse(urlDpj) };
        localStorage.setItem('latisha_dpj_profile', JSON.stringify(parsedFromUrl));
        return parsedFromUrl;
      }
    }
    const saved = localStorage.getItem('latisha_dpj_profile');
    return saved ? { ...DEFAULT_DPJ_PROFILE, ...JSON.parse(saved) } : DEFAULT_DPJ_PROFILE;
  } catch {
    return DEFAULT_DPJ_PROFILE;
  }
};

let hasSyncedWithServerOnce = false;

export const useFacilityProfiles = () => {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const handleProfileChange = () => setVersion((v) => v + 1);
    window.addEventListener('latisha_profile_updated', handleProfileChange);
    window.addEventListener('storage', handleProfileChange);

    if (!hasSyncedWithServerOnce && typeof window !== 'undefined') {
      hasSyncedWithServerOnce = true;
      const localPharm = getSavedPharmacyProfile();
      const localApj = getSavedAPJProfile();
      const localDpj = getSavedDPJProfile();

      if (localPharm.logoUrl) {
        syncFacilityProfileToServer({
          pharmacy: localPharm,
          apj: localApj,
          dpj: localDpj
        });
      }

      fetch('/api/facility-profile')
        .then((r) => (r.ok ? r.json() : null))
        .then((serverData) => {
          if (!serverData) return;
          let updated = false;
          const currentPharm = getSavedPharmacyProfile();
          if (serverData.pharmacy) {
            if (!currentPharm.logoUrl && serverData.pharmacy.logoUrl) {
              const mergedPharm = {
                ...currentPharm,
                ...serverData.pharmacy,
                logoUrl: serverData.pharmacy.logoUrl
              };
              try {
                localStorage.setItem('latisha_facility_logo', serverData.pharmacy.logoUrl);
                localStorage.setItem('latisha_pharmacy_profile', JSON.stringify(mergedPharm));
                updated = true;
              } catch {}
            }
          } else if (currentPharm.logoUrl) {
            syncFacilityProfileToServer({
              pharmacy: currentPharm,
              apj: getSavedAPJProfile(),
              dpj: getSavedDPJProfile()
            });
          }
          if (updated) {
            window.dispatchEvent(new Event('latisha_profile_updated'));
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('latisha_profile_updated', handleProfileChange);
      window.removeEventListener('storage', handleProfileChange);
    };
  }, []);

  return {
    pharmacyProfile: getSavedPharmacyProfile(),
    apjProfile: getSavedAPJProfile(),
    dpjProfile: getSavedDPJProfile()
  };
};

const AVAILABLE_ROLES: StaffRole[] = [
  'Super Admin / APJ',
  'Dokter',
  'Apoteker',
  'Perawat / Bidan',
  'Perawat / Nakes Lapangan',
  'Kasir & Front Office'
];

interface PharmacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'apotek' | 'apj' | 'dpj' | 'pegawai';
  onProfileUpdate?: () => void;
  activeRole?: string;
  userName?: string;
  activeStaffId?: string;
  staffList?: Staff[];
  branches?: Branch[];
  onAddStaff?: (staff: Staff) => void;
  onUpdateStaff?: (staff: Staff) => void;
  onDeleteStaff?: (id: string) => void;
  rolePermissions?: Record<string, string[]>;
  onUpdateRolePermissions?: (updated: Record<string, string[]>) => void;
}

export const PharmacySettingsModal: React.FC<PharmacySettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'apotek',
  onProfileUpdate,
  activeRole = 'Super Admin / APJ',
  userName = 'apt. Mardin, S.Farm (APJ)',
  activeStaffId,
  staffList = [],
  branches = [],
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  rolePermissions = DEFAULT_ROLE_PERMISSIONS,
  onUpdateRolePermissions
}) => {
  const [activeTab, setActiveTab] = useState<'apotek' | 'apj' | 'dpj' | 'pegawai'>(initialTab);

  // Pharmacy Profile State
  const [pharmacy, setPharmacy] = useState<PharmacyProfile>(() => getSavedPharmacyProfile());

  // APJ Profile State
  const [apj, setApj] = useState<APJProfile>(() => getSavedAPJProfile());

  // DPJ Profile State (Dokter Penanggung Jawab)
  const [dpj, setDpj] = useState<DPJProfile>(() => getSavedDPJProfile());

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoError, setLogoError] = useState<string>('');
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<StaffRole>('Apoteker');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffForm, setEditStaffForm] = useState<{
    name: string;
    phone: string;
    branchId: string;
    status: 'Aktif' | 'Non-Aktif';
  }>({
    name: '',
    phone: '',
    branchId: branches[0]?.id || 'BR-01',
    status: 'Aktif'
  });
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    phone: '',
    role: 'Apoteker' as StaffRole,
    roles: ['Apoteker'] as StaffRole[],
    branchId: branches[0]?.id || 'BR-01'
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      setPharmacy(getSavedPharmacyProfile());
      setApj(getSavedAPJProfile());
      setDpj(getSavedDPJProfile());
      setLogoError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuperAdmin = activeRole === 'Super Admin / APJ';

  const updatePharmacyField = (patch: Partial<PharmacyProfile>) => {
    const next = { ...pharmacy, ...patch };
    setPharmacy(next);
    if (isSuperAdmin) {
      try {
        if (patch.logoUrl !== undefined) {
          if (patch.logoUrl) {
            localStorage.setItem('latisha_facility_logo', patch.logoUrl);
          } else {
            localStorage.removeItem('latisha_facility_logo');
          }
        }
        localStorage.setItem('latisha_pharmacy_profile', JSON.stringify(next));
        syncFacilityProfileToServer({ pharmacy: next, apj, dpj });
        window.dispatchEvent(new Event('latisha_profile_updated'));
      } catch {}
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMime = file.type === 'image/jpeg' || file.type === 'image/png';
    const validExt = /\.(jpe?g|png)$/i.test(file.name);

    if (!validMime && !validExt) {
      setLogoError(
        'Format file tidak didukung! Harap unggah logo faskes hanya dalam format JPEG (.jpg/.jpeg) atau PNG (.png).'
      );
      e.target.value = '';
      return;
    }

    setLogoError('');
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== 'string') return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 160;
        let width = img.width || maxDim;
        let height = img.height || maxDim;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!isPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          let dataUrl = isPng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.88);
          if (dataUrl.length > 35000) {
            // If PNG is still large, compress further on white background so URL + localStorage stay ultra-fast
            const compactCanvas = document.createElement('canvas');
            const compactDim = 120;
            const cW = width >= height ? compactDim : Math.max(1, Math.round((width * compactDim) / height));
            const cH = height > width ? compactDim : Math.max(1, Math.round((height * compactDim) / width));
            compactCanvas.width = cW;
            compactCanvas.height = cH;
            const cCtx = compactCanvas.getContext('2d');
            if (cCtx) {
              cCtx.clearRect(0, 0, cW, cH);
              cCtx.drawImage(img, 0, 0, cW, cH);
              dataUrl = isPng
                ? compactCanvas.toDataURL('image/png')
                : compactCanvas.toDataURL('image/jpeg', 0.85);
            }
          }
          updatePharmacyField({ logoUrl: dataUrl });
        } else {
          updatePharmacyField({ logoUrl: result });
        }
      };
      img.onerror = () => {
        setLogoError('File gambar tidak valid. Pastikan file JPEG atau PNG dapat dibuka.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setLogoError('');
    updatePharmacyField({ logoUrl: '' });
  };

  const updateApjField = (patch: Partial<APJProfile>) => {
    const next = { ...apj, ...patch };
    setApj(next);
    if (isSuperAdmin) {
      try {
        localStorage.setItem('latisha_apj_profile', JSON.stringify(next));
        syncFacilityProfileToServer({ pharmacy, apj: next, dpj });
        window.dispatchEvent(new Event('latisha_profile_updated'));
      } catch {}
    }
  };

  const updateDpjField = (patch: Partial<DPJProfile>) => {
    const next = { ...dpj, ...patch };
    setDpj(next);
    if (isSuperAdmin) {
      try {
        localStorage.setItem('latisha_dpj_profile', JSON.stringify(next));
        syncFacilityProfileToServer({ pharmacy, apj, dpj: next });
        window.dispatchEvent(new Event('latisha_profile_updated'));
      } catch {}
    }
  };

  const handleSaveProfiles = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (pharmacy.logoUrl) {
      localStorage.setItem('latisha_facility_logo', pharmacy.logoUrl);
    } else {
      localStorage.removeItem('latisha_facility_logo');
    }
    localStorage.setItem('latisha_pharmacy_profile', JSON.stringify(pharmacy));
    localStorage.setItem('latisha_apj_profile', JSON.stringify(apj));
    localStorage.setItem('latisha_dpj_profile', JSON.stringify(dpj));
    syncFacilityProfileToServer({ pharmacy, apj, dpj });
    window.dispatchEvent(new Event('latisha_profile_updated'));

    // Sync APJ and DPJ changes directly into staffList so all forms receive updated employee names & phones
    if (onUpdateStaff) {
      const apjStaff = staffList.find(
        (s) => s.id === 'STF-001' || s.id === 'STF-01' || s.role === 'Super Admin / APJ'
      );
      if (apjStaff && apj.name.trim()) {
        onUpdateStaff({
          ...apjStaff,
          name: apj.name.trim(),
          phone: apj.phone.trim() || apjStaff.phone
        });
      }
      const dpjStaff = staffList.find(
        (s) => s.id === 'STF-002' || s.id === 'STF-02' || s.role === 'Dokter'
      );
      if (dpjStaff && dpj.name.trim()) {
        onUpdateStaff({
          ...dpjStaff,
          name: dpj.name.trim(),
          phone: dpj.phone.trim() || dpjStaff.phone
        });
      }
    }

    setSaveSuccess(true);
    onProfileUpdate?.();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleStartEditStaff = (st: Staff) => {
    setEditingStaffId(st.id);
    setEditStaffForm({
      name: st.name,
      phone: st.phone,
      branchId: st.branchId || branches[0]?.id || 'BR-01',
      status: st.status
    });
  };

  const handleSaveEditStaff = (st: Staff) => {
    if (!onUpdateStaff || !editStaffForm.name.trim()) return;
    const updated: Staff = {
      ...st,
      name: editStaffForm.name.trim(),
      phone: editStaffForm.phone.trim() || st.phone,
      branchId: editStaffForm.branchId || st.branchId,
      status: editStaffForm.status
    };
    onUpdateStaff(updated);

    // If this staff member is the primary APJ or DPJ, sync to localStorage profile as well
    if (st.id === 'STF-001' || st.id === 'STF-01') {
      const nextApj = { ...apj, name: updated.name, phone: updated.phone };
      setApj(nextApj);
      localStorage.setItem('latisha_apj_profile', JSON.stringify(nextApj));
    } else if (st.id === 'STF-002' || st.id === 'STF-02') {
      const nextDpj = { ...dpj, name: updated.name, phone: updated.phone };
      setDpj(nextDpj);
      localStorage.setItem('latisha_dpj_profile', JSON.stringify(nextDpj));
    }

    setEditingStaffId(null);
    setSaveSuccess(true);
    onProfileUpdate?.();
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Helper to get active roles for a staff member
  const getStaffRoles = (st: Staff): StaffRole[] => {
    return getStaffActiveRoles(st, st.role);
  };

  // Helper to get active permissions for a staff member
  const getStaffPermissions = (st: Staff): string[] => {
    return resolveStaffEffectivePermissions(st, st.role, rolePermissions);
  };

  // Toggle a role checkbox on a staff member
  const handleToggleStaffRoleCheckbox = (st: Staff, targetRole: StaffRole) => {
    if (!onUpdateStaff) return;
    const currentRoles = getStaffRoles(st);
    const exists = currentRoles.includes(targetRole);
    let nextRoles: StaffRole[];
    if (exists) {
      if (currentRoles.length <= 1) {
        // Must have at least 1 active role
        return;
      }
      nextRoles = currentRoles.filter((r) => r !== targetRole);
    } else {
      nextRoles = [...currentRoles, targetRole];
    }

    const primaryRole: StaffRole = nextRoles.includes('Super Admin / APJ')
      ? 'Super Admin / APJ'
      : nextRoles[0];

    // Recompute merged permissions for the new role set
    const mergedPerms = new Set<string>();
    if (!exists) {
      // Adding a new role: preserve current effective permissions + add new role's default permissions
      getStaffPermissions(st).forEach((p) => mergedPerms.add(p));
      (rolePermissions[targetRole] || DEFAULT_ROLE_PERMISSIONS[targetRole] || []).forEach((p) =>
        mergedPerms.add(p)
      );
    } else {
      // Removing a role: recompute union of remaining roles' permissions
      nextRoles.forEach((r) => {
        (rolePermissions[r] || DEFAULT_ROLE_PERMISSIONS[r] || []).forEach((p) =>
          mergedPerms.add(p)
        );
      });
    }

    if (!nextRoles.includes('Super Admin / APJ')) {
      mergedPerms.delete('sys-profil-fasilitas');
    } else {
      SYSTEM_PERMISSIONS.forEach((p) => mergedPerms.add(p.id));
    }

    onUpdateStaff({
      ...st,
      role: primaryRole,
      roles: nextRoles,
      permissions: Array.from(mergedPerms)
    });
  };

  // Toggle an individual module permission checkbox on a staff member
  const handleToggleStaffPermissionCheckbox = (st: Staff, permId: string) => {
    if (!onUpdateStaff) return;
    const roles = getStaffRoles(st);
    const hasSuperAdmin = roles.includes('Super Admin / APJ');
    if (permId === 'sys-profil-fasilitas' && !hasSuperAdmin) {
      return; // Locked to Super Admin / APJ only
    }
    const currentPerms = getStaffPermissions(st);
    const exists = currentPerms.includes(permId);
    const nextPerms = exists
      ? currentPerms.filter((id) => id !== permId)
      : [...currentPerms, permId];

    onUpdateStaff({
      ...st,
      permissions: nextPerms
    });
  };

  // Toggle role-level default permission checkbox
  const handleToggleRoleMatrixPermission = (role: StaffRole, permId: string) => {
    if (!onUpdateRolePermissions) return;
    if (permId === 'sys-profil-fasilitas' && role !== 'Super Admin / APJ') {
      return; // Pengaturan Sistem & Profil Fasilitas hanya boleh diakses oleh Super Admin / APJ
    }
    const currentList = rolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
    const exists = currentList.includes(permId);
    const nextList = exists
      ? currentList.filter((id) => id !== permId)
      : [...currentList, permId];

    const updatedMap = {
      ...rolePermissions,
      [role]: nextList
    };
    onUpdateRolePermissions(updatedMap);

    // Also sync to staff whose primary role matches and who don't have Super Admin
    if (onUpdateStaff) {
      staffList.forEach((st) => {
        const stRoles = getStaffRoles(st);
        if (stRoles.includes(role) && !stRoles.includes('Super Admin / APJ')) {
          const currentStPerms = new Set(getStaffPermissions(st));
          if (exists) {
            currentStPerms.delete(permId);
          } else {
            currentStPerms.add(permId);
          }
          onUpdateStaff({
            ...st,
            permissions: Array.from(currentStPerms)
          });
        }
      });
    }
  };

  const handleAddNewStaffInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddStaff || !newStaffForm.name.trim() || !newStaffForm.phone.trim()) return;
    const roles: StaffRole[] =
      newStaffForm.roles.length > 0 ? newStaffForm.roles : [newStaffForm.role];
    const primaryRole: StaffRole = roles.includes('Super Admin / APJ')
      ? 'Super Admin / APJ'
      : roles[0];

    const defaultPerms = new Set<string>();
    roles.forEach((r) => {
      (rolePermissions[r] || DEFAULT_ROLE_PERMISSIONS[r] || []).forEach((id) =>
        defaultPerms.add(id)
      );
    });
    if (!roles.includes('Super Admin / APJ')) {
      defaultPerms.delete('sys-profil-fasilitas');
    }

    const created: Staff = {
      id: `STF-${String(staffList.length + 1).padStart(3, '0')}`,
      name: newStaffForm.name.trim(),
      phone: newStaffForm.phone.trim(),
      role: primaryRole,
      roles,
      permissions: Array.from(defaultPerms),
      status: 'Aktif',
      branchId: newStaffForm.branchId || branches[0]?.id || 'BR-01'
    };
    onAddStaff(created);
    setNewStaffForm({
      name: '',
      phone: '',
      role: 'Apoteker',
      roles: ['Apoteker'],
      branchId: branches[0]?.id || 'BR-01'
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Pengaturan Sistem & Profil Fasilitas
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Khusus Super Admin / APJ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Profil Apotek, Profil APJ, Profil DPJ & Peran User (Pegawai) beserta Hak Akses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('apotek')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'apotek'
                ? 'border-sky-600 text-sky-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Profil Apotek</span>
          </button>
          <button
            onClick={() => setActiveTab('apj')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'apj'
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Profil APJ (Apoteker)</span>
          </button>
          <button
            onClick={() => setActiveTab('dpj')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'dpj'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            <span>Profil DPJ (Dokter Penanggungjawab)</span>
          </button>
          <button
            onClick={() => setActiveTab('pegawai')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'pegawai'
                ? 'border-violet-600 text-violet-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-violet-600" />
            <span>Peran User (Pegawai) & Hak Akses</span>
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Catatan Otoritas Akses */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong className="font-extrabold">Catatan Otoritas Keamanan:</strong> Halaman{' '}
                <span className="underline font-bold">Pengaturan Sistem &amp; Profil Fasilitas</span>{' '}
                hanya boleh diakses oleh <strong>Super Admin / APJ</strong>.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-[10px] font-extrabold text-amber-900 whitespace-nowrap">
              Akses Saat Ini: {activeRole}
            </span>
          </div>

          {!isSuperAdmin ? (
            <div className="p-8 bg-rose-50 border-2 border-rose-200 rounded-3xl text-center space-y-3 my-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-rose-950 uppercase tracking-wide">
                Akses Ditolak — Khusus Super Admin / APJ
              </h4>
              <p className="text-xs text-rose-800 max-w-lg mx-auto leading-relaxed">
                Maaf, akun Anda saat ini masuk sebagai <strong>{userName}</strong> dengan peran{' '}
                <strong className="underline">{activeRole}</strong>. Sesuai kebijakan keamanan klinik &amp; apotek, halaman{' '}
                <strong>Pengaturan Sistem &amp; Profil Fasilitas</strong> hanya boleh diakses dan diubah oleh{' '}
                <strong>Super Admin / APJ</strong>.
              </p>
            </div>
          ) : (
            <>
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 flex items-center gap-2 font-bold animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pengaturan profil, peran pegawai, dan hak akses berhasil disimpan!</span>
                </div>
              )}

              {/* TAB 1: PROFIL APOTEK */}
              {activeTab === 'apotek' && (
                <form onSubmit={handleSaveProfiles} className="space-y-4">
                  <div className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-200 text-sky-950 space-y-1">
                    <span className="font-extrabold text-[11px] uppercase tracking-wide block flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-700" />
                      Identitas Legalitas Fasilitas Pelayanan Kefarmasian
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Data ini digunakan sebagai kop resmi pada seluruh Faktur, Resep, SP PBF, Surat Retur, dan Hasil Skrining DRPs.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Nama Resmi Apotek / Klinik Pratama *
                      </label>
                      <input
                        type="text"
                        value={pharmacy.name}
                        onChange={(e) => updatePharmacyField({ name: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="Contoh: Apotek Latisha Farma"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nomor SIA (Surat Izin Apotek) *
                      </label>
                      <input
                        type="text"
                        value={pharmacy.sia}
                        onChange={(e) => updatePharmacyField({ sia: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="445/098/SIA/DPMPTSP/2023"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nomor NIB / NPWP
                      </label>
                      <input
                        type="text"
                        value={pharmacy.npwp || ''}
                        onChange={(e) => updatePharmacyField({ npwp: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="09.876.543.2-012.000"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Alamat Lengkap Apotek *
                      </label>
                      <textarea
                        rows={2}
                        value={pharmacy.address}
                        onChange={(e) => updatePharmacyField({ address: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="Jl. KTM Tanjung Mas Makmur Kec. Mesuji Timur"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Kota / Wilayah *
                      </label>
                      <input
                        type="text"
                        value={pharmacy.city}
                        onChange={(e) => updatePharmacyField({ city: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="Kab. Mesuji, Lampung"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        No. Telepon / WhatsApp *
                      </label>
                      <input
                        type="text"
                        value={pharmacy.phone}
                        onChange={(e) => updatePharmacyField({ phone: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="0895326272957"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Email Resmi Apotek
                      </label>
                      <input
                        type="email"
                        value={pharmacy.email}
                        onChange={(e) => updatePharmacyField({ email: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="apotek@latishafarma.com"
                      />
                    </div>

                    {/* KOLOM INPUT LOGO FASKES (KHUSUS JPEG / PNG) */}
                    <div className="sm:col-span-2 pt-2">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <label className="block font-extrabold text-slate-800 text-xs">
                              Logo Resmi Faskes / Apotek (Khusus Format JPEG / PNG)
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Logo akan ditampilkan secara presisi pada kop seluruh dokumen cetak resmi (Surat Pesanan, Faktur, Struk POS, Kartu Stok, e-RME, Surat Sakit, Hasil Lab, Laporan Medis &amp; Keuangan).
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-sky-100 border border-sky-200 text-sky-800 font-mono font-bold text-[10px] uppercase">
                            Hanya .JPG / .JPEG / .PNG
                          </span>
                        </div>

                        {logoError && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{logoError}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {/* Box Preview Logo */}
                          <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center p-1.5 shrink-0 shadow-2xs overflow-hidden">
                            {pharmacy.logoUrl ? (
                              <img
                                src={pharmacy.logoUrl}
                                alt="Logo Faskes"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="text-center text-slate-400">
                                <Building2 className="w-6 h-6 mx-auto mb-0.5 opacity-60" />
                                <span className="text-[9px] font-bold block leading-tight">
                                  Belum Ada Logo
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Input File & Tombol Aksi */}
                          <div className="flex-1 space-y-2 w-full">
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                              onChange={handleLogoUpload}
                              className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-sky-600 file:text-white hover:file:bg-sky-700 file:cursor-pointer cursor-pointer bg-white border border-slate-300 rounded-xl p-1.5"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                              <span>
                                Rekomendasi: Rasio persegi (1:1) atau transparan (PNG) untuk hasil cetak paling tajam.
                              </span>
                              {pharmacy.logoUrl && (
                                <button
                                  type="button"
                                  onClick={handleRemoveLogo}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Hapus Logo</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Pratinjau Presisi Kop Dokumen Cetak */}
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Pratinjau Presisi Kop Dokumen Cetak:
                          </span>
                          <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-2xs">
                            <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-2.5">
                              {pharmacy.logoUrl ? (
                                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                                  <img
                                    src={pharmacy.logoUrl}
                                    alt="Logo Kop"
                                    className="max-w-full max-h-full w-14 h-14 object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-14 shrink-0" />
                              )}
                              <div className="flex-1 text-center px-1">
                                <div className="font-black text-sm text-slate-900 uppercase tracking-wide">
                                  {pharmacy.name || 'NAMA APOTEK / FASKES'}
                                </div>
                                <div className="text-[10px] text-slate-700 font-medium">
                                  {formatPharmacyAddress(pharmacy)} · Telp/WA: {pharmacy.phone}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono">
                                  SIA: {pharmacy.sia} · APJ: {apj.name} (SIPA: {apj.sipa})
                                </div>
                              </div>
                              <div className="w-14 shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Profil Apotek</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: PROFIL APJ (APOTEKER PENANGGUNG JAWAB) */}
              {activeTab === 'apj' && (
                <form onSubmit={handleSaveProfiles} className="space-y-4">
                  <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 text-indigo-950 space-y-1">
                    <span className="font-extrabold text-[11px] uppercase tracking-wide block flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-700" />
                      Data Tenaga Kefarmasian Penanggung Jawab (APJ)
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Data SIPA dan STRA Apoteker akan tercetak otomatis pada lembar telaah resep DRPs, surat pesanan narkotika/psikotropika, dan surat retur PBF.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Nama Lengkap Apoteker Penanggung Jawab (APJ) beserta Gelar *
                      </label>
                      <input
                        type="text"
                        value={apj.name}
                        onChange={(e) => updateApjField({ name: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Contoh: apt. Mardin, S.Farm"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nomor SIPA (Surat Izin Praktik Apoteker) *
                      </label>
                      <input
                        type="text"
                        value={apj.sipa}
                        onChange={(e) => updateApjField({ sipa: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="1993/SIPA/MSJ/2023"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nomor STRA (Surat Tanda Registrasi Apoteker) *
                      </label>
                      <input
                        type="text"
                        value={apj.stra}
                        onChange={(e) => updateApjField({ stra: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="19930815/STRA-IAI/2018/2234"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Kontak Pribadi / WhatsApp APJ
                      </label>
                      <input
                        type="text"
                        value={apj.phone}
                        onChange={(e) => updateApjField({ phone: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="0812-8899-7722"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Jadwal Praktik & Kehadiran APJ *
                      </label>
                      <textarea
                        rows={2}
                        value={apj.schedule}
                        onChange={(e) => updateApjField({ schedule: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Senin - Jumat: 08.00 - 16.00 WIB | Sabtu: 08.00 - 13.00 WIB"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Profil APJ</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: PROFIL DPJ (DOKTER PENANGGUNGJAWAB) */}
              {activeTab === 'dpj' && (
                <form onSubmit={handleSaveProfiles} className="space-y-4">
                  <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1">
                    <span className="font-extrabold text-[11px] uppercase tracking-wide block flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-emerald-700" />
                      Data Tenaga Medis: Dokter Penanggung Jawab Klinis (DPJ)
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Data SIP, IDI/KKI, dan jadwal praktik DPJ akan disinkronkan otomatis pada lembar e-RME SOAP, Surat Keterangan Istirahat Sakit, dan resep klinik.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Nama Lengkap Dokter Penanggung Jawab (DPJ) beserta Gelar *
                      </label>
                      <input
                        type="text"
                        value={dpj.name}
                        onChange={(e) => updateDpjField({ name: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: dr. Anis Prima Dewi"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nomor SIP (Surat Izin Praktik) Dokter *
                      </label>
                      <input
                        type="text"
                        value={dpj.sip}
                        onChange={(e) => updateDpjField({ sip: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: SIP/2024/001-KNA"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nomor Registrasi KKI / IDI Dokter
                      </label>
                      <input
                        type="text"
                        value={dpj.idi}
                        onChange={(e) => updateDpjField({ idi: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: KKI: 33.1.1.100.2.20.123456"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Spesialisasi / Kualifikasi Klinis
                      </label>
                      <input
                        type="text"
                        value={dpj.specialization}
                        onChange={(e) => updateDpjField({ specialization: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: Dokter Umum / Penanggung Jawab Klinis"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Kontak Pribadi / WhatsApp DPJ
                      </label>
                      <input
                        type="text"
                        value={dpj.phone}
                        onChange={(e) => updateDpjField({ phone: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: 0812-7389-1122"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Jadwal Praktik & Kehadiran DPJ di Klinik *
                      </label>
                      <textarea
                        rows={2}
                        value={dpj.schedule}
                        onChange={(e) => updateDpjField({ schedule: e.target.value })}
                        required
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: Senin - Sabtu: 08.00 - 20.00 WIB"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Catatan Pelayanan / Keterangan Tambahan
                      </label>
                      <input
                        type="text"
                        value={dpj.notes || ''}
                        onChange={(e) => updateDpjField({ notes: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: Penanggung Jawab Pelayanan Medis Klinik, RME SOAP & Surat Keterangan Istirahat Sakit"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Profil DPJ</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: PERAN USER (PEGAWAI) & HAK AKSES (DENGAN CHECKBOX) */}
              {activeTab === 'pegawai' && (
                <div className="space-y-5">
                  <div className="bg-violet-50/70 p-3.5 rounded-2xl border border-violet-200 text-violet-950 space-y-1">
                    <span className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-violet-700" />
                      Manajemen Peran User (Pegawai) &amp; Aktivasi Checkbox Hak Akses
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Centang kotak (checkbox) pada daftar pegawai di bawah untuk mengaktifkan peran jabatan maupun rincian hak akses modul masing-masing pegawai. Khusus halaman <strong>Pengaturan Sistem &amp; Profil Fasilitas</strong> hanya dapat diakses oleh <strong>Super Admin / APJ</strong>.
                    </p>
                  </div>

                  {/* Form Tambah User (Pegawai) Cepat */}
                  {onAddStaff && (
                    <form
                      onSubmit={handleAddNewStaffInline}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                    >
                      <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-violet-600" />
                        <span>Tambah User (Pegawai) Baru &amp; Pilih Peran Hak Akses</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Nama Pegawai &amp; Gelar *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: apt. Budi Santoso, S.Farm"
                            value={newStaffForm.name}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            No. WhatsApp / Telepon *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="0812-..."
                            value={newStaffForm.phone}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Penempatan Cabang
                          </label>
                          <select
                            value={newStaffForm.branchId}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, branchId: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white"
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">
                          Centang Peran (Role) yang Diaktifkan untuk Pegawai Ini *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_ROLES.map((r) => {
                            const checked = newStaffForm.roles.includes(r);
                            return (
                              <label
                                key={r}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer select-none transition ${
                                  checked
                                    ? 'bg-violet-600 text-white border-violet-700 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const exists = newStaffForm.roles.includes(r);
                                    const nextRoles = exists
                                      ? newStaffForm.roles.length > 1
                                        ? newStaffForm.roles.filter((item) => item !== r)
                                        : newStaffForm.roles
                                      : [...newStaffForm.roles, r];
                                    setNewStaffForm({
                                      ...newStaffForm,
                                      roles: nextRoles,
                                      role: nextRoles[0]
                                    });
                                  }}
                                  className="w-3.5 h-3.5 accent-violet-600 rounded cursor-pointer"
                                />
                                <span>{r}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-violet-700 hover:bg-violet-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Pegawai ke Daftar</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Daftar Pegawai & Checkbox Peran + Hak Akses */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-violet-400" />
                        <span className="font-extrabold text-xs uppercase tracking-wide">
                          Daftar User (Pegawai) &amp; Checkbox Aktivasi Peran Hak Akses ({staffList.length} Pegawai)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-semibold">
                        Klik checkbox peran atau rincian modul untuk mengaktifkan/menonaktifkan
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {staffList.map((st) => {
                        const activeRoles = getStaffRoles(st);
                        const activePerms = getStaffPermissions(st);
                        const isExpanded = expandedStaffId === st.id;
                        const hasSuperAdminRole = activeRoles.includes('Super Admin / APJ');
                        const isCurrentlyActiveStaff = activeStaffId === st.id;

                        return (
                          <div
                            key={st.id}
                            className={`p-4 transition space-y-3 ${
                              isCurrentlyActiveStaff
                                ? 'bg-indigo-50/40 hover:bg-indigo-50/60'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={st.status === 'Aktif'}
                                    onChange={(e) => {
                                      onUpdateStaff?.({
                                        ...st,
                                        status: e.target.checked ? 'Aktif' : 'Non-Aktif'
                                      });
                                    }}
                                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                                    title="Centang untuk status pegawai Aktif"
                                  />
                                </label>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                                      {st.id}
                                    </span>
                                    <span className="font-extrabold text-slate-900 text-xs">
                                      {st.name}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        st.status === 'Aktif'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                                      }`}
                                    >
                                      {st.status}
                                    </span>
                                    {isCurrentlyActiveStaff && (
                                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">
                                        AKUN AKTIF SAAT INI
                                      </span>
                                    )}
                                    {hasSuperAdminRole && (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-amber-700" /> Akses Penuh (Super Admin / APJ)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Kontak: <span className="font-mono">{st.phone}</span> · Peran Aktif:{' '}
                                    <strong className="text-slate-700">{activeRoles.join(', ')}</strong> ·{' '}
                                    <span className="text-violet-700 font-bold">
                                      {activePerms.length} Modul Hak Akses Aktif
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    editingStaffId === st.id
                                      ? setEditingStaffId(null)
                                      : handleStartEditStaff(st)
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                                  title="Edit Data Pegawai"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                                  <span>{editingStaffId === st.id ? 'Batal Edit' : 'Edit'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedStaffId(isExpanded ? null : st.id)}
                                  className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition"
                                >
                                  <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                                  <span>Checkbox Modul ({activePerms.length})</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                {onDeleteStaff && staffList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Hapus pegawai ${st.name} (${st.id})?`)) {
                                        onDeleteStaff(st.id);
                                      }
                                    }}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                                    title="Hapus Pegawai"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Form Edit Pegawai Inline */}
                            {editingStaffId === st.id && (
                              <div className="ml-6 p-3.5 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-2.5 animate-in fade-in">
                                <div className="font-extrabold text-[11px] text-sky-900 uppercase flex items-center gap-1.5">
                                  <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                                  <span>Edit Data Pegawai ({st.id}) — Otomatis Terintegrasi ke Seluruh Form</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                      Nama Lengkap &amp; Gelar *
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffForm.name}
                                      onChange={(e) =>
                                        setEditStaffForm({ ...editStaffForm, name: e.target.value })
                                      }
                                      className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                      No. Telepon / WA
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffForm.phone}
                                      onChange={(e) =>
                                        setEditStaffForm({ ...editStaffForm, phone: e.target.value })
                                      }
                                      className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                      Cabang Penempatan
                                    </label>
                                    <select
                                      value={editStaffForm.branchId}
                                      onChange={(e) =>
                                        setEditStaffForm({
                                          ...editStaffForm,
                                          branchId: e.target.value
                                        })
                                      }
                                      className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white"
                                    >
                                      {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                          {b.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingStaffId(null)}
                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-600 font-bold text-[11px] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditStaff(st)}
                                    className="px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Simpan Perubahan Pegawai</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Checkbox Peran Masing-Masing Pegawai */}
                            <div className="pl-6">
                              <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                                Checkbox Peran (Role) Pegawai:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {AVAILABLE_ROLES.map((roleOpt) => {
                                  const isRoleChecked = activeRoles.includes(roleOpt);
                                  return (
                                    <label
                                      key={roleOpt}
                                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer select-none transition ${
                                        isRoleChecked
                                          ? 'bg-violet-50 border-violet-400 text-violet-950 shadow-2xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isRoleChecked}
                                        onChange={() => handleToggleStaffRoleCheckbox(st, roleOpt)}
                                        className="w-3.5 h-3.5 accent-violet-600 rounded cursor-pointer"
                                      />
                                      <span className="truncate">{roleOpt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Expandable Checkbox Rincian Hak Akses Modul per Pegawai */}
                            {isExpanded && (
                              <div className="ml-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="font-extrabold text-[11px] text-slate-800 uppercase">
                                    Rincian Checkbox Hak Akses Menu &amp; Modul — {st.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {!hasSuperAdminRole && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const allNonLocked = SYSTEM_PERMISSIONS.filter(
                                              (p) => !p.superAdminOnly
                                            ).map((p) => p.id);
                                            onUpdateStaff?.({ ...st, permissions: allNonLocked });
                                          }}
                                          className="text-[10px] font-bold text-sky-700 hover:underline cursor-pointer"
                                        >
                                          Centang Semua Modul
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const defaultRoleSet = new Set<string>();
                                            activeRoles.forEach((r) => {
                                              (
                                                rolePermissions[r] ||
                                                DEFAULT_ROLE_PERMISSIONS[r] ||
                                                []
                                              ).forEach((id) => {
                                                if (id !== 'sys-profil-fasilitas') {
                                                  defaultRoleSet.add(id);
                                                }
                                              });
                                            });
                                            onUpdateStaff?.({
                                              ...st,
                                              permissions: Array.from(defaultRoleSet)
                                            });
                                          }}
                                          className="text-[10px] font-bold text-violet-700 hover:underline cursor-pointer"
                                        >
                                          Reset Sesuai Role
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onUpdateStaff?.({ ...st, permissions: ['dashboard'] });
                                          }}
                                          className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                                        >
                                          Reset Minimal
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {SYSTEM_PERMISSIONS.map((perm) => {
                                    const checked = activePerms.includes(perm.id);
                                    const isLockedSuperAdminOnly =
                                      perm.superAdminOnly && !hasSuperAdminRole;

                                    return (
                                      <label
                                        key={perm.id}
                                        className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] transition select-none ${
                                          isLockedSuperAdminOnly
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                            : checked
                                            ? 'bg-white border-emerald-300 text-slate-900 font-bold shadow-2xs cursor-pointer'
                                            : 'bg-white/70 border-slate-200 text-slate-600 cursor-pointer hover:bg-white'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={isLockedSuperAdminOnly || hasSuperAdminRole}
                                          onChange={() =>
                                            handleToggleStaffPermissionCheckbox(st, perm.id)
                                          }
                                          className="w-3.5 h-3.5 mt-0.5 accent-emerald-600 rounded cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <div className="leading-tight">
                                          <span className="block">{perm.label}</span>
                                          <span className="text-[9px] text-slate-400 block">
                                            {perm.category}
                                            {perm.superAdminOnly ? ' · Khusus Super Admin/APJ' : ''}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matriks Default Hak Akses Berdasarkan Peran (Role) */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 uppercase">
                          Standar Hak Akses Modul per Peran Jabatan (Template Role)
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Pilih peran di bawah untuk menyesuaikan checkbox hak akses bawaan pada peran tersebut.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ROLES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSelectedRoleForMatrix(r)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                              selectedRoleForMatrix === r
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800">
                          Daftar Checkbox Hak Akses untuk Peran:{' '}
                          <span className="text-violet-700 underline">{selectedRoleForMatrix}</span>
                        </span>
                        {selectedRoleForMatrix === 'Super Admin / APJ' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Super Admin / APJ memiliki hak akses penuh ke seluruh sistem
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {SYSTEM_PERMISSIONS.map((perm) => {
                          const rolePerms =
                            rolePermissions[selectedRoleForMatrix] ||
                            DEFAULT_ROLE_PERMISSIONS[selectedRoleForMatrix] ||
                            [];
                          const isChecked =
                            selectedRoleForMatrix === 'Super Admin / APJ'
                              ? true
                              : perm.superAdminOnly
                              ? false
                              : rolePerms.includes(perm.id);
                          const isDisabled =
                            selectedRoleForMatrix === 'Super Admin / APJ' ||
                            Boolean(perm.superAdminOnly);

                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-[11px] select-none transition ${
                                isDisabled && perm.superAdminOnly && selectedRoleForMatrix !== 'Super Admin / APJ'
                                  ? 'bg-rose-50/50 border-rose-200 text-rose-800/70 cursor-not-allowed'
                                  : isChecked
                                  ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 font-bold shadow-2xs cursor-pointer'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() =>
                                  handleToggleRoleMatrixPermission(selectedRoleForMatrix, perm.id)
                                }
                                className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div className="leading-tight">
                                <span className="block">{perm.label}</span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  {perm.category}
                                  {perm.superAdminOnly ? ' · [Hanya Super Admin / APJ]' : ''}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Latisha Farma Enterprise · Otoritas Super Admin / APJ · SIPA, SIP &amp; RBAC Sync
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  );
};
