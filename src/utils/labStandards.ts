/**
 * Standar Nilai Rujukan Klinis Laboratorium & Evaluator Otomatis
 * Mendukung pembedaan gender: (P)erempuan dan (L)aki-laki
 */

export interface ClinicalStandard {
  id: string;
  name: string;
  aliases: string[];
  unit: string;
  category: 'Darah' | 'Fungsi Hati' | 'Fungsi Ginjal' | 'Profil Lipid' | 'Gula Darah & Lainnya';
  rangeFemale: string;
  rangeMale: string;
  evalFemale: { min?: number; max?: number; isLessThan?: number; isGreaterThan?: number };
  evalMale: { min?: number; max?: number; isLessThan?: number; isGreaterThan?: number };
}

export const CLINICAL_STANDARDS: ClinicalStandard[] = [
  // 1. Darah / Hematologi
  {
    id: 'eritrosit',
    name: 'Eritrosit',
    aliases: ['eritrosit', 'rbc', 'sel darah merah', 'red blood cell'],
    unit: 'juta/µl',
    category: 'Darah',
    rangeFemale: '4.0 - 5.0',
    rangeMale: '4.5 - 5.5',
    evalFemale: { min: 4.0, max: 5.0 },
    evalMale: { min: 4.5, max: 5.5 }
  },
  {
    id: 'hb',
    name: 'Hemoglobin (Hb)',
    aliases: ['hemoglobin', 'hb', 'hgb', 'hemoglobin (hb)'],
    unit: 'g/dL',
    category: 'Darah',
    rangeFemale: '12.0 - 14.0',
    rangeMale: '13.0 - 16.0',
    evalFemale: { min: 12.0, max: 14.0 },
    evalMale: { min: 13.0, max: 16.0 }
  },
  {
    id: 'ht',
    name: 'Hematokrit',
    aliases: ['hematokrit', 'ht', 'hct'],
    unit: '%',
    category: 'Darah',
    rangeFemale: '40 - 50',
    rangeMale: '45 - 55',
    evalFemale: { min: 40, max: 50 },
    evalMale: { min: 45, max: 55 }
  },
  {
    id: 'basofil',
    name: 'Basofil',
    aliases: ['basofil', 'basophil'],
    unit: '%',
    category: 'Darah',
    rangeFemale: '0.0 - 1.0',
    rangeMale: '0.0 - 1.0',
    evalFemale: { min: 0.0, max: 1.0 },
    evalMale: { min: 0.0, max: 1.0 }
  },
  {
    id: 'eosinofil',
    name: 'Eosinofil',
    aliases: ['eosinofil', 'eosinophil'],
    unit: '%',
    category: 'Darah',
    rangeFemale: '1.0 - 3.0',
    rangeMale: '1.0 - 3.0',
    evalFemale: { min: 1.0, max: 3.0 },
    evalMale: { min: 1.0, max: 3.0 }
  },
  {
    id: 'batang',
    name: 'Batang',
    aliases: ['batang', 'neutrofil batang', 'band'],
    unit: '%',
    category: 'Darah',
    rangeFemale: '2.0 - 6.0',
    rangeMale: '2.0 - 6.0',
    evalFemale: { min: 2.0, max: 6.0 },
    evalMale: { min: 2.0, max: 6.0 }
  },
  {
    id: 'segmen',
    name: 'Segmen',
    aliases: ['segmen', 'neutrofil segmen', 'segmented'],
    unit: '%',
    category: 'Darah',
    rangeFemale: '50.0 - 70.0',
    rangeMale: '50.0 - 70.0',
    evalFemale: { min: 50.0, max: 70.0 },
    evalMale: { min: 50.0, max: 70.0 }
  },
  {
    id: 'limfosit',
    name: 'Limfosit',
    aliases: ['limfosit', 'lymphocyte'],
    unit: '%',
    category: 'Darah',
    rangeFemale: '20.0 - 40.0',
    rangeMale: '20.0 - 40.0',
    evalFemale: { min: 20.0, max: 40.0 },
    evalMale: { min: 20.0, max: 40.0 }
  },
  {
    id: 'monosit',
    name: 'Monosit',
    aliases: ['monosit', 'monocyte'],
    unit: '%',
    category: 'Darah',
    rangeFemale: '2.0 - 8.0',
    rangeMale: '2.0 - 8.0',
    evalFemale: { min: 2.0, max: 8.0 },
    evalMale: { min: 2.0, max: 8.0 }
  },
  {
    id: 'led',
    name: 'Laju Endap Darah (LED)',
    aliases: ['laju endap darah', 'led', 'esr'],
    unit: 'mm/jam',
    category: 'Darah',
    rangeFemale: '< 15',
    rangeMale: '< 10',
    evalFemale: { isLessThan: 15 },
    evalMale: { isLessThan: 10 }
  },
  {
    id: 'leukosit',
    name: 'Leukosit',
    aliases: ['leukosit', 'wbc', 'sel darah putih', 'white blood cell'],
    unit: 'x10^3/µl',
    category: 'Darah',
    rangeFemale: '5.0 - 10.0',
    rangeMale: '5.0 - 10.0',
    evalFemale: { min: 5.0, max: 10.0 },
    evalMale: { min: 5.0, max: 10.0 }
  },
  {
    id: 'mch',
    name: 'MCH/HER',
    aliases: ['mch', 'mch/her', 'her'],
    unit: 'pg',
    category: 'Darah',
    rangeFemale: '27 - 31',
    rangeMale: '27 - 31',
    evalFemale: { min: 27, max: 31 },
    evalMale: { min: 27, max: 31 }
  },
  {
    id: 'mchc',
    name: 'MCHC/KHER',
    aliases: ['mchc', 'mchc/kher', 'kher'],
    unit: 'g/dL',
    category: 'Darah',
    rangeFemale: '32 - 36',
    rangeMale: '32 - 36',
    evalFemale: { min: 32, max: 36 },
    evalMale: { min: 32, max: 36 }
  },
  {
    id: 'mcv',
    name: 'MCV/VER',
    aliases: ['mcv', 'mcv/ver', 'ver'],
    unit: 'fl',
    category: 'Darah',
    rangeFemale: '80 - 96',
    rangeMale: '80 - 96',
    evalFemale: { min: 80, max: 96 },
    evalMale: { min: 80, max: 96 }
  },
  {
    id: 'trombosit',
    name: 'Trombosit',
    aliases: ['trombosit', 'platelet', 'plt'],
    unit: 'x10^3/µl',
    category: 'Darah',
    rangeFemale: '150 - 400',
    rangeMale: '150 - 400',
    evalFemale: { min: 150, max: 400 },
    evalMale: { min: 150, max: 400 }
  },

  // 2. Fungsi Hati (LFT)
  {
    id: 'alt_sgpt',
    name: 'ALT (SGPT)',
    aliases: ['alt', 'sgpt', 'alt (sgpt)', 'sgpt (alt)', 'sgpt/alt'],
    unit: 'U/L',
    category: 'Fungsi Hati',
    rangeFemale: '< 23',
    rangeMale: '< 30',
    evalFemale: { isLessThan: 23 },
    evalMale: { isLessThan: 30 }
  },
  {
    id: 'ast_sgot',
    name: 'AST (SGOT)',
    aliases: ['ast', 'sgot', 'ast (sgot)', 'sgot (ast)', 'sgot/ast'],
    unit: 'U/L',
    category: 'Fungsi Hati',
    rangeFemale: '< 21',
    rangeMale: '< 25',
    evalFemale: { isLessThan: 21 },
    evalMale: { isLessThan: 25 }
  },
  {
    id: 'alp',
    name: 'Alkalin Fosfatase',
    aliases: ['alkalin fosfatase', 'alp', 'alkaline phosphatase'],
    unit: 'U/L',
    category: 'Fungsi Hati',
    rangeFemale: '15 - 69',
    rangeMale: '15 - 69',
    evalFemale: { min: 15, max: 69 },
    evalMale: { min: 15, max: 69 }
  },
  {
    id: 'ggt',
    name: 'GGT',
    aliases: ['ggt', 'gamma gt', 'gamma-glutamyl transferase'],
    unit: 'U/L',
    category: 'Fungsi Hati',
    rangeFemale: '5 - 38',
    rangeMale: '5 - 38',
    evalFemale: { min: 5, max: 38 },
    evalMale: { min: 5, max: 38 }
  },
  {
    id: 'bilirubin_total',
    name: 'Bilirubin Total',
    aliases: ['bilirubin total', 'total bilirubin', 't. bili'],
    unit: 'mg/dL',
    category: 'Fungsi Hati',
    rangeFemale: '0.25 - 1.0',
    rangeMale: '0.25 - 1.0',
    evalFemale: { min: 0.25, max: 1.0 },
    evalMale: { min: 0.25, max: 1.0 }
  },
  {
    id: 'bilirubin_direct',
    name: 'Bilirubin Langsung',
    aliases: ['bilirubin langsung', 'bilirubin direk', 'direct bilirubin', 'd. bili'],
    unit: 'mg/dL',
    category: 'Fungsi Hati',
    rangeFemale: '0.0 - 0.25',
    rangeMale: '0.0 - 0.25',
    evalFemale: { min: 0.0, max: 0.25 },
    evalMale: { min: 0.0, max: 0.25 }
  },
  {
    id: 'protein_total',
    name: 'Protein Total',
    aliases: ['protein total', 'total protein'],
    unit: 'g/L',
    category: 'Fungsi Hati',
    rangeFemale: '61 - 82',
    rangeMale: '61 - 82',
    evalFemale: { min: 61, max: 82 },
    evalMale: { min: 61, max: 82 }
  },
  {
    id: 'albumin',
    name: 'Albumin',
    aliases: ['albumin'],
    unit: 'g/L',
    category: 'Fungsi Hati',
    rangeFemale: '37 - 52',
    rangeMale: '37 - 52',
    evalFemale: { min: 37, max: 52 },
    evalMale: { min: 37, max: 52 }
  },

  // 3. Fungsi Ginjal
  {
    id: 'kreatinin',
    name: 'Kreatinin',
    aliases: ['kreatinin', 'creatinine'],
    unit: 'U/L',
    category: 'Fungsi Ginjal',
    rangeFemale: '60 - 150',
    rangeMale: '70 - 160',
    evalFemale: { min: 60, max: 150 },
    evalMale: { min: 70, max: 160 }
  },
  {
    id: 'urea',
    name: 'Urea',
    aliases: ['urea', 'ureum', 'blood urea'],
    unit: 'mg/dL',
    category: 'Fungsi Ginjal',
    rangeFemale: '8 - 25',
    rangeMale: '8 - 25',
    evalFemale: { min: 8, max: 25 },
    evalMale: { min: 8, max: 25 }
  },
  {
    id: 'natrium',
    name: 'Natrium',
    aliases: ['natrium', 'sodium', 'na'],
    unit: 'mmol/L',
    category: 'Fungsi Ginjal',
    rangeFemale: '135 - 145',
    rangeMale: '135 - 145',
    evalFemale: { min: 135, max: 145 },
    evalMale: { min: 135, max: 145 }
  },
  {
    id: 'klorid',
    name: 'Klorid',
    aliases: ['klorid', 'klorida', 'chloride', 'cl'],
    unit: 'mmol/L',
    category: 'Fungsi Ginjal',
    rangeFemale: '94 - 111',
    rangeMale: '94 - 111',
    evalFemale: { min: 94, max: 111 },
    evalMale: { min: 94, max: 111 }
  },
  {
    id: 'kalium',
    name: 'Kalium',
    aliases: ['kalium', 'potassium', 'k'],
    unit: 'mmol/L',
    category: 'Fungsi Ginjal',
    rangeFemale: '3.5 - 5.0',
    rangeMale: '3.5 - 5.0',
    evalFemale: { min: 3.5, max: 5.0 },
    evalMale: { min: 3.5, max: 5.0 }
  },

  // 4. Profil Lipid
  {
    id: 'kolesterol_total',
    name: 'Kolesterol Total',
    aliases: ['kolesterol total', 'total cholesterol', 'kolesterol', 'cholesterol'],
    unit: 'mg/dL',
    category: 'Profil Lipid',
    rangeFemale: '150 - 200',
    rangeMale: '150 - 200',
    evalFemale: { min: 150, max: 200 },
    evalMale: { min: 150, max: 200 }
  },
  {
    id: 'hdl',
    name: 'HDL (Kolesterol HDL)',
    aliases: ['hdl', 'kolesterol hdl', 'hdl (kolesterol hdl)', 'hdl-c'],
    unit: 'mg/dL',
    category: 'Profil Lipid',
    rangeFemale: '> 50',
    rangeMale: '> 40',
    evalFemale: { isGreaterThan: 50 },
    evalMale: { isGreaterThan: 40 }
  },
  {
    id: 'ldl',
    name: 'LDL (Kolesterol LDL)',
    aliases: ['ldl', 'kolesterol ldl', 'ldl (kolesterol ldl)', 'ldl-c'],
    unit: 'mg/dL',
    category: 'Profil Lipid',
    rangeFemale: '< 100',
    rangeMale: '< 100',
    evalFemale: { isLessThan: 100 },
    evalMale: { isLessThan: 100 }
  },
  {
    id: 'trigliserid',
    name: 'Trigliserid',
    aliases: ['trigliserid', 'trigliserida', 'triglycerides', 'tg'],
    unit: 'mg/dL',
    category: 'Profil Lipid',
    rangeFemale: '120 - 190',
    rangeMale: '120 - 190',
    evalFemale: { min: 120, max: 190 },
    evalMale: { min: 120, max: 190 }
  },

  // 5. Pemeriksaan Lain & Gula Darah
  {
    id: 'gdp',
    name: 'Gula Darah Puasa (GDP)',
    aliases: ['gula darah puasa', 'gdp', 'gula puasa', 'fasting blood glucose', 'fbg'],
    unit: 'mg/dL',
    category: 'Gula Darah & Lainnya',
    rangeFemale: '70 - 126',
    rangeMale: '70 - 126',
    evalFemale: { min: 70, max: 126 },
    evalMale: { min: 70, max: 126 }
  },
  {
    id: 'gds',
    name: 'Gula Darah Sewaktu (GDS)',
    aliases: ['gula darah sewaktu', 'gds', 'gula sewaktu', 'random blood glucose', 'rbg'],
    unit: 'mg/dL',
    category: 'Gula Darah & Lainnya',
    rangeFemale: '70 - 200',
    rangeMale: '70 - 200',
    evalFemale: { min: 70, max: 200 },
    evalMale: { min: 70, max: 200 }
  },
  {
    id: 'amilase',
    name: 'Amilase',
    aliases: ['amilase', 'amylase'],
    unit: 'U/L',
    category: 'Gula Darah & Lainnya',
    rangeFemale: '30 - 130',
    rangeMale: '30 - 130',
    evalFemale: { min: 30, max: 130 },
    evalMale: { min: 30, max: 130 }
  },
  {
    id: 'asam_urat',
    name: 'Asam Urat',
    aliases: ['asam urat', 'uric acid', 'uric acid (asam urat)'],
    unit: 'mg/dL',
    category: 'Gula Darah & Lainnya',
    rangeFemale: '2.4 - 5.7',
    rangeMale: '3.4 - 7.0',
    evalFemale: { min: 2.4, max: 5.7 },
    evalMale: { min: 3.4, max: 7.0 }
  }
];

