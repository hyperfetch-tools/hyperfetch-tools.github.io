/**
 * Hyperfetch Malaysia Statutory Suite — Bulk Borang EA (C.P.8A) & Payslip PDF Studio
 * 100% Stateless Browser-RAM ISO 32000 PDF 1.4 Vector Writer + IEEE 802.3 CRC32 ZIP Compiler
 * Zero external dependencies. Strict CSP ('self') compatible.
 */

export const CLOUD_AUTOPAY_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbyxApiw79oG_JHvooqtsc3ctxSwqXuzPqVUM64T2Ifj9aYK2kxRVwq-ABUgO0cOBK6y/exec';

export const POLAR_CHECKOUT_LINKS = {
  MYPAYROL: 'https://buy.polar.sh/polar_cl_YlpL3oaZd36nGEWPvJbSyGZ143JKFgFh5z9Q81nmmTJ',
  MYBUND: 'https://buy.polar.sh/polar_cl_x8tG4fFh0TgXrv1hcu4bulphbGHeBEQbDTSbo4Kp04t',
};

export const WATERMARK_TEXT =
  'Generated FREE via Hyperfetch Malaysia Statutory Suite (hyperfetch-tools.github.io/ea-payslip) — Unlock Pro (RM 39 once) to remove footer & bulk-export 500+ ZIP';
export const WATERMARK_URI = 'https://hyperfetch-tools.github.io/ea-payslip/?ref=pdf_watermark';

const MAX_CSV_BYTES = 10 * 1024 * 1024;
const MAX_BATCH_ROWS = 5000;
const FREE_ROW_LIMIT = 3;

const BANK_BIC_MAP = [
  [/maybank|malayan\s*banking|mbb/i, 'MBBEMYKL', 'Maybank'],
  [/cimb/i, 'CIBBMYKL', 'CIMB Bank'],
  [/public\s*bank|pbb/i, 'PBBEMYKL', 'Public Bank'],
  [/rhb/i, 'RHBBMYKL', 'RHB Bank'],
  [/hong\s*leong|hlb/i, 'HLBBMYKL', 'Hong Leong Bank'],
  [/am\s*bank|ambank/i, 'ARBKMYKL', 'AmBank'],
  [/bank\s*islam|bimb/i, 'BIMBMYKL', 'Bank Islam'],
  [/bank\s*rakyat/i, 'BKRMMYKL', 'Bank Rakyat'],
  [/bsn|simpanan\s*nasional/i, 'BSNAMYK1', 'BSN'],
  [/muamalat/i, 'BMMBMYKL', 'Bank Muamalat'],
  [/affin/i, 'PHBMMYKL', 'Affin Bank'],
  [/alliance/i, 'MFBBMYKL', 'Alliance Bank'],
  [/agro\s*bank|agrobank/i, 'AGOBMYKL', 'Agrobank'],
  [/uob|united\s*overseas/i, 'UOVBMYKL', 'UOB Malaysia'],
  [/ocbc/i, 'OCBCMYKL', 'OCBC Malaysia'],
  [/hsbc/i, 'HBMBMYKL', 'HSBC Malaysia'],
  [/standard\s*chartered|scb/i, 'SCBLMYKX', 'Standard Chartered'],
  [/gx\s*bank|gxbank/i, 'GXSPMYKL', 'GXBank'],
  [/tng|touch\s*n\s*go/i, 'TNGDMYNB', 'TNG Digital'],
  [/boost\s*bank/i, 'BOSTMYKL', 'Boost Bank'],
  [/aeon\s*bank/i, 'AEONMYKL', 'AEON Bank'],
];

/**
 * Delimiter-agnostic CSV / TSV / Semicolon parser (handles Malaysian Excel regional settings).
 */
export function parseFlexibleDelimited(rawText) {
  const cleaned = String(rawText || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleaned.trim()) return { delimiter: ',', headers: [], rows: [] };

  const firstLine = cleaned.split('\n').find((l) => l.trim().length > 0) || '';
  const counts = {
    '\t': (firstLine.match(/\t/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    ',': (firstLine.match(/,/g) || []).length,
  };
  let delimiter = ',';
  if (counts['\t'] > counts[','] && counts['\t'] >= counts[';']) delimiter = '\t';
  else if (counts[';'] > counts[',']) delimiter = ';';

  const matrix = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cur.trim());
      cur = '';
    } else if (ch === '\n') {
      row.push(cur.trim());
      if (row.some((c) => c !== '')) matrix.push(row);
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
  }
  row.push(cur.trim());
  if (row.some((c) => c !== '')) matrix.push(row);
  if (matrix.length < 2) return { delimiter, headers: matrix[0] || [], rows: [] };

  const headers = matrix[0].map((h, idx) => h || 'Column_' + (idx + 1));
  const rows = matrix.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    return obj;
  });
  return { delimiter, headers, rows };
}

