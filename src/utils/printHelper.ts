import {
  getSavedPharmacyProfile,
  getSavedAPJProfile,
  getSavedDPJProfile,
  syncFacilityProfileToServer
} from '../components/PharmacySettingsModal';

/**
 * Universal print window helper that opens a clean top-level tab
 * to bypass iframe sandbox restrictions (e.g. 'Ignored call to print()')
 */
export function openPrintWindow(mode: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams({ print: mode, ...params });

  try {
    const pharmProfile = getSavedPharmacyProfile();
    const apjProfile = getSavedAPJProfile();
    const dpjProfile = getSavedDPJProfile();

    if (pharmProfile.logoUrl) {
      try {
        localStorage.setItem('latisha_facility_logo', pharmProfile.logoUrl);
      } catch {}
    }

    syncFacilityProfileToServer({
      pharmacy: pharmProfile,
      apj: apjProfile,
      dpj: dpjProfile
    });

    const { logoUrl, ...pharmWithoutLogo } = pharmProfile;
    const pharmForUrl = logoUrl
      ? { ...pharmWithoutLogo, logoUrl: `/api/facility-logo?t=${Date.now()}` }
      : pharmWithoutLogo;

    searchParams.set('_pharm', JSON.stringify(pharmForUrl));
    searchParams.set('_apj', JSON.stringify(apjProfile));
    searchParams.set('_dpj', JSON.stringify(dpjProfile));

    const savedUserName = localStorage.getItem('latisha_user_name');
    if (savedUserName && !searchParams.get('petugas')) {
      searchParams.set('petugas', savedUserName);
    }

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
      const rawPayload = localStorage.getItem(storageKey);
      if (rawPayload) {
        try {
          fetch('/api/print-payload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: storageKey, payload: rawPayload })
          }).catch(() => {});
        } catch {}

        if (rawPayload.length < 200) {
          searchParams.set('_payload', rawPayload);
        }
      }
    }
  } catch (e) {
    console.warn('Error serializing print parameters:', e);
  }

  const printUrl = `?${searchParams.toString()}`;

  let opened = false;
  try {
    const win = window.open(printUrl, '_blank');
    if (win) {
      opened = true;
    }
  } catch (e) {
    console.warn('window.open blocked:', e);
  }

  // Fallback anchor click to ensure popup is not blocked
  if (!opened) {
    try {
      const a = document.createElement('a');
      a.href = printUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      opened = true;
    } catch (e) {
      console.warn('Fallback anchor click blocked:', e);
    }
  }

  // Note: Printing is handled smoothly by the dedicated print view tab (PrintView.tsx)
  // once its DOM, images, and fonts are fully loaded.
}
