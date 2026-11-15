/**
 * Hyperfetch Malaysia Statutory & Banking Suite — Maybank2u Biz / Maybank2e / CIMB BizChannel Bulk GIRO & DuitNow Compiler
 * 100% Stateless Browser-RAM Compiler. Zero external dependencies. Strict CSP ('self') compatible.
 */

export const CLOUD_AUTOPAY_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbyxApiw79oG_JHvooqtsc3ctxSwqXuzPqVUM64T2Ifj9aYK2kxRVwq-ABUgO0cOBK6y/exec';

export const POLAR_CHECKOUT_LINKS = {
  MYPAYROL: 'https://buy.polar.sh/polar_cl_YlpL3oaZd36nGEWPvJbSyGZ143JKFgFh5z9Q81nmmTJ',
  MYBUND: 'https://buy.polar.sh/polar_cl_x8tG4fFh0TgXrv1hcu4bulphbGHeBEQbDTSbo4Kp04t',
};

const MAX_CSV_BYTES = 10 * 1024 * 1024;
const MAX_BATCH_ROWS = 5000;
const FREE_ROW_LIMIT = 3;

export const BNM_BANK_DIRECTORY = [
  { rx: /maybank|malayan\s*banking|^mbb$/i, bic: 'MBBEMYKL', code: '27', label: 'Maybank' },
  { rx: /cimb/i, bic: 'CIBBMYKL', code: '35', label: 'CIMB Bank' },
  { rx: /public\s*bank|^pbb$/i, bic: 'PBBEMYKL', code: '33', label: 'Public Bank' },
  { rx: /^rhb|rhb\s*bank/i, bic: 'RHBBMYKL', code: '18', label: 'RHB Bank' },
  { rx: /hong\s*leong|^hlb/i, bic: 'HLBBMYKL', code: '24', label: 'Hong Leong Bank' },
  { rx: /am\s*bank|ambank/i, bic: 'ARBKMYKL', code: '08', label: 'AmBank' },
  { rx: /bank\s*islam|^bimb/i, bic: 'BIMBMYKL', code: '45', label: 'Bank Islam' },
  { rx: /bank\s*rakyat|kerjasama\s*rakyat/i, bic: 'BKRMMYKL', code: '02', label: 'Bank Rakyat' },
  { rx: /^bsn|simpanan\s*nasional/i, bic: 'BSNAMYK1', code: '10', label: 'BSN' },
  { rx: /muamalat/i, bic: 'BMMBMYKL', code: '41', label: 'Bank Muamalat' },
  { rx: /affin/i, bic: 'PHBMMYKL', code: '32', label: 'Affin Bank' },
  { rx: /alliance/i, bic: 'MFBBMYKL', code: '12', label: 'Alliance Bank' },
  { rx: /agro\s*bank|agrobank/i, bic: 'AGOBMYKL', code: '49', label: 'Agrobank' },
  { rx: /mbsb/i, bic: 'AFBQMYKL', code: '50', label: 'MBSB Bank' },
  { rx: /^uob|united\s*overseas/i, bic: 'UOVBMYKL', code: '26', label: 'UOB Malaysia' },
  { rx: /ocbc/i, bic: 'OCBCMYKL', code: '29', label: 'OCBC Malaysia' },
  { rx: /hsbc/i, bic: 'HBMBMYKL', code: '22', label: 'HSBC Malaysia' },
  { rx: /standard\s*chartered|^scb/i, bic: 'SCBLMYKX', code: '14', label: 'Standard Chartered' },
  { rx: /citi\s*bank|citibank/i, bic: 'CITIMYKL', code: '17', label: 'Citibank Malaysia' },
  { rx: /al[\s\-]*rajhi/i, bic: 'RJHIMYKL', code: '53', label: 'Al Rajhi Bank' },
  { rx: /kuwait\s*finance|^kfh/i, bic: 'KFHOMYKL', code: '47', label: 'Kuwait Finance House' },
  { rx: /gx\s*bank|gxbank/i, bic: 'GXSPMYKL', code: '88', label: 'GXBank' },
  { rx: /aeon\s*bank/i, bic: 'AEONMYKL', code: '89', label: 'AEON Bank' },
  { rx: /boost\s*bank/i, bic: 'BOSTMYKL', code: '90', label: 'Boost Bank' },
  { rx: /tng|touch\s*n\s*go/i, bic: 'TNGDMYNB', code: '91', label: 'TNG Digital' },
];