function sanitizeText(val, maxLen = 80) {
  let s = String(val ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  // Strip spreadsheet formula prefixes (CWE-1236) and normalize non-Latin1 dashes
  s = s.replace(/^[=+\-@|]+/, '').replace(/[\u2013\u2014]/g, '-');
  // Keep printable WinAnsi/ASCII characters safe for PDF Type1 Helvetica
  s = s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
  return s.slice(0, maxLen);
}

function pickField(row, patterns) {
  const keys = Object.keys(row);
  for (const pat of patterns) {
    const k = keys.find((key) => pat.test(key.trim()));
    if (k !== undefined && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return '';
}

function parseMoney(val, fallback = null) {
  if (val === null || val === undefined || String(val).trim() === '') return fallback;
  const cleaned = String(val).replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : fallback;
}

function normalizeMyKadOrPassport(rawNric, rawPassport, rawCountry) {
  const country = sanitizeText(rawCountry || 'MY', 4).toUpperCase() || 'MY';
  const passClean = sanitizeText(rawPassport, 24).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  let digits = String(rawNric || '').replace(/\D/g, '');
  let repairedMyKad = false;

  if (!digits && passClean) {
    return { isForeign: country !== 'MY', idDisplay: passClean, nric12: '', country, repairedMyKad: false };
  }
  if (digits.length === 11) {
    digits = '0' + digits;
    repairedMyKad = true;
  } else if (digits.length === 10) {
    digits = '00' + digits;
    repairedMyKad = true;
  }
  if (digits.length === 12 && country === 'MY') {
    const formatted = digits.slice(0, 6) + '-' + digits.slice(6, 8) + '-' + digits.slice(8, 12);
    return { isForeign: false, idDisplay: formatted, nric12: digits, country: 'MY', repairedMyKad };
  }
  const fallbackId = passClean || sanitizeText(rawNric, 24) || 'UNSPECIFIED';
  return {
    isForeign: country !== 'MY' || Boolean(passClean && !digits),
    idDisplay: fallbackId,
    nric12: digits.length === 12 ? digits : '',
    country,
    repairedMyKad,
  };
}

function computeAgeFromNric(nric12, refYear) {
  if (!/^\d{12}$/.test(nric12)) return null;
  const yy = Number(nric12.slice(0, 2));
  const mm = Number(nric12.slice(2, 4));
  if (mm < 1 || mm > 12) return null;
  const cutoff = (refYear % 100) - 14;
  const birthYear = yy <= cutoff ? 2000 + yy : 1900 + yy;
  const age = refYear - birthYear;
  return age >= 14 && age <= 95 ? age : null;
}

export function calcStatutoryMonthly(grossWages, isForeign, age) {
  if (!grossWages || grossWages <= 10) {
    return { epfEe: 0, epfEr: 0, socsoEe: 0, socsoEr: 0, eisEe: 0, eisEr: 0 };
  }
  let stepWage = grossWages;
  if (grossWages <= 5000) stepWage = Math.ceil(grossWages / 20) * 20;
  else if (grossWages <= 20000) stepWage = Math.ceil(grossWages / 100) * 100;

  let epfEr = 0;
  let epfEe = 0;
  if (age !== null && age >= 75) {
    epfEr = 0;
    epfEe = 0;
  } else if (isForeign) {
    epfEr = Math.ceil(stepWage * 0.02);
    epfEe = Math.ceil(stepWage * 0.02);
  } else if (age !== null && age >= 60) {
    epfEr = Math.ceil(stepWage * 0.04);
    epfEe = 0;
  } else {
    epfEr = Math.ceil(stepWage * (grossWages <= 5000 ? 0.13 : 0.12));
    epfEe = Math.ceil(stepWage * 0.11);
  }

  const isCat2 = isForeign || (age !== null && age >= 60);
  const eisExempt = isForeign || (age !== null && (age >= 60 || age < 18));

  let socsoEr = 0;
  let socsoEe = 0;
  let eisEe = 0;
  if (grossWages > 5900) {
    socsoEr = isCat2 ? 74.4 : 104.65;
    socsoEe = isCat2 ? 0.0 : 29.9;
    eisEe = eisExempt ? 0.0 : 11.9;
  } else {
    let midpoint = 25;
    if (grossWages <= 30) midpoint = 20;
    else if (grossWages <= 50) midpoint = 40;
    else if (grossWages <= 70) midpoint = 60;
    else if (grossWages <= 100) midpoint = 85;
    else if (grossWages <= 140) midpoint = 120;
    else if (grossWages <= 200) midpoint = 170;
    else midpoint = Math.floor((grossWages - 0.001) / 100) * 100 + 50;
    const round5Sen = (n) => Number((Math.round(n * 20) / 20).toFixed(2));
    socsoEr = isCat2 ? round5Sen(midpoint * 0.0125) : round5Sen(midpoint * 0.0175);
    socsoEe = isCat2 ? 0.0 : round5Sen(midpoint * 0.005);
    eisEe = eisExempt ? 0.0 : Number((midpoint * 0.002).toFixed(2));
  }

  return { epfEe, epfEr, socsoEe, socsoEr, eisEe, eisEr: eisEe };
}

function resolveBankInfo(rawBank) {
  const s = sanitizeText(rawBank, 40);
  for (const [rx, bic, label] of BANK_BIC_MAP) {
    if (rx.test(s)) return { bankName: label, bankBic: bic };
  }
  return { bankName: s || 'Bank Transfer', bankBic: /^[A-Z0-9]{8,11}$/.test(s) ? s : 'MBBEMYKL' };
}

/**
 * Normalizes CSV rows for BOTH Monthly Payslips (Employment Act s.61) AND Annual Borang EA (C.P.8A).
 * If annual columns aren't explicitly provided, auto-projects or uses explicit annual totals seamlessly.
 */
export function normalizeEaAndPayslipRows(rawRows, employer = {}) {
  const ymMatch = String(employer.salaryMonth || '2026-10').match(/^(\d{4})-(\d{2})$/);
  const year = Number(employer.taxYear || (ymMatch ? ymMatch[1] : 2026)) || 2026;
  const monthNum = ymMatch ? Number(ymMatch[2]) : 10;

  const employerClean = {
    companyName: sanitizeText(employer.companyName || 'HYPERFETCH DEMO SDN BHD', 70),
    ssmNo: sanitizeText(employer.ssmNo || '202401012345 (1558195-X)', 36),
    employerENo: sanitizeText(employer.employerENo || 'E9089151000', 24),
    kwspNo: sanitizeText(employer.kwspNo || '012345678', 24),
    perkesoCode: sanitizeText(employer.perkesoCode || 'E1100012345Z', 24),
    signatoryName: sanitizeText(employer.signatoryName || 'HR & Payroll Director', 50),
    signatoryRole: sanitizeText(employer.signatoryRole || 'Authorized Officer', 45),
    salaryMonth: year + '-' + String(monthNum).padStart(2, '0'),
    taxYear: year,
    issueDate: sanitizeText(employer.issueDate || year + '-12-31', 16),
  };

  let myKadRepairs = 0;
  let autoCalcCount = 0;

  const employees = rawRows.slice(0, MAX_BATCH_ROWS).map((row, idx) => {
    const staffId = sanitizeText(
      pickField(row, [/^staff\s*id$/i, /^emp(loyee)?\s*(id|no|code)$/i, /^no\s*pekerja$/i]) ||
        'EMP' + String(idx + 1).padStart(3, '0'),
      20
    );
    const name = sanitizeText(
      pickField(row, [/^(full\s*)?name$/i, /^employee(\s*name)?$/i, /^nama(\s*pekerja)?$/i]) ||
        'Employee ' + (idx + 1),
      60
    );
    const designation = sanitizeText(
      pickField(row, [/^position$/i, /^designation$/i, /^role$/i, /^job\s*title$/i, /^jawatan$/i]) ||
        'Executive',
      45
    );
    const rawNric = pickField(row, [/^nric$/i, /^ic(\s*no)?$/i, /^mykad$/i, /^id\s*no$/i]);
    const rawPassport = pickField(row, [/^passport(\s*no)?$/i]);
    const rawCountry = pickField(row, [/^country$/i, /^nationality$/i]);
    const idInfo = normalizeMyKadOrPassport(rawNric, rawPassport, rawCountry);
    if (idInfo.repairedMyKad) myKadRepairs++;

    const age = computeAgeFromNric(idInfo.nric12, year);
    const taxTin = sanitizeText(
      pickField(row, [/^(tax\s*)?tin$/i, /^income\s*tax(\s*no)?$/i, /^lhdn(\s*no)?$/i, /^sg\s*no$/i]) || '—',
      24
    );
    const kwspMemberNo = sanitizeText(
      pickField(row, [/^kwsp(\s*no)?$/i, /^epf(\s*no)?$/i]) || '—',
      24
    );

    const basic = parseMoney(
      pickField(row, [/^basic(\s*salary|\s*wages?)?$/i, /^wages?$/i, /^gaji(\s*pokok|\s*kasar)?$/i, /^gross(\s*salary|\s*pay)?$/i]),
      0
    );
    const overtime = parseMoney(pickField(row, [/^overtime$/i, /^ot$/i, /^kerja\s*lebih\s*masa$/i]), 0);
    const allowances = parseMoney(pickField(row, [/^allowances?$/i, /^elaun$/i, /^fixed\s*allowance$/i]), 0);
    const bonus = parseMoney(pickField(row, [/^bonus$/i, /^commission$/i, /^komisen$/i]), 0);
    const exemptAllowance = parseMoney(
      pickField(row, [/^exempt(\s*allowances?)?$/i, /^tax\s*exempt$/i, /^elaun\s*dikecualikan$/i]),
      0
    );
    const monthsWorked = Math.min(
      12,
      Math.max(1, Number(pickField(row, [/^months?(\s*worked)?$/i, /^tempoh\s*bulan$/i])) || 1)
    );

    const monthlyGross = Number((basic + overtime + allowances + bonus).toFixed(2));
    const statutory = calcStatutoryMonthly(basic + allowances + bonus, idInfo.isForeign, age);

    const explicitEpfEe = parseMoney(pickField(row, [/^epf\s*ee$/i, /^kwsp\s*ee$/i, /^employee\s*epf$/i]), null);
    const explicitEpfEr = parseMoney(pickField(row, [/^epf\s*er$/i, /^kwsp\s*er$/i, /^employer\s*epf$/i]), null);
    const explicitSocsoEe = parseMoney(pickField(row, [/^socso(\s*ee)?$/i, /^perkeso(\s*ee)?$/i]), null);
    const explicitEisEe = parseMoney(pickField(row, [/^eis(\s*ee)?$/i, /^sip(\s*ee)?$/i]), null);

    if (explicitEpfEe === null) autoCalcCount++;

    const epfEe = explicitEpfEe !== null ? explicitEpfEe : statutory.epfEe;
    const epfEr = explicitEpfEr !== null ? explicitEpfEr : statutory.epfEr;
    const socsoEe = explicitSocsoEe !== null ? explicitSocsoEe : statutory.socsoEe;
    const socsoEr = statutory.socsoEr;
    const eisEe = explicitEisEe !== null ? explicitEisEe : statutory.eisEe;
    const eisEr = statutory.eisEr;

    const pcb = parseMoney(pickField(row, [/^pcb$/i, /^mtd$/i, /^potongan\s*cukai$/i]), 0);
    const cp38 = parseMoney(pickField(row, [/^cp38$/i]), 0);
    const zakat = parseMoney(pickField(row, [/^zakat$/i]), 0);

    const totalDeductions = Number((epfEe + socsoEe + eisEe + pcb + cp38 + zakat).toFixed(2));
    const netPay = Number(Math.max(0, monthlyGross - totalDeductions).toFixed(2));

    const explicitAnnualSalary = parseMoney(pickField(row, [/^annual\s*(gross|salary|wages)$/i, /^ea\s*b1a$/i, /^ytd\s*salary$/i]), null);
    const factor = explicitAnnualSalary !== null ? 1 : monthsWorked;
    const eaSalary = explicitAnnualSalary !== null ? explicitAnnualSalary : Number((basic * factor).toFixed(2));
    const eaBonusAllow = parseMoney(
      pickField(row, [/^annual\s*(bonus|allowance)$/i, /^ea\s*b1b$/i]),
      Number(((overtime + allowances) * factor + bonus).toFixed(2))
    );
    const eaBik = parseMoney(pickField(row, [/^bik$/i, /^benefits?\s*in\s*kind$/i, /^ea\s*b1d$/i]), 0);
    const eaTotalTaxable = Number((eaSalary + eaBonusAllow + eaBik).toFixed(2));
    const eaPcb = parseMoney(pickField(row, [/^annual\s*pcb$/i, /^ytd\s*pcb$/i]), Number((pcb * factor).toFixed(2)));
    const eaCp38 = parseMoney(pickField(row, [/^annual\s*cp38$/i]), Number((cp38 * factor).toFixed(2)));
    const eaZakat = parseMoney(pickField(row, [/^annual\s*zakat$/i]), Number((zakat * factor).toFixed(2)));
    const eaEpfEe = parseMoney(pickField(row, [/^annual\s*epf$/i, /^ytd\s*epf$/i]), Number((epfEe * factor).toFixed(2)));
    const eaSocsoEisEe = parseMoney(
      pickField(row, [/^annual\s*socso$/i, /^ytd\s*socso$/i]),
      Number(((socsoEe + eisEe) * factor).toFixed(2))
    );
    const eaExempt = Number((exemptAllowance * factor).toFixed(2));

    const bankResolved = resolveBankInfo(pickField(row, [/^bank(\s*name)?$/i]));
    const bankAccount = String(pickField(row, [/^bank\s*acc(ount)?(\s*no)?$/i, /^acc(ount)?\s*no$/i])).replace(/[^0-9]/g, '');

    return {
      rowIndex: idx + 1,
      staffId,
      name,
      designation,
      idDisplay: idInfo.idDisplay,
      isForeign: idInfo.isForeign,
      country: idInfo.country,
      age,
      taxTin,
      kwspMemberNo,
      monthsWorked,
      basic,
      overtime,
      allowances,
      bonus,
      monthlyGross,
      epfEe,
      epfEr,
      socsoEe,
      socsoEr,
      eisEe,
      eisEr,
      pcb,
      cp38,
      zakat,
      totalDeductions,
      netPay,
      eaSalary,
      eaBonusAllow,
      eaBik,
      eaTotalTaxable,
      eaPcb,
      eaCp38,
      eaZakat,
      eaEpfEe,
      eaSocsoEisEe,
      eaExempt,
      bankName: bankResolved.bankName,
      bankBic: bankResolved.bankBic,
      bankAccount: bankAccount || '—',
    };
  });

  const totals = employees.reduce(
    (acc, e) => {
      acc.monthlyGross += e.monthlyGross;
      acc.netPay += e.netPay;
      acc.epfTotal += e.epfEe + e.epfEr;
      acc.eaTaxableTotal += e.eaTotalTaxable;
      acc.eaPcbTotal += e.eaPcb;
      return acc;
    },
    { monthlyGross: 0, netPay: 0, epfTotal: 0, eaTaxableTotal: 0, eaPcbTotal: 0 }
  );

  return {
    employer: employerClean,
    employees,
    diagnostics: {
      totalStaff: employees.length,
      myKadRepairs,
      autoCalcCount,
      totals,
    },
  };
}
/* ============================================================================
 * ZERO-DEPENDENCY ISO 32000 PDF 1.4 VECTOR ENGINE (WITH CLICKABLE URI WATERMARK)
 * ============================================================================ */

function pdfEscape(str) {
  return String(str ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

class PdfPageCanvas {
  constructor() {
    this.ops = [];
  }
  rectFill(x, y, w, h, r, g, b) {
    this.ops.push(r.toFixed(3) + ' ' + g.toFixed(3) + ' ' + b.toFixed(3) + ' rg ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re f');
  }
  rectStroke(x, y, w, h, r, g, b, lineW = 0.6) {
    this.ops.push(lineW.toFixed(2) + ' w ' + r.toFixed(3) + ' ' + g.toFixed(3) + ' ' + b.toFixed(3) + ' RG ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re S');
  }
  line(x1, y1, x2, y2, r = 0.8, g = 0.84, b = 0.88, lineW = 0.5) {
    this.ops.push(lineW.toFixed(2) + ' w ' + r.toFixed(3) + ' ' + g.toFixed(3) + ' ' + b.toFixed(3) + ' RG ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' l S');
  }
  text(str, x, y, font = 'F1', size = 9, r = 0.06, g = 0.09, b = 0.16) {
    this.ops.push('BT /' + font + ' ' + size.toFixed(1) + ' Tf ' + r.toFixed(3) + ' ' + g.toFixed(3) + ' ' + b.toFixed(3) + ' rg 1 0 0 1 ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Tm (' + pdfEscape(str) + ') Tj ET');
  }
  textRight(str, rightX, y, font = 'F3', size = 9, r = 0.06, g = 0.09, b = 0.16) {
    const s = String(str ?? '');
    const charW = font === 'F3' ? size * 0.6 : size * 0.52;
    const x = Math.max(36, rightX - s.length * charW);
    this.text(s, x, y, font, size, r, g, b);
  }
  drawWatermarkFooter() {
    this.rectFill(36, 16, 523.28, 22, 0.94, 0.99, 0.96);
    this.rectStroke(36, 16, 523.28, 22, 0.04, 0.59, 0.41, 0.7);
    this.text(
      'Generated FREE via Hyperfetch Malaysia Statutory Suite (hyperfetch-tools.github.io/ea-payslip)',
      44,
      28.5,
      'F2',
      7.6,
      0.02,
      0.38,
      0.27
    );
    this.text(
      'Click here to unlock Pro (RM 39 One-Time) -> Removes this footer & exports 500+ employee PDFs in 1 ZIP',
      44,
      19.8,
      'F1',
      7.1,
      0.04,
      0.47,
      0.34
    );
  }
  toStreamString() {
    return this.ops.join('\n');
  }
}

function compilePdfDocument(pageStreams, includeWatermarkLink = true) {
  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length; // 1-based PDF object number
  };

  addObj(''); // placeholder 1
  addObj(''); // placeholder 2
  const f1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const f3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');

  let linkAnnotId = null;
  if (includeWatermarkLink) {
    linkAnnotId = addObj(
      '<< /Type /Annot /Subtype /Link /Rect [36 16 559.28 38] /Border [0 0 0] /A << /Type /Action /S /URI /URI (' + pdfEscape(WATERMARK_URI) + ') >> >>'
    );
  }

  const pageIds = [];
  for (const streamStr of pageStreams) {
    const streamBytesLen = new TextEncoder().encode(streamStr).length;
    const contentId = addObj('<< /Length ' + streamBytesLen + ' >>\nstream\n' + streamStr + '\nendstream');
    const annotsPart = linkAnnotId ? ' /Annots [' + linkAnnotId + ' 0 R]' : '';
    const pageId = addObj(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R /F3 ' + f3 + ' 0 R >> >> /Contents ' + contentId + ' 0 R' + annotsPart + ' >>'
    );
    pageIds.push(pageId);
  }

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = '<< /Type /Pages /Kids [' + pageIds.map((id) => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>';

  const encoder = new TextEncoder();
  const chunks = [];
  let byteOffset = 0;
  const pushStr = (s) => {
    const b = encoder.encode(s);
    chunks.push(b);
    byteOffset += b.length;
  };

  pushStr('%PDF-1.4\n%HyperfetchStatutoryPDF\n');
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteOffset);
    pushStr((i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n');
  }

  const xrefStart = byteOffset;
  pushStr('xref\n0 ' + (objects.length + 1) + '\n');
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i <= objects.length; i++) {
    pushStr(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  }
  pushStr(
    'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n'
  );

  const out = new Uint8Array(byteOffset);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

function renderBorangEaPage(emp, employer, watermark = true) {
  const c = new PdfPageCanvas();
  // Official Navy Header Banner
  c.rectFill(36, 766, 523.28, 46, 0.043, 0.122, 0.227);
  c.text('KERAJAAN MALAYSIA / LHDN — BORANG C.P.8A (PIN. 2025/2026)', 46, 796, 'F2', 8.5, 0.65, 0.95, 0.82);
  c.text(
    'BORANG EA — PENYATA SARAAN DARIPADA PENGGJIAN BAGI TAHUN BERAKHIR 31 DISEMBER ' + employer.taxYear,
    46,
    783,
    'F2',
    10.2,
    1,
    1,
    1
  );
  c.text(
    'STATEMENT OF REMUNERATION FROM EMPLOYMENT (SECTION 83(1A), INCOME TAX ACT 1967)',
    46,
    772,
    'F1',
    7.8,
    0.8,
    0.85,
    0.92
  );

  // Employer Metadata Strip
  c.rectFill(36, 720, 523.28, 40, 0.96, 0.97, 0.99);
  c.rectStroke(36, 720, 523.28, 40, 0.78, 0.82, 0.88);
  c.text('Employer Name / Majikan: ' + employer.companyName, 44, 745, 'F2', 8.8);
  c.text('SSM / Reg No.: ' + employer.ssmNo, 44, 730, 'F1', 8.2, 0.28, 0.33, 0.41);
  c.text('Employer E-No. (No. Majikan): ' + employer.employerENo, 330, 745, 'F2', 8.6);
  c.text('Serial No. (No. Siri): EA-' + employer.taxYear + '-' + emp.staffId, 330, 730, 'F3', 8.2);

  // PART A: Employee Particulars
  let y = 702;
  c.rectFill(36, y - 4, 523.28, 16, 0.09, 0.2, 0.36);
  c.text('BAHAGIAN A : BUTIRAN PEKERJA / PART A : EMPLOYEE PARTICULARS', 44, y, 'F2', 8.5, 1, 1, 1);

  y -= 20;
  c.rectStroke(36, y - 48, 523.28, 62, 0.8, 0.84, 0.88);
  c.text('1. Full Name (Nama Penuh): ' + emp.name, 44, y, 'F2', 9);
  c.text('2. Job Title (Jawatan): ' + emp.designation, 340, y, 'F1', 8.5);
  c.text('3. Staff No. (No. Pekerja): ' + emp.staffId, 44, y - 16, 'F1', 8.5);
  c.text('4. NRIC / Passport No.: ' + emp.idDisplay, 200, y - 16, 'F1', 8.5);
  c.text('5. LHDN Tax TIN: ' + emp.taxTin, 390, y - 16, 'F1', 8.5);
  c.text('6. KWSP / EPF Member No.: ' + emp.kwspMemberNo, 44, y - 32, 'F1', 8.5);
  c.text('7. Active Months in ' + employer.taxYear + ': ' + emp.monthsWorked + ' Month(s)', 340, y - 32, 'F1', 8.5);

  // PART B: Employment Income & Benefits
  y -= 68;
  c.rectFill(36, y - 4, 523.28, 16, 0.09, 0.2, 0.36);
  c.text('BAHAGIAN B : PENDAPATAN PENGGJIAN & MANFAAT / EMPLOYMENT INCOME (RM)', 44, y, 'F2', 8.5, 1, 1, 1);

  const bRows = [
    ['1(a) Gross Salary, Wages or Leave Pay (Gaji Kasar, Upah atau Gaji Cuti)', emp.eaSalary],
    ['1(b) Fees, Commissions, Bonus or Taxable Allowances (Fi, Komisen, Bonus atau Elaun)', emp.eaBonusAllow],
    ['1(c) Gross Tips, Perquisites, Awards or Other Payments', 0],
    ['1(d) Benefits-in-Kind / Value of Living Accommodation (Manfaat Berupa Barangan / Vola)', emp.eaBik],
    ['1(e) Unapproved Provident Fund Refund / Compensation for Loss of Employment', 0],
  ];

  y -= 20;
  for (const [label, amt] of bRows) {
    c.text(label, 44, y, 'F1', 8.4);
    c.textRight(fmtMoney(amt), 550, y, 'F3', 8.8);
    c.line(36, y - 5, 559.28, y - 5);
    y -= 17;
  }
  c.rectFill(36, y - 5, 523.28, 18, 0.93, 0.98, 0.95);
  c.text('JUMLAH PENDAPATAN KASAR BERCUKAI / TOTAL TAXABLE EMPLOYMENT INCOME (B)', 44, y, 'F2', 8.8, 0.02, 0.38, 0.27);
  c.textRight('RM ' + fmtMoney(emp.eaTotalTaxable), 550, y, 'F3', 9.4, 0.02, 0.38, 0.27);

  // PART C & PART D: Deductions
  y -= 28;
  c.rectFill(36, y - 4, 523.28, 16, 0.09, 0.2, 0.36);
  c.text('BAHAGIAN D : POTONGAN CUKAI & ZAKAT / TAX DEDUCTIONS REMITTED TO LHDN (RM)', 44, y, 'F2', 8.5, 1, 1, 1);

  const dRows = [
    ['1. Monthly Tax Deductions (Potongan Cukai Bulanan — PCB / MTD) Paid to LHDN', emp.eaPcb],
    ['2. CP38 Deduction Instructions (Arahan Potongan CP38)', emp.eaCp38],
    ['3. Zakat Paid via Salary Deduction (Zakat yang dibayar melalui potongan gaji)', emp.eaZakat],
  ];
  y -= 20;
  for (const [label, amt] of dRows) {
    c.text(label, 44, y, 'F1', 8.4);
    c.textRight(fmtMoney(amt), 550, y, 'F3', 8.8);
    c.line(36, y - 5, 559.28, y - 5);
    y -= 17;
  }

  // PART E: Contributions Paid by Employee
  y -= 10;
  c.rectFill(36, y - 4, 523.28, 16, 0.09, 0.2, 0.36);
  c.text('BAHAGIAN E : CARUMAN DIBAYAR OLEH PEKERJA / STATUTORY FUNDS PAID BY EMPLOYEE', 44, y, 'F2', 8.5, 1, 1, 1);

  y -= 20;
  c.text('1. Kumpulan Wang Simpanan Pekerja (KWSP / EPF) — Employee Share Only (Syer Pekerja)', 44, y, 'F1', 8.4);
  c.textRight(fmtMoney(emp.eaEpfEe), 550, y, 'F3', 8.8);
  c.line(36, y - 5, 559.28, y - 5);
  y -= 17;
  c.text('2. PERKESO (SOCSO) & Sistem Insurans Pekerjaan (EIS / SIP) — Employee Share Only', 44, y, 'F1', 8.4);
  c.textRight(fmtMoney(emp.eaSocsoEisEe), 550, y, 'F3', 8.8);
  c.line(36, y - 5, 559.28, y - 5);

  // PART F: Tax Exempt Allowances
  y -= 26;
  c.rectFill(36, y - 4, 523.28, 16, 0.09, 0.2, 0.36);
  c.text('BAHAGIAN F : JUMLAH ELAUN / PERKUISIT / MANFAAT DIKECUALIKAN CUKAI', 44, y, 'F2', 8.5, 1, 1, 1);
  y -= 20;
  c.text('Total Tax-Exempt Allowances / Perquisites / Gifts / Benefits (Jumlah Elaun Dikecualikan Cukai)', 44, y, 'F1', 8.4);
  c.textRight(fmtMoney(emp.eaExempt), 550, y, 'F3', 8.8);
  c.line(36, y - 5, 559.28, y - 5);

  // Declaration Sign-off Box
  y -= 74;
  c.rectStroke(36, y, 523.28, 56, 0.75, 0.8, 0.86);
  c.text('Akuan Majikan / Employer Certification — Date (Tarikh): ' + employer.issueDate, 44, y + 40, 'F2', 8.4);
  c.text('Authorized Officer (Pegawai Diberi Kuasa): ' + employer.signatoryName + ' (' + employer.signatoryRole + ')', 44, y + 25, 'F1', 8.2);
  c.text(
    'This computer-generated Borang C.P.8A (EA) is issued pursuant to s.83(1A) Income Tax Act 1967 and requires no physical wet signature.',
    44,
    y + 10,
    'F1',
    7.4,
    0.38,
    0.43,
    0.5
  );

  if (watermark) c.drawWatermarkFooter();
  return c.toStreamString();
}

function renderPayslipPage(emp, employer, watermark = true) {
  const c = new PdfPageCanvas();
  // Header Banner
  c.rectFill(36, 760, 523.28, 52, 0.043, 0.122, 0.227);
  c.text(employer.companyName, 46, 792, 'F2', 12, 1, 1, 1);
  c.text(
    'SSM: ' + employer.ssmNo + '  |  KWSP No: ' + employer.kwspNo + '  |  PERKESO: ' + employer.perkesoCode,
    46,
    777,
    'F1',
    8,
    0.78,
    0.84,
    0.92
  );
  c.text('PENYATA GAJI BULANAN / ITEMIZED PAYSLIP (EMPLOYMENT ACT 1955 s.61)', 46, 765, 'F2', 7.8, 0.43, 0.91, 0.72);
  c.textRight('PERIOD: ' + employer.salaryMonth, 548, 790, 'F3', 10, 1, 1, 1);

  // Employee Info Card
  c.rectFill(36, 692, 523.28, 60, 0.97, 0.98, 0.99);
  c.rectStroke(36, 692, 523.28, 60, 0.8, 0.84, 0.88);
  c.text('Employee Name: ' + emp.name, 46, 736, 'F2', 9.4);
  c.text('Staff ID: ' + emp.staffId, 360, 736, 'F1', 8.6);
  c.text('NRIC / Passport: ' + emp.idDisplay + (emp.isForeign ? ' (' + emp.country + ')' : ''), 46, 720, 'F1', 8.6);
  c.text('Designation: ' + emp.designation, 360, 720, 'F1', 8.6);
  c.text('Bank: ' + emp.bankName + ' (' + emp.bankBic + ') — Acc: ' + emp.bankAccount, 46, 704, 'F1', 8.4, 0.25, 0.31, 0.4);
  c.text('KWSP No: ' + emp.kwspMemberNo + ' | TIN: ' + emp.taxTin, 360, 704, 'F1', 8.2, 0.25, 0.31, 0.4);

  // Two-Column Earnings & Deductions Table
  const topY = 676;
  c.rectFill(36, topY - 4, 256, 18, 0.09, 0.2, 0.36);
  c.text('PENDAPATAN / EARNINGS (MYR)', 44, topY + 1, 'F2', 8.5, 1, 1, 1);

  c.rectFill(303.28, topY - 4, 256, 18, 0.09, 0.2, 0.36);
  c.text('POTONGAN / DEDUCTIONS (MYR)', 311.28, topY + 1, 'F2', 8.5, 1, 1, 1);

  const earnings = [
    ['Basic Salary / Gaji Pokok', emp.basic],
    ['Overtime / Kerja Lebih Masa', emp.overtime],
    ['Fixed & Transport Allowances / Elaun', emp.allowances],
    ['Bonus / Commission / Komisen', emp.bonus],
    ['Tax-Exempt Reimbursements', emp.eaExempt / Math.max(1, emp.monthsWorked)],
  ];
  const deductions = [
    ['KWSP / EPF Employee' + (emp.isForeign ? ' (2%)' : ''), emp.epfEe],
    ['PERKESO / SOCSO Employee', emp.socsoEe],
    ['EIS / SIP Employee', emp.eisEe],
    ['LHDN PCB / Monthly Tax Deduction', emp.pcb],
    ['CP38 / Zakat Salary Deduction', emp.cp38 + emp.zakat],
  ];

  let rowY = topY - 22;
  for (let i = 0; i < earnings.length; i++) {
    c.text(earnings[i][0], 44, rowY, 'F1', 8.5);
    c.textRight(fmtMoney(earnings[i][1]), 286, rowY, 'F3', 8.8);
    c.line(36, rowY - 5, 292, rowY - 5);

    c.text(deductions[i][0], 311.28, rowY, 'F1', 8.5);
    c.textRight(fmtMoney(deductions[i][1]), 553, rowY, 'F3', 8.8);
    c.line(303.28, rowY - 5, 559.28, rowY - 5);
    rowY -= 20;
  }

  // Gross & Total Deduction Totals
  c.rectFill(36, rowY - 6, 256, 20, 0.94, 0.96, 0.98);
  c.text('GROSS PAY / GAJI KASAR', 44, rowY, 'F2', 8.8);
  c.textRight(fmtMoney(emp.monthlyGross), 286, rowY, 'F3', 9.2);

  c.rectFill(303.28, rowY - 6, 256, 20, 0.99, 0.95, 0.95);
  c.text('TOTAL DEDUCTIONS', 311.28, rowY, 'F2', 8.8, 0.65, 0.12, 0.12);
  c.textRight(fmtMoney(emp.totalDeductions), 553, rowY, 'F3', 9.2, 0.65, 0.12, 0.12);

  // Net Pay Highlight Banner
  rowY -= 44;
  c.rectFill(36, rowY, 523.28, 32, 0.92, 0.99, 0.95);
  c.rectStroke(36, rowY, 523.28, 32, 0.04, 0.59, 0.41, 1);
  c.text('NET PAY CREDITED / GAJI BERSIH DIBAYAR (MYR)', 48, rowY + 11, 'F2', 10.5, 0.02, 0.38, 0.27);
  c.textRight('RM ' + fmtMoney(emp.netPay), 548, rowY + 10, 'F3', 12.5, 0.02, 0.38, 0.27);

  // Employer Statutory Contribution Disclosure Box
  rowY -= 58;
  c.rectFill(36, rowY, 523.28, 44, 0.97, 0.98, 0.99);
  c.rectStroke(36, rowY, 523.28, 44, 0.82, 0.85, 0.9);
  c.text('EMPLOYER STATUTORY CONTRIBUTIONS (CARUMAN MAJIKAN — PAID ON YOUR BEHALF)', 46, rowY + 28, 'F2', 8.2, 0.2, 0.27, 0.36);
  c.text(
    'Employer KWSP (EPF): RM ' + fmtMoney(emp.epfEr) + '    |    Employer PERKESO (SOCSO): RM ' + fmtMoney(emp.socsoEr) + '    |    Employer EIS (SIP): RM ' + fmtMoney(emp.eisEr),
    46,
    rowY + 12,
    'F3',
    8.4
  );

  c.text(
    'Issued electronically under Section 61 Employment Act 1955 by ' + employer.companyName + '. Confidential employee record.',
    36,
    rowY - 18,
    'F1',
    7.6,
    0.42,
    0.47,
    0.55
  );

  if (watermark) c.drawWatermarkFooter();
  return c.toStreamString();
}

export function generateBorangEaPdfBytes(employees, employer, { watermark = true } = {}) {
  const pages = employees.map((emp) => renderBorangEaPage(emp, employer, watermark));
  return compilePdfDocument(pages, watermark);
}

export function generatePayslipPdfBytes(employees, employer, { watermark = true } = {}) {
  const pages = employees.map((emp) => renderPayslipPage(emp, employer, watermark));
  return compilePdfDocument(pages, watermark);
}
/* ============================================================================
 * ZERO-DEPENDENCY POSIX .ZIP ARCHIVE COMPILER (STORE + IEEE 802.3 CRC32)
 * ============================================================================ */

const CRC32_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tbl[i] = c >>> 0;
  }
  return tbl;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Bundles [{ name: 'EA_EMP001.pdf', data: Uint8Array }, ...] into a valid .zip Uint8Array.
 */
export function createZipArchiveBytes(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const safeName = String(entry.name || 'document.pdf').replace(/[^a-zA-Z0-9._\-/]/g, '_');
    const nameBytes = encoder.encode(safeName);
    const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data || ''));
    const sum = crc32(data);

    // Local file header (30 bytes + filename)
    const lfh = new Uint8Array(30 + nameBytes.length);
    const lfv = new DataView(lfh.buffer);
    lfv.setUint32(0, 0x04034b50, true);
    lfv.setUint16(4, 20, true); // version needed 2.0
    lfv.setUint16(6, 0, true); // flags
    lfv.setUint16(8, 0, true); // compression 0 = STORE
    lfv.setUint16(10, 0x4800, true); // DOS time 09:00:00
    lfv.setUint16(12, 0x5d6f, true); // DOS date
    lfv.setUint32(14, sum, true);
    lfv.setUint32(18, data.length, true);
    lfv.setUint32(22, data.length, true);
    lfv.setUint16(26, nameBytes.length, true);
    lfv.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);

    // Central directory header (46 bytes + filename)
    const cdh = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cdh.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0x4800, true);
    cdv.setUint16(14, 0x5d6f, true);
    cdv.setUint32(16, sum, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, localOffset, true);
    cdh.set(nameBytes, 46);

    localParts.push(lfh, data);
    centralParts.push(cdh);
    localOffset += lfh.length + data.length;
  }

  let centralSize = 0;
  for (const c of centralParts) centralSize += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, localOffset, true);
  ev.setUint16(20, 0, true);

  const totalBytes = localOffset + centralSize + eocd.length;
  const archive = new Uint8Array(totalBytes);
  let ptr = 0;
  for (const p of localParts) {
    archive.set(p, ptr);
    ptr += p.length;
  }
  for (const p of centralParts) {
    archive.set(p, ptr);
    ptr += p.length;
  }
  archive.set(eocd, ptr);
  return archive;
}