/**
 * Temukan standar klinis berdasarkan nama parameter uji
 */
export function findClinicalStandard(paramName: string): ClinicalStandard | undefined {
  if (!paramName) return undefined;
  const clean = paramName.toLowerCase().trim();
  return CLINICAL_STANDARDS.find(
    (s) =>
      s.name.toLowerCase() === clean ||
      s.aliases.some((alias) => clean === alias || clean.includes(alias))
  );
}

/**
 * Dapatkan rentang rujukan standar untuk parameter berdasarkan jenis kelamin
 */
export function getStandardReferenceRange(
  paramName: string,
  gender: 'Laki-laki' | 'Perempuan'
): { range: string; unit?: string } | null {
  const std = findClinicalStandard(paramName);
  if (!std) return null;
  return {
    range: gender === 'Perempuan' ? std.rangeFemale : std.rangeMale,
    unit: std.unit
  };
}

/**
 * Evaluasi status hasil tes (Normal, Tinggi, Rendah, Kritis) berdasarkan standar klinis
 */
export function evaluateLabResultStatus(
  paramName: string,
  resultVal: string,
  gender: 'Laki-laki' | 'Perempuan',
  currentReferenceRange?: string
): 'Normal' | 'Tinggi' | 'Rendah' | 'Kritis' | 'Abnormal' {
  if (!resultVal || resultVal.trim() === '') return 'Normal';

  // Normalize string: ganti koma desimal ke titik
  const normalizedStr = resultVal.replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(normalizedStr);
  if (isNaN(num)) return 'Normal';

  const std = findClinicalStandard(paramName);

  if (std) {
    const evalRule = gender === 'Perempuan' ? std.evalFemale : std.evalMale;

    // Rule: isLessThan (< 10, < 23, < 100, dll.)
    if (evalRule.isLessThan !== undefined) {
      if (num > evalRule.isLessThan * 2.5) return 'Kritis';
      if (num > evalRule.isLessThan) return 'Tinggi';
      return 'Normal';
    }

    // Rule: isGreaterThan (> 40, > 50, dll. seperti HDL)
    if (evalRule.isGreaterThan !== undefined) {
      if (num < evalRule.isGreaterThan * 0.6) return 'Kritis';
      if (num < evalRule.isGreaterThan) return 'Rendah';
      return 'Normal';
    }

    // Rule: min & max
    if (evalRule.min !== undefined && evalRule.max !== undefined) {
      // Handle unit differences for Leukosit & Trombosit jika pengguna ketik ribuan (misal Leukosit 6500)
      let adjustedNum = num;
      if (std.id === 'leukosit' && num > 100) {
        adjustedNum = num / 1000;
      } else if (std.id === 'trombosit' && num > 1000) {
        adjustedNum = num / 1000;
      }

      if (adjustedNum < evalRule.min * 0.7) return 'Kritis';
      if (adjustedNum > evalRule.max * 1.8) return 'Kritis';
      if (adjustedNum < evalRule.min) return 'Rendah';
      if (adjustedNum > evalRule.max) return 'Tinggi';
      return 'Normal';
    }
  }

  // Fallback evaluator jika bukan parameter di atas tetapi range ditulis "min - max" atau "< max" atau "> min"
  const ref = currentReferenceRange || '';
  if (ref.includes('-')) {
    const parts = ref.split('-').map((s) => parseFloat(s.replace(',', '.').trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (num < parts[0]) return 'Rendah';
      if (num > parts[1]) return 'Tinggi';
      return 'Normal';
    }
  } else if (ref.startsWith('<')) {
    const maxVal = parseFloat(ref.replace('<', '').replace(',', '.').trim());
    if (!isNaN(maxVal)) {
      return num > maxVal ? 'Tinggi' : 'Normal';
    }
  } else if (ref.startsWith('>')) {
    const minVal = parseFloat(ref.replace('>', '').replace(',', '.').trim());
    if (!isNaN(minVal)) {
      return num < minVal ? 'Rendah' : 'Normal';
    }
  }

  return 'Normal';
}

/**
 * Daftar template paket lab yang otomatis disesuaikan dengan jenis kelamin
 */
export function getGenderAdjustedTemplates(gender: 'Laki-laki' | 'Perempuan') {
  return [
    {
      name: 'Gula Darah & Lainnya',
      description: 'GDP, GDS, Asam Urat, Amilase',
      items: [
        {
          parameter: 'Gula Darah Sewaktu (GDS)',
          unit: 'mg/dL',
          referenceRange: '70 - 200'
        },
        {
          parameter: 'Gula Darah Puasa (GDP)',
          unit: 'mg/dL',
          referenceRange: '70 - 126'
        },
        {
          parameter: 'Asam Urat',
          unit: 'mg/dL',
          referenceRange: gender === 'Perempuan' ? '2.4 - 5.7' : '3.4 - 7.0'
        },
        {
          parameter: 'Amilase',
          unit: 'U/L',
          referenceRange: '30 - 130'
        }
      ]
    },
    {
      name: 'Profil Lipid',
      description: 'Kolesterol Total, HDL, LDL, Trigliserid',
      items: [
        {
          parameter: 'Kolesterol Total',
          unit: 'mg/dL',
          referenceRange: '150 - 200'
        },
        {
          parameter: 'HDL (Kolesterol HDL)',
          unit: 'mg/dL',
          referenceRange: gender === 'Perempuan' ? '> 50' : '> 40'
        },
        {
          parameter: 'LDL (Kolesterol LDL)',
          unit: 'mg/dL',
          referenceRange: '< 100'
        },
        {
          parameter: 'Trigliserid',
          unit: 'mg/dL',
          referenceRange: '120 - 190'
        }
      ]
    },
    {
      name: 'Fungsi Ginjal & Elektrolit',
      description: 'Kreatinin, Urea, Asam Urat, Na, K, Cl',
      items: [
        {
          parameter: 'Kreatinin',
          unit: 'U/L',
          referenceRange: gender === 'Perempuan' ? '60 - 150' : '70 - 160'
        },
        {
          parameter: 'Urea',
          unit: 'mg/dL',
          referenceRange: '8 - 25'
        },
        {
          parameter: 'Asam Urat',
          unit: 'mg/dL',
          referenceRange: gender === 'Perempuan' ? '2.4 - 5.7' : '3.4 - 7.0'
        },
        {
          parameter: 'Natrium',
          unit: 'mmol/L',
          referenceRange: '135 - 145'
        },
        {
          parameter: 'Kalium',
          unit: 'mmol/L',
          referenceRange: '3.5 - 5.0'
        },
        {
          parameter: 'Klorid',
          unit: 'mmol/L',
          referenceRange: '94 - 111'
        }
      ]
    },
    {
      name: 'Fungsi Hati (LFT)',
      description: 'ALT/SGPT, AST/SGOT, Bilirubin, Protein, Albumin',
      items: [
        {
          parameter: 'ALT (SGPT)',
          unit: 'U/L',
          referenceRange: gender === 'Perempuan' ? '< 23' : '< 30'
        },
        {
          parameter: 'AST (SGOT)',
          unit: 'U/L',
          referenceRange: gender === 'Perempuan' ? '< 21' : '< 25'
        },
        {
          parameter: 'Alkalin Fosfatase',
          unit: 'U/L',
          referenceRange: '15 - 69'
        },
        {
          parameter: 'GGT',
          unit: 'U/L',
          referenceRange: '5 - 38'
        },
        {
          parameter: 'Bilirubin Total',
          unit: 'mg/dL',
          referenceRange: '0.25 - 1.0'
        },
        {
          parameter: 'Bilirubin Langsung',
          unit: 'mg/dL',
          referenceRange: '0.0 - 0.25'
        },
        {
          parameter: 'Protein Total',
          unit: 'g/L',
          referenceRange: '61 - 82'
        },
        {
          parameter: 'Albumin',
          unit: 'g/L',
          referenceRange: '37 - 52'
        }
      ]
    },
    {
      name: 'Hematologi / Darah Rutin',
      description: 'Eritrosit, Hb, Ht, Leukosit, Trombosit, LED, MCV, MCH, MCHC',
      items: [
        {
          parameter: 'Eritrosit',
          unit: 'juta/µl',
          referenceRange: gender === 'Perempuan' ? '4.0 - 5.0' : '4.5 - 5.5'
        },
        {
          parameter: 'Hemoglobin (Hb)',
          unit: 'g/dL',
          referenceRange: gender === 'Perempuan' ? '12.0 - 14.0' : '13.0 - 16.0'
        },
        {
          parameter: 'Hematokrit',
          unit: '%',
          referenceRange: gender === 'Perempuan' ? '40 - 50' : '45 - 55'
        },
        {
          parameter: 'Leukosit',
          unit: 'x10^3/µl',
          referenceRange: '5.0 - 10.0'
        },
        {
          parameter: 'Trombosit',
          unit: 'x10^3/µl',
          referenceRange: '150 - 400'
        },
        {
          parameter: 'Laju Endap Darah (LED)',
          unit: 'mm/jam',
          referenceRange: gender === 'Perempuan' ? '< 15' : '< 10'
        },
        {
          parameter: 'MCV/VER',
          unit: 'fl',
          referenceRange: '80 - 96'
        },
        {
          parameter: 'MCH/HER',
          unit: 'pg',
          referenceRange: '27 - 31'
        },
        {
          parameter: 'MCHC/KHER',
          unit: 'g/dL',
          referenceRange: '32 - 36'
        }
      ]
    },
    {
      name: 'Hitung Jenis Leukosit (Diff Count)',
      description: 'Basofil, Eosinofil, Batang, Segmen, Limfosit, Monosit',
      items: [
        { parameter: 'Basofil', unit: '%', referenceRange: '0.0 - 1.0' },
        { parameter: 'Eosinofil', unit: '%', referenceRange: '1.0 - 3.0' },
        { parameter: 'Batang', unit: '%', referenceRange: '2.0 - 6.0' },
        { parameter: 'Segmen', unit: '%', referenceRange: '50.0 - 70.0' },
        { parameter: 'Limfosit', unit: '%', referenceRange: '20.0 - 40.0' },
        { parameter: 'Monosit', unit: '%', referenceRange: '2.0 - 8.0' }
      ]
    }
  ];
}