export function parseBankSheet(rawText) {
  const cleaned = String(rawText || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleaned.trim()) return { delimiter: ',', headers: [], rows: [] };

  const firstLine = cleaned.split('\n').find((l) => l.trim().length > 0) || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;

  let delimiter = ',';
  if (tabs > commas && tabs >= semis) delimiter = '\t';
  else if (semis > commas) delimiter = ';';

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

  const headers = matrix[0].map((h, idx) => h || 'Col_' + (idx + 1));
  const rows = matrix.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    return obj;
  });
  return { delimiter, headers, rows };
}

function sanitizeBankField(val, maxLen = 40, alphanumericStrict = false) {
  let s = String(val ?? '').replace(/[\r\n\t|]+/g, ' ').trim();
  // Prevent CWE-1236 spreadsheet formula injection & strip portal-breaking chars
  s = s.replace(/^[=+\-@]+/, '');
  if (alphanumericStrict) {
    s = s.replace(/[^a-zA-Z0-9 .\-]/g, '');
  } else {
    s = s.replace(/[^\x20-\x7E]/g, '').replace(/[,;"'|]/g, ' ');
  }
  return s.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function pickField(row, patterns) {
  const keys = Object.keys(row);
  for (const pat of patterns) {
    const k = keys.find((key) => pat.test(key.trim()));
    if (k !== undefined && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return '';
}

export function resolveMalaysianBankBic(rawBank) {
  const clean = String(rawBank || '').trim();
  const upper = clean.toUpperCase().replace(/\s+/g, '');
  const exactBic = BNM_BANK_DIRECTORY.find((b) => b.bic === upper);
  if (exactBic) return { ...exactBic, wasMapped: false };

  for (const entry of BNM_BANK_DIRECTORY) {
    if (entry.rx.test(clean)) {
      return { ...entry, wasMapped: true };
    }
  }
  if (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(upper)) {
    return { bic: upper.slice(0, 8), code: '99', label: upper.slice(0, 8), wasMapped: false };
  }
  return { bic: 'MBBEMYKL', code: '27', label: clean || 'Maybank (Default)', wasMapped: true };
}

function normalizeBeneficiaryId(rawId, rawType) {
  const cleanRaw = String(rawId || '').trim();
  const digitsOnly = cleanRaw.replace(/\D/g, '');
  const explicitType = String(rawType || '').toUpperCase();

  let repaired = false;
  if (/BRN|SSM|COMP|ROC/i.test(explicitType) || (digitsOnly.length === 12 && /^20\d{2}0[1-6]/.test(digitsOnly))) {
    return { idType: 'BRN', idValue: digitsOnly || sanitizeBankField(cleanRaw, 20, true), repaired };
  }
  if (!digitsOnly && cleanRaw) {
    return {
      idType: 'PASSPORT',
      idValue: cleanRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20),
      repaired: cleanRaw !== cleanRaw.replace(/[^a-zA-Z0-9]/g, ''),
    };
  }
  let nric = digitsOnly;
  if (nric.length === 11) {
    nric = '0' + nric;
    repaired = true;
  } else if (nric.length === 10) {
    nric = '00' + nric;
    repaired = true;
  } else if (cleanRaw.includes('-') && nric.length === 12) {
    repaired = true;
  }
  return {
    idType: nric.length === 12 ? 'NRIC' : 'PASSPORT',
    idValue: nric || '000000000000',
    repaired,
  };
}

export function compileMalaysianGiroBatch(rawRows, payerConfig = {}, sourceDelimiter = ',') {
  const valueDateRaw = String(payerConfig.valueDate || '2026-11-25').replace(/[^0-9]/g, '');
  const yyyymmdd = valueDateRaw.length === 8 ? valueDateRaw : '20261125';
  const ddmmyyyy = yyyymmdd.slice(6, 8) + yyyymmdd.slice(4, 6) + yyyymmdd.slice(0, 4);

  const payer = {
    companyName: sanitizeBankField(payerConfig.companyName || 'HYPERFETCH DEMO SDN BHD', 40, true),
    debitAccount: String(payerConfig.debitAccount || '514011223344').replace(/\D/g, '').slice(0, 20) || '514011223344',
    companyBrn: String(payerConfig.companyBrn || '202401012345').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20),
    batchRef: sanitizeBankField(payerConfig.batchRef || 'SAL202611', 16, true).replace(/\s+/g, '') || 'SAL202611',
    paymentMode: payerConfig.paymentMode === 'SUPPLIER' ? 'SUPPLIER' : 'SALARY',
    yyyymmdd,
    ddmmyyyy,
  };

  let accountCleanups = 0;
  let bicMappings = 0;
  let idRepairs = 0;
  const semicolonRepaired = sourceDelimiter === ';';

  const items = [];
  rawRows.slice(0, MAX_BATCH_ROWS).forEach((row, idx) => {
    const rawAmt = pickField(row, [/^net\s*pay$/i, /^amount$/i, /^payment(\s*amount)?$/i, /^wages?$/i, /^salary$/i, /^jumlah$/i]);
    const amtNum = Number(String(rawAmt || '0').replace(/[^0-9.\-]/g, ''));
    if (!Number.isFinite(amtNum) || amtNum <= 0) return;
    const amount = Number(amtNum.toFixed(2));

    const beneName = sanitizeBankField(
      pickField(row, [/^(beneficiary\s*|employee\s*|payee\s*|vendor\s*)?name$/i, /^nama$/i]) || ('Payee ' + (idx + 1)),
      40,
      true
    );

    const rawAcc = pickField(row, [/^(bene(ficiary)?\s*)?(bank\s*)?acc(ount)?(\s*no)?$/i, /^no\s*akaun$/i]);
    const cleanAcc = String(rawAcc || '').replace(/\D/g, '').slice(0, 22);
    if (rawAcc && rawAcc.trim() !== cleanAcc) accountCleanups++;

    const rawBank = pickField(row, [/^bank(\s*name|\s*code|\s*bic)?$/i, /^swift$/i]);
    const bankInfo = resolveMalaysianBankBic(rawBank);
    if (bankInfo.wasMapped) bicMappings++;

    const rawId = pickField(row, [/^nric$/i, /^ic(\s*no)?$/i, /^id(\s*no)?$/i, /^passport$/i, /^brn$/i, /^ssm$/i]);
    const rawIdType = pickField(row, [/^id\s*type$/i]);
    const idNorm = normalizeBeneficiaryId(rawId, rawIdType);
    if (idNorm.repaired) idRepairs++;

    const rawRef =
      pickField(row, [/^(payment\s*|recipient\s*)?ref(erence)?$/i, /^description$/i, /^invoice(\s*no)?$/i]) ||
      (payer.paymentMode === 'SALARY' ? ('SALARY ' + payer.batchRef) : ('INV ' + (idx + 1)));
    const paymentRef = sanitizeBankField(rawRef, 20, true);

    const emailRaw = pickField(row, [/^email$/i, /^notify\s*email$/i]);
    const email = /^[^\s@|,;"']+@[^\s@|,;"']+\.[^\s@|,;"']+$/.test(emailRaw) ? emailRaw.slice(0, 60) : '';

    items.push({
      rowIndex: items.length + 1,
      beneName,
      accountNo: cleanAcc || '0000000000',
      bankLabel: bankInfo.label,
      bankBic: bankInfo.bic,
      idType: idNorm.idType,
      idValue: idNorm.idValue,
      amount,
      paymentRef,
      email,
    });
  });

  const totalAmount = Number(items.reduce((s, r) => s + r.amount, 0).toFixed(2));

  return {
    payer,
    items,
    diagnostics: {
      count: items.length,
      totalAmount,
      semicolonRepaired,
      accountCleanups,
      bicMappings,
      idRepairs,
    },
  };
}

function csvCell(val) {
  let s = String(val ?? '').replace(/^[=+\-@|]+/, '');
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * Generates exact Maybank2u Biz / Maybank2e Pipe / CIMB BizChannel / DuitNow Audit exports.
 */
export function buildBankPortalPayload(batch, formatKind, sliceLimit = null) {
  const list = sliceLimit ? batch.items.slice(0, sliceLimit) : batch.items;
  const p = batch.payer;
  const subTotal = Number(list.reduce((s, r) => s + r.amount, 0).toFixed(2));

  if (formatKind === 'M2UBIZ_CSV') {
    const header = [
      'Beneficiary Name',
      'Beneficiary Bank BIC',
      'Beneficiary Account No',
      'ID Type',
      'Beneficiary ID No',
      'Payment Amount',
      'Recipient Reference',
      'Other Payment Details',
      'Beneficiary Email',
    ].join(',');
    const lines = list.map((r) =>
      [
        csvCell(r.beneName),
        csvCell(r.bankBic),
        csvCell(r.accountNo),
        csvCell(r.idType),
        csvCell(r.idValue),
        r.amount.toFixed(2),
        csvCell(r.paymentRef),
        csvCell(p.batchRef),
        csvCell(r.email),
      ].join(',')
    );
    return {
      filename: 'Maybank2uBiz_' + p.paymentMode + '_' + p.yyyymmdd + '.csv',
      mime: 'text/csv;charset=utf-8',
      content: [header, ...lines].join('\r\n') + '\r\n',
    };
  }

  if (formatKind === 'M2E_PIPE_TXT') {
    // Maybank2e Regional Cash Management Pipe-Delimited (MY PAY PIPE)
    const hdr = ['H', p.debitAccount, p.companyName, p.ddmmyyyy, p.batchRef, p.paymentMode === 'SALARY' ? 'PAY' : 'IBG'].join('|');
    const details = list.map((r, i) =>
      [
        'D',
        String(i + 1).padStart(5, '0'),
        r.bankBic,
        r.accountNo,
        r.beneName,
        r.amount.toFixed(2),
        r.idType,
        r.idValue,
        r.paymentRef,
        r.email,
      ].join('|')
    );
    const trl = ['T', String(list.length), subTotal.toFixed(2)].join('|');
    return {
      filename: 'Maybank2e_Pipe_' + p.batchRef + '_' + p.yyyymmdd + '.txt',
      mime: 'text/plain;charset=utf-8',
      content: [hdr, ...details, trl].join('\r\n') + '\r\n',
    };
  }

  if (formatKind === 'CIMB_BIZ_TXT') {
    // CIMB BizChannel Bulk GIRO / DuitNow Pipe Format (replaces Windows BizConverter.exe)
    const hdr = ['01', p.companyBrn, p.debitAccount, p.yyyymmdd, p.batchRef, 'MYR'].join('|');
    const details = list.map((r, i) => {
      const txMode = r.bankBic === 'CIBBMYKL' ? 'IFT' : 'GIRO';
      return [
        '02',
        txMode,
        r.bankBic,
        r.accountNo,
        r.beneName,
        r.amount.toFixed(2),
        r.paymentRef,
        r.idType,
        r.idValue,
        r.email,
        String(i + 1).padStart(4, '0'),
      ].join('|');
    });
    const trl = ['03', String(list.length), subTotal.toFixed(2)].join('|');
    return {
      filename: 'CIMB_BizChannel_' + p.batchRef + '_' + p.yyyymmdd + '.txt',
      mime: 'text/plain;charset=utf-8',
      content: [hdr, ...details, trl].join('\r\n') + '\r\n',
    };
  }

  // AUDIT_RECON_CSV (Includes batch control totals + Hyperfetch footer when free)
  const header = ['#', 'Beneficiary Name', 'Bank', 'SWIFT BIC', 'Account No', 'ID Type', 'ID No', 'Amount (MYR)', 'Reference'].join(',');
  const lines = list.map((r) =>
    [
      r.rowIndex,
      csvCell(r.beneName),
      csvCell(r.bankLabel),
      r.bankBic,
      csvCell("'" + r.accountNo),
      r.idType,
      csvCell("'" + r.idValue),
      r.amount.toFixed(2),
      csvCell(r.paymentRef),
    ].join(',')
  );
  lines.push(['TOTAL', list.length + ' Beneficiaries', '', '', '', '', '', subTotal.toFixed(2), csvCell(p.batchRef)].join(','));
  if (sliceLimit) {
    lines.push(['NOTE', 'Compiled via Hyperfetch Malaysia Bank GIRO Studio (hyperfetch-tools.github.io/bank-giro)', '', '', '', '', '', '', ''].join(','));
  }
  return {
    filename: 'DuitNow_Batch_Audit_' + p.batchRef + '_' + p.yyyymmdd + '.csv',
    mime: 'text/csv;charset=utf-8',
    content: [header, ...lines].join('\r\n') + '\r\n',
  };
}
/* ============================================================================
 * BROWSER STUDIO CONTROLLER
 * ============================================================================ */

if (typeof document !== 'undefined') {
  let currentBatch = null;
  let activePreviewFmt = 'M2E_PIPE_TXT';
  let activeCheckoutProduct = 'MYPAYROL';
  let activePaymentRail = 'CARD';
  let activeOrderId = null;
  let pollTimer = null;
  let isUnlocked = Boolean(localStorage.getItem('zyk_mypayroll_key'));

  const $ = (id) => document.getElementById(id);

  function fmtAmt(n) {
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function refreshUnlockUi() {
    const saved = localStorage.getItem('zyk_mypayroll_key');
    isUnlocked = Boolean(saved);
    const pill = $('licenseStatusBadge');
    const txt = $('licenseBadgeText');
    if (saved) {
      pill.classList.add('unlocked');
      txt.textContent = 'Pro Unlocked (Unlimited Batch) · ' + saved.slice(0, 13) + '…';
    } else {
      pill.classList.remove('unlocked');
      txt.textContent = 'Free Test (3 Payees) · Unlock Unlimited RM 39';
    }
    if (currentBatch) refreshFooterBanner();
  }

  function refreshFooterBanner() {
    if (!currentBatch) return;
    const n = currentBatch.items.length;
    $('exportHeadline').textContent = isUnlocked
      ? 'Pro Active: Ready to export all ' + n + ' validated payees (MYR ' + fmtAmt(currentBatch.diagnostics.totalAmount) + ') across Maybank & CIMB.'
      : 'Free Tier exports a 3-payee bank portal test file. Unlock Pro (RM 39 once — also unlocks MyPayroll & Borang EA PDF!) for all ' + n + ' payees.';
    $('btnFreeSample3').style.display = !isUnlocked && n > FREE_ROW_LIMIT ? 'inline-flex' : 'none';
  }

  function runBankAudit() {
    const raw = $('rawCsvBox').value;
    if (raw.length > MAX_CSV_BYTES) return;
    const parsed = parseBankSheet(raw);
    if (!parsed.rows.length) return;

    currentBatch = compileMalaysianGiroBatch(
      parsed.rows,
      {
        companyName: $('payerCompany').value,
        debitAccount: $('payerAccount').value,
        companyBrn: $('payerBrn').value,
        batchRef: $('payerRef').value,
        valueDate: $('payerDate').value,
        paymentMode: $('payerMode').value,
      },
      parsed.delimiter
    );

    $('resultsPanel').style.display = 'block';
    const d = currentBatch.diagnostics;
    $('batchTotalsBadge').textContent = d.count + ' Payees · Batch Control Total: MYR ' + fmtAmt(d.totalAmount);

    const stats = [
      ['Validated Payees', 'Ready for upload', String(d.count)],
      ['BNM SWIFT Mapped', '8-char DuitNow BICs', String(d.bicMappings)],
      ['Acc / MyKad Fixes', 'Hyphens & leading 0s', String(d.accountCleanups + d.idRepairs)],
      ['Delimiter Check', d.semicolonRepaired ? 'Fixed Excel ; -> ,' : 'Standard CSV/TSV', d.semicolonRepaired ? 'FIXED' : 'CLEAN'],
    ];
    const statsWrap = $('diagStats');
    statsWrap.replaceChildren();
    for (const [lbl, sub, val] of stats) {
      const cell = document.createElement('div');
      cell.className = 'metric-cell';
      const vEl = document.createElement('div');
      vEl.className = 'metric-val';
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

    const tbody = $('previewTableBody');
    tbody.replaceChildren();
    currentBatch.items.forEach((r) => {
      const tr = document.createElement('tr');
      const vals = [
        String(r.rowIndex).padStart(2, '0'),
        r.beneName,
        r.bankLabel + ' (' + r.bankBic + ')',
        r.accountNo,
        r.idType + ': ' + r.idValue,
        r.paymentRef,
        fmtAmt(r.amount),
      ];
      vals.forEach((v, idx) => {
        const td = document.createElement('td');
        if (idx === 6) td.className = 'num mono';
        else if (idx === 0 || idx === 3 || idx === 4) td.className = 'mono';
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    const previewPayload = buildBankPortalPayload(currentBatch, activePreviewFmt, 5);
    $('bytePreviewBox').textContent = previewPayload.content;
    refreshFooterBanner();
  }

  async function verifyStoredProKeyLive() {
    const key = (localStorage.getItem('zyk_mypayroll_key') || '').trim().toUpperCase();
    if (!key) return false;
    try {
      const qs = new URLSearchParams({ action: 'verifyKey', key, product: 'MYPAYROL' });
      const data = await (await fetch(CLOUD_AUTOPAY_EXEC_URL + '?' + qs.toString())).json();
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

  async function exportBankFile(formatKind, freeSample = false) {
    if (!currentBatch || !currentBatch.items.length) return;
    if (!freeSample && currentBatch.items.length > FREE_ROW_LIMIT) {
      if (!isUnlocked || !(await verifyStoredProKeyLive())) {
        openUnlockDrawer('MYPAYROL');
        return;
      }
    }
    const slice = freeSample || !isUnlocked ? FREE_ROW_LIMIT : null;
    const out = buildBankPortalPayload(currentBatch, formatKind, slice);
    const blob = new Blob([out.content], { type: out.mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slice && currentBatch.items.length > FREE_ROW_LIMIT ? ('SAMPLE3_' + out.filename) : out.filename;
    a.click();
  }

  function loadBankDemo() {
    // Deliberately uses Malaysian Excel semicolons, hyphens in accounts/MyKad, and human bank names!
    const sample = [
      'Beneficiary Name;Bank Name;Account No;NRIC / BRN;Payment Amount;Reference;Email',
      'Ahmad Faiz bin Razak;Maybank;1621-0688-2910;940812-14-5521;4800.00;OCT SALARY;faiz@example.com',
      'Nurul Izzah binti Halim;CIMB;7048 2910 29;020415145822;3200.00;OCT SALARY;izzah@example.com',
      'Tan Wei Ming;Public Bank;3192-8374-65;880322-10-5119;7200.00;OCT SALARY;',
      'Syarikat Pembekal Pembungkusan Sdn Bhd;Hong Leong Bank;0291-0482-910;202101044821;2450.80;INV-2026-881;accounts@pembekal.my',
      'Siti Sarah binti Omar;GXBank;8810293847;10908106642;2850.00;OCT SALARY;',
    ].join('\n');
    $('loadedFileLabel').textContent = '5-Payee Demo Loaded (Notice semicolon ; CSV + hyphenated Account/NRIC auto-repaired!)';
    $('rawCsvBox').value = sample;
    runBankAudit();
  }

  function selectTier(tier) {
    activeCheckoutProduct = tier === 'MYBUND' ? 'MYBUND' : 'MYPAYROL';
    const isBundle = activeCheckoutProduct === 'MYBUND';
    $('tierBtnSingle').classList.toggle('active', !isBundle);
    $('tierBtnBundle').classList.toggle('active', isBundle);
    $('cardProductLabel').textContent = isBundle
      ? 'Malaysia SME Master Bundle (All 4 Tools)'
      : 'Bank GIRO + MyPayroll + Borang EA PDF Pro';
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
        msg.textContent = 'Pro Activated! Unlimited Maybank & CIMB bulk exports unlocked.';
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
      $('orderPollStatus').textContent = 'Include your email in Wise reference for automatic delivery.';
    }
  }

  // Event bindings
  refreshUnlockUi();
  $('licenseStatusBadge').addEventListener('click', () => openUnlockDrawer('MYPAYROL'));
  $('btnSelectCsv').addEventListener('click', () => $('csvFileInput').click());
  $('btnLoadDemo').addEventListener('click', loadBankDemo);
  $('btnToggleRaw').addEventListener('click', () => $('rawEditorDrawer').classList.toggle('open'));
  $('btnRecalc').addEventListener('click', runBankAudit);

  $('csvFileInput').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f || f.size > MAX_CSV_BYTES) return;
    $('loadedFileLabel').textContent = 'Loaded: ' + f.name + ' (' + (f.size / 1024).toFixed(1) + ' KB)';
    $('rawCsvBox').value = await f.text();
    runBankAudit();
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
    runBankAudit();
  });

  ['payerCompany', 'payerAccount', 'payerBrn', 'payerRef', 'payerDate', 'payerMode'].forEach((id) => {
    $(id).addEventListener('change', () => {
      if ($('rawCsvBox').value.trim()) runBankAudit();
    });
  });

  $('viewTabTable').addEventListener('click', () => {
    $('viewTabTable').classList.add('active');
    $('viewTabBytes').classList.remove('active');
    $('tableWrap').style.display = 'block';
    $('bytePreviewBox').style.display = 'none';
  });
  $('viewTabBytes').addEventListener('click', () => {
    $('viewTabBytes').classList.add('active');
    $('viewTabTable').classList.remove('active');
    $('tableWrap').style.display = 'none';
    $('bytePreviewBox').style.display = 'block';
  });

  $('previewFmtSelect').addEventListener('change', (e) => {
    activePreviewFmt = e.target.value;
    if (currentBatch) {
      $('bytePreviewBox').textContent = buildBankPortalPayload(currentBatch, activePreviewFmt, 5).content;
    }
  });

  $('btnFreeSample3').addEventListener('click', () => exportBankFile('M2UBIZ_CSV', true));
  $('btnExportM2u').addEventListener('click', () => exportBankFile('M2UBIZ_CSV', false));
  $('btnExportM2e').addEventListener('click', () => exportBankFile('M2E_PIPE_TXT', false));
  $('btnExportCimb').addEventListener('click', () => exportBankFile('CIMB_BIZ_TXT', false));
  $('btnExportAudit').addEventListener('click', () => exportBankFile('AUDIT_RECON_CSV', false));

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
}