/* ============================================================================
 * BROWSER STUDIO CONTROLLER (ATTACHES ONLY IN BROWSER DOM)
 * ============================================================================ */

if (typeof document !== 'undefined') {
  let activeDocMode = 'EA'; // 'EA' | 'PAYSLIP'
  let currentBatch = null;
  let activeCheckoutProduct = 'MYPAYROL';
  let activePaymentRail = 'CARD';
  let activeOrderId = null;
  let pollTimer = null;
  let isUnlocked = Boolean(localStorage.getItem('zyk_mypayroll_key'));

  const $ = (id) => document.getElementById(id);

  function refreshUnlockUi() {
    const saved = localStorage.getItem('zyk_mypayroll_key');
    isUnlocked = Boolean(saved);
    const pill = $('licenseStatusBadge');
    const txt = $('licenseBadgeText');
    if (saved) {
      pill.classList.add('unlocked');
      txt.textContent = 'Pro Unlocked (No Watermark · Bulk ZIP) · ' + saved.slice(0, 13) + '…';
    } else {
      pill.classList.remove('unlocked');
      txt.textContent = 'Free Mode (3 PDFs w/ Footer) · Unlock Pro RM 39';
    }
    if (currentBatch) updateExportBanner();
  }

  function updateExportBanner() {
    if (!currentBatch) return;
    const n = currentBatch.employees.length;
    $('exportStatusHeadline').textContent = isUnlocked
      ? 'Pro Active: Ready to export all ' + n + ' clean white-label PDFs (Zero watermark · 1-Click ZIP).'
      : 'Free Tier: Download up to ' + Math.min(n, FREE_ROW_LIMIT) + ' printable PDFs with Hyperfetch footer, or unlock Pro (RM 39 once) to remove watermark & bulk-export all ' + n + ' staff.';
    $('btnFree3Zip').style.display = !isUnlocked ? 'inline-flex' : 'none';
  }

  function renderLedgerTable() {
    const tbody = $('previewTableBody');
    tbody.replaceChildren();
    if (!currentBatch || !currentBatch.employees.length) return;

    currentBatch.employees.forEach((emp, idx) => {
      const tr = document.createElement('tr');
      const cells = [
        String(emp.rowIndex).padStart(2, '0'),
        emp.name + ' (' + emp.staffId + ')',
        emp.idDisplay,
        fmtMoney(emp.monthlyGross),
        fmtMoney(emp.epfEe) + ' / ' + fmtMoney(emp.socsoEe + emp.eisEe),
        fmtMoney(emp.netPay),
        fmtMoney(emp.eaTotalTaxable),
      ];
      cells.forEach((val, cIdx) => {
        const td = document.createElement('td');
        if (cIdx >= 3) td.className = 'num mono';
        else if (cIdx === 0 || cIdx === 2) td.className = 'mono';
        td.textContent = val;
        tr.appendChild(td);
      });

      const actionTd = document.createElement('td');
      const canDownloadFree = isUnlocked || idx < FREE_ROW_LIMIT;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = canDownloadFree ? 'btn btn-outline btn-xs' : 'btn btn-navy btn-xs';
      btn.textContent = canDownloadFree
        ? activeDocMode === 'EA'
          ? isUnlocked ? 'EA PDF' : 'Free EA PDF'
          : isUnlocked ? 'Payslip PDF' : 'Free Payslip'
        : 'Unlock Pro';
      btn.addEventListener('click', () => {
        if (!canDownloadFree) {
          openUnlockDrawer('MYPAYROL');
          return;
        }
        downloadSinglePdf(emp);
      });
      actionTd.appendChild(btn);
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
  }

  function runBatchCompile() {
    const raw = $('rawCsvBox').value;
    if (raw.length > MAX_CSV_BYTES) {
      $('loadedFileLabel').textContent = 'CSV exceeds 10 MB safety limit.';
      return;
    }
    const parsed = parseFlexibleDelimited(raw);
    if (!parsed.rows.length) return;

    currentBatch = normalizeEaAndPayslipRows(parsed.rows, {
      companyName: $('empCompany').value,
      ssmNo: $('empSsm').value,
      employerENo: $('empLhdn').value,
      kwspNo: $('empKwsp').value,
      perkesoCode: $('empPerkeso').value,
      salaryMonth: $('empMonth').value,
      taxYear: $('empYear').value,
      signatoryName: $('empSignatory').value,
    });

    $('resultsPanel').style.display = 'block';
    const d = currentBatch.diagnostics;
    $('totalsSummary').textContent =
      'Staff: ' + d.totalStaff + ' · Monthly Net: RM ' + fmtMoney(d.totals.netPay) + ' · Annual EA Taxable: RM ' + fmtMoney(d.totals.eaTaxableTotal);

    const metrics = [
      ['Staff Loaded', 'Ready for PDF build', String(d.totalStaff)],
      ['MyKad Repaired', 'Leading 0s & hyphens', String(d.myKadRepairs)],
      ['Statutory Auto-Calc', 'KWSP + SOCSO + EIS', String(d.autoCalcCount)],
      ['Active Template', activeDocMode === 'EA' ? 'LHDN Borang C.P.8A' : 'Act 1955 s.61 Payslip', activeDocMode],
    ];
    const statsWrap = $('diagStats');
    statsWrap.replaceChildren();
    for (const [lbl, sub, val] of metrics) {
      const cell = document.createElement('div');
      cell.className = 'metric-cell';
      const vEl = document.createElement('div');
      vEl.className = 'metric-val fix';
      vEl.textContent = val;
      const lEl = document.createElement('div');
      lEl.className = 'metric-lbl';
      lEl.textContent = lbl;
      const sEl = document.createElement('div');
      sEl.className = 'metric-sub';
      sEl.textContent = sub;
      cell.append(vEl, lEl, sEl);
      statsWrap.appendChild(cell);
    }

    renderLedgerTable();
    updateExportBanner();
  }

  function triggerBytesDownload(filename, bytes, mime) {
    const blob = new Blob([bytes], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  async function verifyStoredProKeyLive() {
    const key = (localStorage.getItem('zyk_mypayroll_key') || '').trim().toUpperCase();
    if (!key) return false;
    try {
      const qs = new URLSearchParams({ action: 'verifyKey', key, product: 'MYPAYROL' });
      const res = await fetch(CLOUD_AUTOPAY_EXEC_URL + '?' + qs.toString());
      const data = await res.json();
      if (!data?.valid) {
        localStorage.removeItem('zyk_mypayroll_key');
        refreshUnlockUi();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async function downloadSinglePdf(emp) {
    let proOk = false;
    if (isUnlocked) proOk = await verifyStoredProKeyLive();
    const watermark = !proOk;
    const safeSlug = emp.name.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 28);
    const bytes =
      activeDocMode === 'EA'
        ? generateBorangEaPdfBytes([emp], currentBatch.employer, { watermark })
        : generatePayslipPdfBytes([emp], currentBatch.employer, { watermark });
    const fname =
      activeDocMode === 'EA'
        ? 'Borang_EA_' + currentBatch.employer.taxYear + '_' + emp.staffId + '_' + safeSlug + '.pdf'
        : 'Payslip_' + currentBatch.employer.salaryMonth + '_' + emp.staffId + '_' + safeSlug + '.pdf';
    triggerBytesDownload(fname, bytes, 'application/pdf');
  }

  async function exportBulkZip(sampleFreeOnly = false) {
    if (!currentBatch || !currentBatch.employees.length) return;
    let proOk = false;
    if (!sampleFreeOnly) {
      if (!isUnlocked) {
        openUnlockDrawer('MYPAYROL');
        return;
      }
      $('exportStatusHeadline').textContent = 'Verifying Pro license key...';
      proOk = await verifyStoredProKeyLive();
      if (!proOk) {
        openUnlockDrawer('MYPAYROL');
        return;
      }
    }

    const watermark = !proOk;
    const list = sampleFreeOnly ? currentBatch.employees.slice(0, FREE_ROW_LIMIT) : currentBatch.employees;
    const files = list.map((emp) => {
      const safeSlug = emp.name.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 28);
      const pdf =
        activeDocMode === 'EA'
          ? generateBorangEaPdfBytes([emp], currentBatch.employer, { watermark })
          : generatePayslipPdfBytes([emp], currentBatch.employer, { watermark });
      const name =
        activeDocMode === 'EA'
          ? 'Borang_EA_' + currentBatch.employer.taxYear + '_' + emp.staffId + '_' + safeSlug + '.pdf'
          : 'Payslip_' + currentBatch.employer.salaryMonth + '_' + emp.staffId + '_' + safeSlug + '.pdf';
      return { name, data: pdf };
    });

    const combinedPdf =
      activeDocMode === 'EA'
        ? generateBorangEaPdfBytes(list, currentBatch.employer, { watermark })
        : generatePayslipPdfBytes(list, currentBatch.employer, { watermark });
    files.push({
      name: '00_ALL_COMBINED_' + activeDocMode + '_' + list.length + '_STAFF.pdf',
      data: combinedPdf,
    });

    const zipBytes = createZipArchiveBytes(files);
    const prefix = sampleFreeOnly ? 'FREE_SAMPLE3_' : '';
    const zipName = prefix + (activeDocMode === 'EA' ? 'Borang_EA_' + currentBatch.employer.taxYear : 'Payslips_' + currentBatch.employer.salaryMonth) + '_' + (files.length - 1) + '_Staff.zip';
    updateExportBanner();
    triggerBytesDownload(zipName, zipBytes, 'application/zip');
  }

  function loadDemoDataset() {
    const demo = [
      'Staff ID,Name,Position,NRIC,Passport,Country,KWSP No,Tax TIN,Basic Salary,Overtime,Allowances,Bonus,PCB,Zakat,Months Worked,Bank,Bank Account',
      'EMP001,Ahmad Faiz bin Razak,Operations Manager,940812-14-5521,,MY,18442910,IG1049281720,5200.00,0.00,400.00,5200.00,185.00,50.00,12,Maybank,162106882910',
      'EMP002,Nurul Izzah binti Halim,Accounts Executive,020415145822,,MY,07291820,IG2910481100,3400.00,180.00,200.00,1700.00,35.00,0.00,12,CIMB,7048291029',
      'EMP003,Tan Wei Ming,Senior Software Engineer,880322-10-5119,,MY,15928371,IG2039182710,7800.00,0.00,500.00,7800.00,510.50,0.00,12,Public Bank,3192837465',
      'EMP004,Md Jahangir Alam,Warehouse Supervisor,,A09482711,BD,22910482,,2200.00,310.00,150.00,0.00,0.00,0.00,12,Maybank,114082910382',
      'EMP005,Lim Siew Lan,Admin Coordinator,630510-08-4220,,MY,08192834,SG0492817200,3600.00,0.00,200.00,1800.00,0.00,0.00,12,Hong Leong,02910482910',
    ].join('\n');
    $('loadedFileLabel').textContent = '5-Employee Demo Loaded (Click any row to download a real Borang EA or Payslip PDF!)';
    $('rawCsvBox').value = demo;
    runBatchCompile();
  }

  function selectTier(tier) {
    activeCheckoutProduct = tier === 'MYBUND' ? 'MYBUND' : 'MYPAYROL';
    const isBundle = activeCheckoutProduct === 'MYBUND';
    $('tierBtnSingle').classList.toggle('active', !isBundle);
    $('tierBtnBundle').classList.toggle('active', isBundle);
    $('cardProductLabel').textContent = isBundle
      ? 'Malaysia SME Master Bundle (All 4 Tools)'
      : 'MyPayroll + EA/Payslip + Bank GIRO Pro';
    $('cardPriceLabel').textContent = isBundle
      ? 'USD 14.99 (~RM 55 One-Time · Unlocks Everything)'
      : 'USD 9.99 (~RM 39 One-Time)';
    $('polarCardBuyLink').href = isBundle ? POLAR_CHECKOUT_LINKS.MYBUND : POLAR_CHECKOUT_LINKS.MYPAYROL;
    if (activePaymentRail === 'WISE') startAutoOrder();
  }

  function selectPaymentRail(rail) {
    activePaymentRail = rail === 'WISE' ? 'WISE' : 'CARD';
    $('railBtnCard').classList.toggle('active', activePaymentRail === 'CARD');
    $('railBtnWise').classList.toggle('active', activePaymentRail === 'WISE');
    $('cardPaySection').style.display = activePaymentRail === 'CARD' ? 'block' : 'none';
    $('wisePaySection').style.display = activePaymentRail === 'WISE' ? 'block' : 'none';
    if (activePaymentRail === 'WISE') startAutoOrder();
    else if (pollTimer) clearInterval(pollTimer);
  }

  function openUnlockDrawer(product = 'MYPAYROL') {
    $('unlockDrawer').classList.add('open');
    selectTier(product);
    selectPaymentRail('CARD');
  }

  function closeUnlockDrawer() {
    $('unlockDrawer').classList.remove('open');
    if (pollTimer) clearInterval(pollTimer);
  }

  async function activateManualKey() {
    const key = $('licenseInput').value.trim().toUpperCase();
    const msg = $('keyMsg');
    if (!key) {
      msg.textContent = 'Paste your ZYK license key first.';
      return;
    }
    msg.textContent = 'Verifying cryptographic signature...';
    try {
      const qs = new URLSearchParams({ action: 'verifyKey', key, product: 'MYPAYROL' });
      const data = await (await fetch(CLOUD_AUTOPAY_EXEC_URL + '?' + qs.toString())).json();
      if (data?.valid) {
        localStorage.setItem('zyk_mypayroll_key', key);
        refreshUnlockUi();
        renderLedgerTable();
        msg.textContent = 'Pro Activated! Watermark removed & unlimited Bulk ZIP unlocked.';
        setTimeout(closeUnlockDrawer, 1100);
      } else {
        msg.textContent = 'Invalid key. Accepts MyPayroll (MYPAYR) or Master Bundle (MYBUND) keys.';
      }
    } catch {
      msg.textContent = 'Verification server unreachable — please retry.';
    }
  }

  async function startAutoOrder() {
    const baseAmount = activeCheckoutProduct === 'MYBUND' ? 55 : 39;
    const buyerEmail = $('buyerEmailInput').value.trim();
    $('orderPollStatus').textContent = 'Generating unique sen amount...';
    if (pollTimer) clearInterval(pollTimer);
    try {
      const qs = new URLSearchParams({
        action: 'createOrder',
        productCode: activeCheckoutProduct,
        currency: 'MYR',
        baseAmount: String(baseAmount),
        buyerEmail,
      });
      const data = await (await fetch(CLOUD_AUTOPAY_EXEC_URL + '?' + qs.toString())).json();
      if (!data?.ok || !data.order) throw new Error('Order error');
      activeOrderId = data.order.orderId;
      $('exactPayAmount').textContent = data.order.currency + ' ' + data.order.exactAmountFormatted;
      $('exactPayAmount').setAttribute('data-raw', data.order.exactAmountFormatted);
      $('exactOrderRef').textContent = data.order.orderId;
      $('orderPollStatus').textContent = 'Waiting for Wise transfer (24/7 Cloud AutoPay)...';

      pollTimer = setInterval(async () => {
        try {
          const stQs = new URLSearchParams({ action: 'orderStatus', orderId: activeOrderId });
          const st = await (await fetch(CLOUD_AUTOPAY_EXEC_URL + '?' + stQs.toString())).json();
          if (st.status === 'PAID' && st.licenseKey) {
            clearInterval(pollTimer);
            $('licenseInput').value = st.licenseKey;
            await activateManualKey();
          }
        } catch {}
      }, 4500);
    } catch {
      $('orderPollStatus').textContent = 'Include your email in Wise reference for instant delivery.';
    }
  }

  // Bind DOM listeners cleanly (zero inline JS)
  refreshUnlockUi();
  $('licenseStatusBadge').addEventListener('click', () => openUnlockDrawer('MYPAYROL'));
  $('btnSelectCsv').addEventListener('click', () => $('csvFileInput').click());
  $('btnLoadDemo').addEventListener('click', loadDemoDataset);
  $('btnToggleRaw').addEventListener('click', () => $('rawEditorDrawer').classList.toggle('open'));
  $('btnRecalc').addEventListener('click', runBatchCompile);

  $('modeBtnEa').addEventListener('click', () => {
    activeDocMode = 'EA';
    $('modeBtnEa').classList.add('active');
    $('modeBtnPayslip').classList.remove('active');
    if (currentBatch) runBatchCompile();
  });
  $('modeBtnPayslip').addEventListener('click', () => {
    activeDocMode = 'PAYSLIP';
    $('modeBtnPayslip').classList.add('active');
    $('modeBtnEa').classList.remove('active');
    if (currentBatch) runBatchCompile();
  });

  $('csvFileInput').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_CSV_BYTES) {
      $('loadedFileLabel').textContent = 'Rejected: Maximum CSV size is 10 MB.';
      return;
    }
    $('loadedFileLabel').textContent = 'Loaded: ' + f.name + ' (' + (f.size / 1024).toFixed(1) + ' KB)';
    $('rawCsvBox').value = await f.text();
    runBatchCompile();
  });

  const dropSurface = $('dropSurface');
  dropSurface.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropSurface.classList.add('dragover');
  });
  dropSurface.addEventListener('dragleave', () => dropSurface.classList.remove('dragover'));
  dropSurface.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropSurface.classList.remove('dragover');
    const f = e.dataTransfer?.files?.[0];
    if (!f || f.size > MAX_CSV_BYTES) return;
    $('loadedFileLabel').textContent = 'Loaded: ' + f.name;
    $('rawCsvBox').value = await f.text();
    runBatchCompile();
  });

  ['empCompany', 'empSsm', 'empLhdn', 'empKwsp', 'empPerkeso', 'empMonth', 'empYear', 'empSignatory'].forEach((id) => {
    $(id).addEventListener('change', () => {
      if ($('rawCsvBox').value.trim()) runBatchCompile();
    });
  });

  $('btnFree3Zip').addEventListener('click', () => exportBulkZip(true));
  $('btnProBulkZip').addEventListener('click', () => exportBulkZip(false));
  $('btnCloseDrawer').addEventListener('click', closeUnlockDrawer);
  $('unlockDrawer').addEventListener('click', (e) => {
    if (e.target === $('unlockDrawer')) closeUnlockDrawer();
  });
  $('tierBtnSingle').addEventListener('click', () => selectTier('MYPAYROL'));
  $('tierBtnBundle').addEventListener('click', () => selectTier('MYBUND'));
  $('railBtnCard').addEventListener('click', () => selectPaymentRail('CARD'));
  $('railBtnWise').addEventListener('click', () => selectPaymentRail('WISE'));
  $('buyerEmailInput').addEventListener('change', startAutoOrder);
  $('btnActivateKey').addEventListener('click', activateManualKey);
  $('btnCopyWiseEmail').addEventListener('click', () => navigator.clipboard.writeText('jycheah7@gmail.com'));
  $('btnCopyWiseAmt').addEventListener('click', () =>
    navigator.clipboard.writeText($('exactPayAmount').getAttribute('data-raw') || '39.01')
  );

  // Auto-load demo when ?demo=1 or first visit convenience
  const params = new URLSearchParams(window.location.search);
  if (params.get('unlock') === '1' || params.get('ref') === 'pdf_watermark') {
    loadDemoDataset();
  }
}
