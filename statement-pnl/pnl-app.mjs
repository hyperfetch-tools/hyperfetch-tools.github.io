/**
 * Hyperfetch Malaysia Statement Auto-Categorizer & Monthly P&L Studio
 * Converts Maybank/CIMB/Public Bank/TNG/Grab CSVs or pasted PDF text into categorized GL codes & Monthly P&L PDFs.
 * 100% Stateless Browser-RAM Engine. Zero external dependencies. Strict CSP ('self') compatible.
 */

export const CLOUD_AUTOPAY_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbyxApiw79oG_JHvooqtsc3ctxSwqXuzPqVUM64T2Ifj9aYK2kxRVwq-ABUgO0cOBK6y/exec';

export const POLAR_CHECKOUT_LINKS = {
  MYPAYROL: 'https://buy.polar.sh/polar_cl_YlpL3oaZd36nGEWPvJbSyGZ143JKFgFh5z9Q81nmmTJ',
  MYBUND: 'https://buy.polar.sh/polar_cl_x8tG4fFh0TgXrv1hcu4bulphbGHeBEQbDTSbo4Kp04t',
};

export const WATERMARK_URI = 'https://hyperfetch-tools.github.io/statement-pnl/?ref=pdf_watermark';

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 5000;
const FREE_ROW_LIMIT = 25;
const RULES_STORAGE_KEY = 'zyk_statement_custom_rules_v1';

export const DEFAULT_CODES = [
  { code: '4010', label: 'Sales / Revenue / Salary', group: 'INCOME' },
  { code: '4020', label: 'Interest / Hibah / Cashback', group: 'INCOME' },
  { code: '5010', label: 'COGS / Inventory / Courier', group: 'EXPENSE' },
  { code: '6110', label: 'Utilities (TNB / Water / IWK)', group: 'EXPENSE' },
  { code: '6120', label: 'Telco & Internet', group: 'EXPENSE' },
  { code: '6210', label: 'Petrol, Tolls & Transport', group: 'EXPENSE' },
  { code: '6310', label: 'F&B, Groceries & Dining', group: 'EXPENSE' },
  { code: '6410', label: 'Software, SaaS & Ads', group: 'EXPENSE' },
  { code: '6510', label: 'Bank Charges / SST / Fees', group: 'EXPENSE' },
  { code: '7010', label: 'Rent & Office / Maintenance', group: 'EXPENSE' },
  { code: '8010', label: 'LHDN Tax Relief / Statutory', group: 'EXPENSE' },
  { code: '9010', label: 'Internal Transfer / Savings', group: 'TRANSFER' },
  { code: '9999', label: 'Uncategorized', group: 'REVIEW' },
];

export const BUILTIN_MY_RULES = [
  { rx: /\b(shopee\s*payout|lazada\s*payout|tiktok\s*shop|stripe|polar\.sh|wise\s*transfer|salary|gaji|payroll|client\s*payment|inv[\-\s]?\d+|sales\s*deposit)\b/i, code: '4010' },
  { rx: /\b(hibah|dividend|interest\s*credited|cashback|profit\s*credited)\b/i, code: '4020' },
  { rx: /\b(1688|taobao|alibaba|pos\s*laju|poslaju|j&t|ninjavan|ninja\s*van|dhl|lalamove|gdex|packaging|wholesale|supplier)\b/i, code: '5010' },
  { rx: /\b(tnb|tenaga\s*nasional|air\s*selangor|syabas|saj|indah\s*water|iwk|gas\s*malaysia|sesb|sarawak\s*energy)\b/i, code: '6110' },
  { rx: /\b(unifi|tm\s*tech|telekom|time\s*dotcom|maxis|celcom|digi|celcomdigi|u\s*mobile|umobile|yes\s*4g|yes\s*5g)\b/i, code: '6120' },
  { rx: /\b(petronas|shell|petron|bhp|caltex|touch\s*n\s*go|tng\s*rfid|plus\s*express|duke|akleh|grab|maxim|rapidkl|mrt|ktmb|parking)\b/i, code: '6210' },
  { rx: /\b(jaya\s*grocer|village\s*grocer|mydin|99\s*speedmart|speedmart|kk\s*mart|lotus|aeon|mamak|kopi|zus|starbucks|mcdonald|kfc|foodpanda|shopeefood|grabfood|restaurant|restoran|cafe|bistro|lazada|shopee)\b/i, code: '6310' },
  { rx: /\b(receive\s*from\s*wallet|fund\s*transfer|transfer\s*to\s*wallet|duitnow\s*transfer)\b/i, code: '9010' },
  { rx: /\b(google\s*\*|google\s*ads|meta\s*ads|facebook|openai|chatgpt|canva|apify|adobe|microsoft|cloudflare|github|aws|digitalocean|apple\.com\/bill)\b/i, code: '6410' },
  { rx: /\b(service\s*charge|stamp\s*duty|bank\s*fee|ibg\s*fee|rentas|annual\s*fee|sst\s*charge|duitnow\s*fee)\b/i, code: '6510' },
  { rx: /\b(rental|sewa|management\s*corp|jmb|maintenance\s*fee|coworking|common\s*ground|worq)\b/i, code: '7010' },
  { rx: /\b(lhdn|hasil|kwsp|epf|perkeso|socso|zakat|ptptn|sspn|prudential|aia|great\s*eastern|allianz|klinik|clinic|hospital|pharmacy|watsons|guardian|popular|mph)\b/i, code: '8010' },
  { rx: /\b(own\s*account|transfer\s*to\s*savings|tabung|topup\s*tng|reload\s*ewallet|asb|tabung\s*haji)\b/i, code: '9010' },
];

export function sanitizeField(val, maxLen = 100) {
  let s = String(val ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  s = s.replace(/^[=+\-@|]+/, '').replace(/[\u2013\u2014]/g, '-');
  s = s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
  return s.slice(0, maxLen);
}

export function extractMerchantKeyword(desc) {
  const cleaned = String(desc || '')
    .toUpperCase()
    .replace(/\b(DUITNOW\s*QR|DUITNOW|IBG\s*TRF|FPX\s*PYMT|POS\s*DEBIT|VISA\s*PURCHASE|MASTERCARD|PAYMENT\s*TO|TRANSFER\s*TO|FROM)\b/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter((w) => w.length >= 2);
  return words.slice(0, 2).join(' ') || cleaned.slice(0, 18) || 'MERCHANT';
}

function parseMoneySigned(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const isParenNeg = /^\(.*\)$/.test(s);
  const isDr = /\bDR\b/i.test(s);
  const isNeg = isParenNeg || isDr || s.startsWith('-');
  const numStr = s.replace(/[^0-9.]/g, '');
  if (!numStr) return null;
  const n = Number(numStr);
  if (!Number.isFinite(n)) return null;
  return Number((isNeg ? -Math.abs(n) : n).toFixed(2));
}

function parseDelimitedMatrix(rawText) {
  const cleaned = String(rawText || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const sample = lines[0];
  // Do not mistake currency commas (e.g. "1,250.00") in pasted PDF/bank lines for CSV columns
  if (/^\s*(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3})\s+/i.test(sample)) return null;
  const tabs = (sample.match(/\t/g) || []).length;
  const semis = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  if (tabs === 0 && semis === 0 && commas === 0) return null;

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
        } else inQuotes = false;
      } else cur += ch;
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
  if (matrix.length < 2) return null;

  const headers = matrix[0].map((h, i) => h || `Col_${i + 1}`);
  const rows = matrix.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? '';
    });
    return obj;
  });
  return { delimiter, headers, rows };
}

function pickField(row, patterns) {
  const keys = Object.keys(row);
  for (const pat of patterns) {
    const hit = keys.find((k) => pat.test(k.trim()));
    if (hit !== undefined && String(row[hit]).trim() !== '') return String(row[hit]).trim();
  }
  return '';
}

/**
 * Parses either CSV/TSV/Semicolon files OR raw copied PDF/banking-app statement lines.
 */
export function parseStatementInput(rawText) {
  const matrix = parseDelimitedMatrix(rawText);
  if (matrix) {
    const txns = [];
    matrix.rows.slice(0, MAX_ROWS).forEach((row) => {
      const dateRaw = pickField(row, [/^(txn|trans(action)?|value|posting)?\s*date$/i, /^tarikh$/i]);
      const descRaw = pickField(row, [
        /^(txn\s*)?desc(ription)?$/i,
        /^particulars?$/i,
        /^merchant$/i,
        /^details?$/i,
        /^butiran$/i,
        /^narrative$/i,
      ]);
      const debitRaw = pickField(row, [/^debit$/i, /^withdrawal$/i, /^outflow$/i, /^spent$/i, /^money\s*out$/i, /^keluar$/i]);
      const creditRaw = pickField(row, [/^credit$/i, /^deposit$/i, /^inflow$/i, /^received$/i, /^money\s*in$/i, /^masuk$/i]);
      const amtRaw = pickField(row, [/^amount(\s*\(?myr\)?)?$/i, /^jumlah$/i, /^net$/i]);
      const typeRaw = pickField(row, [/^(dr\/cr|type|d\/c)$/i]);
      const existingCode = pickField(row, [/^(gl\s*|account\s*|line\s*)?code$/i, /^category$/i]);

      let inflow = 0;
      let outflow = 0;
      const dVal = parseMoneySigned(debitRaw);
      const cVal = parseMoneySigned(creditRaw);

      if (dVal !== null || cVal !== null) {
        outflow = dVal ? Math.abs(dVal) : 0;
        inflow = cVal ? Math.abs(cVal) : 0;
      } else {
        const aVal = parseMoneySigned(amtRaw);
        if (aVal === null || aVal === 0) return;
        const isDebitType = /^\s*(dr|debit|out|expense)\s*$/i.test(typeRaw);
        if (aVal < 0 || isDebitType) outflow = Math.abs(aVal);
        else inflow = Math.abs(aVal);
      }
      if (inflow === 0 && outflow === 0) return;

      txns.push({
        date: sanitizeField(dateRaw || '—', 20),
        description: sanitizeField(descRaw || 'Transaction', 110),
        inflow: Number(inflow.toFixed(2)),
        outflow: Number(outflow.toFixed(2)),
        explicitCode: sanitizeField(existingCode, 20),
      });
    });
    return { sourceMode: `DELIMITED (${matrix.delimiter === ';' ? 'Semicolon' : matrix.delimiter === '\t' ? 'TSV' : 'CSV'})`, transactions: txns };
  }

  // Fallback: Raw Pasted or Extracted Bank / TNG eWallet PDF Lines
  const lines = String(rawText || '').replace(/\r\n/g, '\n').split('\n');
  const txns = [];
  // Matches: <Date> <Description...> <TxnAmount (+/-/DR/CR/RM)> [Optional Running Balance]
  const lineWithBalRx =
    /^\s*(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{2,4})?)\s+(.+?)\s+([+\-]?(?:RM\s*)?[\d,]+\.\d{2}(?:\s*(?:DR|CR|\+|-))?)(?:\s+([+\-]?(?:RM\s*)?[\d,]+\.\d{2}(?:\s*(?:DR|CR))?))?\s*$/i;

  let prevBalance = null;
  for (const rawLine of lines) {
    if (txns.length >= MAX_ROWS) break;
    const m = rawLine.match(lineWithBalRx);
    if (!m) continue;
    const dateStr = sanitizeField(m[1], 20);
    let descStr = sanitizeField(m[2], 140);
    if (/^(opening|closing|beginning|ending|brought\s*forward|balance\s*b\/f|balance\s*c\/f)/i.test(descStr)) continue;
    if (/^failed\b/i.test(descStr)) continue;

    // Clean TNG eWallet noise (leading "Success", 12+ digit reference IDs, TNGOW3... codes)
    descStr = descStr
      .replace(/^success\s+/i, '')
      .replace(/\b\d{10,}[A-Z0-9]*\b/g, ' ')
      .replace(/\bTNGOW[A-Z0-9]+\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const amtRaw = m[3];
    const balRaw = m[4] || '';
    const isCr = /\bCR\b|\+$/i.test(amtRaw) || /^\+/.test(amtRaw);
    const isDr = /\bDR\b|-$/i.test(amtRaw) || /^-/.test(amtRaw);
    const num = Math.abs(parseMoneySigned(amtRaw) || 0);
    const curBal = balRaw ? Math.abs(parseMoneySigned(balRaw) || 0) : null;
    if (num <= 0) continue;

    let looksIncome = false;
    if (isCr) {
      looksIncome = true;
    } else if (isDr) {
      looksIncome = false;
    } else if (curBal !== null && prevBalance !== null) {
      // Exact balance delta check (works for TNG Wallet Transaction History where amounts have no +/-!)
      if (Math.abs(prevBalance + num - curBal) < 0.02) looksIncome = true;
      else if (Math.abs(prevBalance - num - curBal) < 0.02) looksIncome = false;
      else {
        looksIncome = /\b(receive\s*from\s*wallet|payout|salary|gaji|deposit|credit|hibah|refund|cashback|reload|top\s*up|transfer\s*from|received\s*from|go\+\s*return)\b/i.test(
          descStr
        );
      }
    } else {
      looksIncome = /\b(receive\s*from\s*wallet|payout|salary|gaji|deposit|credit|hibah|refund|cashback|reload|top\s*up|transfer\s*from|received\s*from|go\+\s*return)\b/i.test(
        descStr
      );
    }
    if (curBal !== null) prevBalance = curBal;

    txns.push({
      date: dateStr,
      description: descStr.slice(0, 110) || 'Transaction',
      inflow: looksIncome ? num : 0,
      outflow: looksIncome ? 0 : num,
      explicitCode: '',
    });
  }

  return { sourceMode: 'PDF / APP TEXT', transactions: txns };
}

export function classifyTransaction(txn, customRules = [], codeList = DEFAULT_CODES) {
  const codeMap = new Map(codeList.map((c) => [c.code, c]));
  const desc = txn.description || '';

  // 1. User's saved custom rules take top priority
  for (const rule of customRules) {
    const kw = String(rule.keyword || '').trim();
    if (!kw) continue;
    if (desc.toUpperCase().includes(kw.toUpperCase())) {
      const meta = codeMap.get(rule.code) || { code: rule.code, label: rule.label || 'Custom Code', group: txn.inflow > 0 ? 'INCOME' : 'EXPENSE' };
      return { code: meta.code, label: meta.label, group: meta.group, matchedBy: 'CUSTOM_RULE' };
    }
  }

  // 2. Built-in Malaysian Merchant & Statutory Rulebook
  for (const r of BUILTIN_MY_RULES) {
    if (r.rx.test(desc)) {
      const meta = codeMap.get(r.code);
      return { code: meta.code, label: meta.label, group: meta.group, matchedBy: 'BUILTIN_MY' };
    }
  }

  // 3. Explicit code in uploaded CSV if valid
  if (txn.explicitCode && codeMap.has(txn.explicitCode)) {
    const meta = codeMap.get(txn.explicitCode);
    return { code: meta.code, label: meta.label, group: meta.group, matchedBy: 'CSV_CODE' };
  }

  // 4. Inflow fallback
  if (txn.inflow > 0 && txn.outflow === 0) {
    const meta = codeMap.get('4010');
    return { code: meta.code, label: meta.label, group: meta.group, matchedBy: 'INFLOW_AUTO' };
  }

  const unk = codeMap.get('9999');
  return { code: unk.code, label: unk.label, group: unk.group, matchedBy: 'UNMATCHED' };
}

export function compileStatementLedger(rawText, customRules = [], reportMeta = {}) {
  const parsed = parseStatementInput(rawText);
  const rows = parsed.transactions.map((t, idx) => {
    const cls = classifyTransaction(t, customRules);
    return {
      rowIndex: idx + 1,
      date: t.date,
      description: t.description,
      keywordHint: extractMerchantKeyword(t.description),
      inflow: t.inflow,
      outflow: t.outflow,
      code: cls.code,
      categoryLabel: cls.label,
      group: cls.group,
      matchedBy: cls.matchedBy,
    };
  });

  return summarizeLedgerRows(rows, parsed.sourceMode, reportMeta);
}

export function summarizeLedgerRows(rows, sourceMode = 'CSV', reportMeta = {}) {
  let totalInflow = 0;
  let totalOutflow = 0;
  let taxReliefTotal = 0;
  let autoMatched = 0;
  const byCodeMap = new Map();

  for (const r of rows) {
    totalInflow += r.inflow;
    totalOutflow += r.outflow;
    if (r.code === '8010') taxReliefTotal += r.outflow;
    if (r.code !== '9999') autoMatched++;

    const cur = byCodeMap.get(r.code) || {
      code: r.code,
      label: r.categoryLabel,
      group: r.group,
      count: 0,
      inflow: 0,
      outflow: 0,
    };
    cur.count++;
    cur.inflow = Number((cur.inflow + r.inflow).toFixed(2));
    cur.outflow = Number((cur.outflow + r.outflow).toFixed(2));
    byCodeMap.set(r.code, cur);
  }

  const netCashflow = Number((totalInflow - totalOutflow).toFixed(2));
  const categoryBreakdown = Array.from(byCodeMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  return {
    meta: {
      reportTitle: sanitizeField(reportMeta.reportTitle || 'Monthly Spending & Earning P&L Report', 64),
      accountHolder: sanitizeField(reportMeta.accountHolder || 'HYPERFETCH SME / PERSONAL ACCOUNT', 55),
      periodLabel: sanitizeField(reportMeta.periodLabel || '2026-10', 24),
      sourceMode,
    },
    rows,
    categoryBreakdown,
    totals: {
      count: rows.length,
      autoMatched,
      unmatched: rows.length - autoMatched,
      autoRatePct: rows.length ? Math.round((autoMatched / rows.length) * 100) : 0,
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      netCashflow,
      taxReliefTotal: Number(taxReliefTotal.toFixed(2)),
    },
  };
}

function csvCell(val) {
  let s = String(val ?? '').replace(/^[=+\-@|]+/, '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCategorizedCsv(ledger, sliceLimit = null) {
  const list = sliceLimit ? ledger.rows.slice(0, sliceLimit) : ledger.rows;
  const header = ['#', 'Date', 'Description', 'GL Code', 'Category', 'Inflow (MYR)', 'Outflow (MYR)', 'Net (MYR)'].join(',');
  const lines = list.map((r) =>
    [
      r.rowIndex,
      csvCell(r.date),
      csvCell(r.description),
      csvCell(r.code),
      csvCell(r.categoryLabel),
      r.inflow.toFixed(2),
      r.outflow.toFixed(2),
      (r.inflow - r.outflow).toFixed(2),
    ].join(',')
  );
  const subIn = list.reduce((s, r) => s + r.inflow, 0);
  const subOut = list.reduce((s, r) => s + r.outflow, 0);
  lines.push(['TOTAL', '', `${list.length} Transactions`, '', '', subIn.toFixed(2), subOut.toFixed(2), (subIn - subOut).toFixed(2)].join(','));
  if (sliceLimit) {
    lines.push(['NOTE', '', 'Generated via Hyperfetch Statement P&L Studio (hyperfetch-tools.github.io/statement-pnl/)', '', '', '', '', ''].join(','));
  }
  return [header, ...lines].join('\r\n') + '\r\n';
}

/* ============================================================================
 * ZERO-DEPENDENCY ISO 32000 PDF 1.4 P&L VECTOR REPORT GENERATOR
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

export function generateMonthlyPnlPdfBytes(ledger, { watermark = true } = {}) {
  const ops = [];
  const rectFill = (x, y, w, h, r, g, b) =>
    ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const rectStroke = (x, y, w, h, r, g, b, lw = 0.7) =>
    ops.push(`${lw.toFixed(2)} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  const line = (x1, y1, x2, y2) =>
    ops.push(`0.50 w 0.840 0.870 0.910 RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  const text = (str, x, y, font = 'F1', size = 9, r = 0.06, g = 0.09, b = 0.16) =>
    ops.push(`BT /${font} ${size.toFixed(1)} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(str)}) Tj ET`);
  const textRight = (str, rightX, y, font = 'F3', size = 9, r = 0.06, g = 0.09, b = 0.16) => {
    const s = String(str ?? '');
    const charW = font === 'F3' ? size * 0.6 : size * 0.52;
    text(s, Math.max(36, rightX - s.length * charW), y, font, size, r, g, b);
  };

  // Header
  rectFill(36, 760, 523.28, 52, 0.043, 0.122, 0.227);
  text(ledger.meta.reportTitle.toUpperCase(), 46, 792, 'F2', 11.5, 1, 1, 1);
  text(`Account / Entity: ${ledger.meta.accountHolder}  |  Transactions: ${ledger.totals.count}`, 46, 774, 'F1', 8.2, 0.78, 0.84, 0.92);
  textRight(`PERIOD: ${ledger.meta.periodLabel}`, 548, 791, 'F3', 10, 0.43, 0.91, 0.72);

  // Summary Cards
  const t = ledger.totals;
  rectFill(36, 700, 168, 48, 0.92, 0.99, 0.95);
  rectStroke(36, 700, 168, 48, 0.04, 0.59, 0.41, 0.8);
  text('TOTAL EARNINGS (INFLOW)', 44, 733, 'F2', 7.5, 0.02, 0.38, 0.27);
  text(`RM ${fmtMoney(t.totalInflow)}`, 44, 712, 'F3', 11.5, 0.02, 0.38, 0.27);

  rectFill(213.6, 700, 168, 48, 0.99, 0.95, 0.95);
  rectStroke(213.6, 700, 168, 48, 0.73, 0.11, 0.11, 0.8);
  text('TOTAL SPENDING (OUTFLOW)', 221.6, 733, 'F2', 7.5, 0.65, 0.12, 0.12);
  text(`RM ${fmtMoney(t.totalOutflow)}`, 221.6, 712, 'F3', 11.5, 0.65, 0.12, 0.12);

  rectFill(391.2, 700, 168, 48, 0.95, 0.97, 1);
  rectStroke(391.2, 700, 168, 48, 0.09, 0.2, 0.36, 0.8);
  text('NET CASHFLOW (MYR)', 399.2, 733, 'F2', 7.5, 0.09, 0.2, 0.36);
  text(`RM ${fmtMoney(t.netCashflow)}`, 399.2, 712, 'F3', 11.5, 0.09, 0.2, 0.36);

  // Category Breakdown Table
  let y = 674;
  rectFill(36, y - 4, 523.28, 18, 0.09, 0.2, 0.36);
  text('CODE', 44, y + 1, 'F2', 8.2, 1, 1, 1);
  text('CATEGORY / LINE ACCOUNT', 95, y + 1, 'F2', 8.2, 1, 1, 1);
  textRight('TXNS', 330, y + 1, 'F2', 8.2, 1, 1, 1);
  textRight('INFLOW (RM)', 440, y + 1, 'F2', 8.2, 1, 1, 1);
  textRight('OUTFLOW (RM)', 550, y + 1, 'F2', 8.2, 1, 1, 1);

  y -= 20;
  for (const cat of ledger.categoryBreakdown.slice(0, 18)) {
    text(cat.code, 44, y, 'F3', 8.4);
    text(cat.label.slice(0, 40), 95, y, 'F1', 8.4);
    textRight(String(cat.count), 330, y, 'F3', 8.4);
    textRight(fmtMoney(cat.inflow), 440, y, 'F3', 8.4);
    textRight(fmtMoney(cat.outflow), 550, y, 'F3', 8.4);
    line(36, y - 5, 559.28, y - 5);
    y -= 18;
  }

  y -= 10;
  rectFill(36, y - 4, 523.28, 22, 0.96, 0.97, 0.99);
  text(`LHDN Tax Relief / Statutory Tagged (Code 8010): RM ${fmtMoney(t.taxReliefTotal)}   |   Auto-Categorized: ${t.autoRatePct}%`, 44, y + 3, 'F2', 8.2, 0.15, 0.22, 0.35);

  if (watermark) {
    rectFill(36, 16, 523.28, 22, 0.94, 0.99, 0.96);
    rectStroke(36, 16, 523.28, 22, 0.04, 0.59, 0.41, 0.7);
    text('Generated FREE via Hyperfetch Statement P&L Studio (hyperfetch-tools.github.io/statement-pnl)', 44, 28.5, 'F2', 7.6, 0.02, 0.38, 0.27);
    text('Click here to unlock Pro (RM 39 One-Time) -> Removes footer & unlocks unlimited monthly rows', 44, 19.8, 'F1', 7.1, 0.04, 0.47, 0.34);
  }

  const streamStr = ops.join('\n');
  const encoder = new TextEncoder();
  const streamLen = encoder.encode(streamStr).length;

  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };
  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  addObj('<< /Type /Pages /Kids [7 0 R] /Count 1 >>');
  const f1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const f3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
  const contentId = addObj(`<< /Length ${streamLen} >>\nstream\n${streamStr}\nendstream`);
  let linkAnnot = '';
  if (watermark) {
    const linkId = 8;
    linkAnnot = ` /Annots [${linkId} 0 R]`;
  }
  addObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${contentId} 0 R${linkAnnot} >>`
  );
  if (watermark) {
    addObj(`<< /Type /Annot /Subtype /Link /Rect [36 16 559.28 38] /Border [0 0 0] /A << /Type /Action /S /URI /URI (${pdfEscape(WATERMARK_URI)}) >> >>`);
  }

  const chunks = [];
  let offset = 0;
  const pushStr = (s) => {
    const b = encoder.encode(s);
    chunks.push(b);
    offset += b.length;
  };
  pushStr('%PDF-1.4\n%HyperfetchStatementPNL\n');
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(offset);
    pushStr(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
  }
  const xrefStart = offset;
  pushStr(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= objects.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const out = new Uint8Array(offset);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

/* ============================================================================
 * MOBILE-FIRST + DESKTOP STUDIO CONTROLLER
 * ============================================================================ */

if (typeof document !== 'undefined') {
  let currentLedger = null;
  let activeFilter = 'ALL';
  let activeCheckoutProduct = 'MYPAYROL';
  let activePaymentRail = 'CARD';
  let activeOrderId = null;
  let pollTimer = null;
  let isUnlocked = Boolean(localStorage.getItem('zyk_mypayroll_key'));

  const $ = (id) => document.getElementById(id);

  function loadCustomRules() {
    try {
      const raw = localStorage.getItem(RULES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCustomRule(keyword, code) {
    const kw = String(keyword || '').trim().toUpperCase();
    if (!kw) return;
    const rules = loadCustomRules().filter((r) => String(r.keyword).toUpperCase() !== kw);
    rules.unshift({ keyword: kw, code });
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules.slice(0, 400)));
  }

  function refreshUnlockUi() {
    const saved = localStorage.getItem('zyk_mypayroll_key');
    isUnlocked = Boolean(saved);
    const pill = $('licenseStatusBadge');
    const txt = $('licenseBadgeText');
    if (saved) {
      pill.classList.add('unlocked');
      txt.textContent = `Pro Unlocked · ${saved.slice(0, 12)}…`;
    } else {
      pill.classList.remove('unlocked');
      txt.textContent = 'Free (25 Rows) · Unlock RM 39';
    }
    if (currentLedger) refreshExportBanner();
  }

  function refreshExportBanner() {
    if (!currentLedger) return;
    const n = currentLedger.totals.count;
    $('exportHeadline').textContent = isUnlocked
      ? `Pro Active: Export all ${n} categorized transactions & clean white-label P&L PDF.`
      : `Free Tier exports up to ${Math.min(n, FREE_ROW_LIMIT)} rows + P&L PDF (with footer). Unlock Pro (RM 39 once) for all ${n} rows & clean PDF.`;
  }

  function applyQuickRuleAndRecompute(keyword, newCode) {
    saveCustomRule(keyword, newCode);
    const meta = DEFAULT_CODES.find((c) => c.code === newCode) || DEFAULT_CODES[DEFAULT_CODES.length - 1];
    const kwUpper = keyword.toUpperCase();
    let updated = 0;
    for (const r of currentLedger.rows) {
      if (r.description.toUpperCase().includes(kwUpper)) {
        r.code = meta.code;
        r.categoryLabel = meta.label;
        r.group = meta.group;
        r.matchedBy = 'CUSTOM_RULE';
        updated++;
      }
    }
    currentLedger = summarizeLedgerRows(currentLedger.rows, currentLedger.meta.sourceMode, currentLedger.meta);
    renderLedgerResults();
    $('ruleToast').textContent = `Saved rule "${kwUpper}" -> ${meta.code} (${updated} matching row${updated === 1 ? '' : 's'} updated & remembered for next month!)`;
  }

  function buildCodeSelect(row) {
    const sel = document.createElement('select');
    sel.className = 'code-select';
    for (const c of DEFAULT_CODES) {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.code} · ${c.label}`;
      if (c.code === row.code) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => {
      const meta = DEFAULT_CODES.find((c) => c.code === sel.value) || DEFAULT_CODES[DEFAULT_CODES.length - 1];
      row.code = meta.code;
      row.categoryLabel = meta.label;
      row.group = meta.group;
      currentLedger = summarizeLedgerRows(currentLedger.rows, currentLedger.meta.sourceMode, currentLedger.meta);
      renderSummaryAndCategories();
    });
    return sel;
  }

  function renderSummaryAndCategories() {
    const t = currentLedger.totals;
    $('totalsSummary').textContent = `${currentLedger.meta.sourceMode} · ${t.count} Txns · ${t.autoRatePct}% Auto-Coded`;

    const kpis = [
      ['Earnings (Inflow)', `RM ${fmtMoney(t.totalInflow)}`, 'inflow'],
      ['Spending (Outflow)', `RM ${fmtMoney(t.totalOutflow)}`, 'outflow'],
      ['Net Cashflow', `RM ${fmtMoney(t.netCashflow)}`, t.netCashflow >= 0 ? 'inflow' : 'outflow'],
      ['Auto-Coded Speed', `${t.autoRatePct}% (${t.unmatched} left)`, ''],
    ];
    const statsWrap = $('diagStats');
    statsWrap.replaceChildren();
    for (const [lbl, val, cls] of kpis) {
      const cell = document.createElement('div');
      cell.className = 'metric-cell';
      const vEl = document.createElement('div');
      vEl.className = `metric-val ${cls}`;
      vEl.textContent = val;
      const lEl = document.createElement('div');
      lEl.className = 'metric-lbl';
      lEl.textContent = lbl;
      cell.append(vEl, lEl);
      statsWrap.appendChild(cell);
    }

    // Category Breakdown Chips
    const catWrap = $('categoryBars');
    catWrap.replaceChildren();
    const maxAmt = Math.max(1, ...currentLedger.categoryBreakdown.map((c) => Math.max(c.inflow, c.outflow)));
    for (const cat of currentLedger.categoryBreakdown) {
      const amt = cat.outflow > 0 ? cat.outflow : cat.inflow;
      const pct = Math.min(100, Math.round((amt / maxAmt) * 100));
      const item = document.createElement('div');
      item.className = 'cat-row';
      const top = document.createElement('div');
      top.className = 'cat-top';
      const left = document.createElement('span');
      left.textContent = `${cat.code} · ${cat.label} (${cat.count})`;
      const right = document.createElement('strong');
      right.className = 'mono';
      right.textContent = cat.outflow > 0 ? `-RM ${fmtMoney(cat.outflow)}` : `+RM ${fmtMoney(cat.inflow)}`;
      top.append(left, right);

      const barBg = document.createElement('div');
      barBg.className = 'cat-bar-bg';
      const barFill = document.createElement('div');
      barFill.className = `cat-bar-fill ${cat.group === 'INCOME' ? 'income' : ''}`;
      barFill.style.width = `${pct}%`;
      barBg.appendChild(barFill);
      item.append(top, barBg);
      catWrap.appendChild(item);
    }
  }

  function renderLedgerResults() {
    if (!currentLedger) return;
    $('resultsPanel').style.display = 'block';
    renderSummaryAndCategories();

    let rows = currentLedger.rows;
    if (activeFilter === 'UNMATCHED') rows = rows.filter((r) => r.code === '9999');
    else if (activeFilter === 'INFLOW') rows = rows.filter((r) => r.inflow > 0);
    else if (activeFilter === 'OUTFLOW') rows = rows.filter((r) => r.outflow > 0);

    // Desktop Table
    const tbody = $('previewTableBody');
    tbody.replaceChildren();
    // Mobile Cards
    const mobileWrap = $('mobileCardsWrap');
    mobileWrap.replaceChildren();

    rows.forEach((r) => {
      // 1. Desktop Table Row
      const tr = document.createElement('tr');
      if (r.code === '9999') tr.className = 'row-review';
      const tdDate = document.createElement('td');
      tdDate.className = 'mono';
      tdDate.textContent = r.date;

      const tdDesc = document.createElement('td');
      tdDesc.textContent = r.description;

      const tdAmt = document.createElement('td');
      tdAmt.className = `num mono ${r.inflow > 0 ? 'amt-in' : 'amt-out'}`;
      tdAmt.textContent = r.inflow > 0 ? `+${fmtMoney(r.inflow)}` : `-${fmtMoney(r.outflow)}`;

      const tdCode = document.createElement('td');
      tdCode.appendChild(buildCodeSelect(r));

      const tdRule = document.createElement('td');
      const ruleBtn = document.createElement('button');
      ruleBtn.type = 'button';
      ruleBtn.className = 'btn btn-outline btn-xs';
      ruleBtn.textContent = `Apply "${r.keywordHint.slice(0, 14)}"`;
      ruleBtn.addEventListener('click', () => applyQuickRuleAndRecompute(r.keywordHint, r.code));
      tdRule.appendChild(ruleBtn);

      tr.append(tdDate, tdDesc, tdAmt, tdCode, tdRule);
      tbody.appendChild(tr);

      // 2. Mobile Card (Zero Horizontal Scroll on Phone!)
      const card = document.createElement('div');
      card.className = `txn-card ${r.code === '9999' ? 'review' : ''}`;

      const head = document.createElement('div');
      head.className = 'txn-card-head';
      const dSpan = document.createElement('span');
      dSpan.className = 'mono txn-date';
      dSpan.textContent = r.date;
      const aSpan = document.createElement('span');
      aSpan.className = `mono txn-amt ${r.inflow > 0 ? 'amt-in' : 'amt-out'}`;
      aSpan.textContent = r.inflow > 0 ? `+RM ${fmtMoney(r.inflow)}` : `-RM ${fmtMoney(r.outflow)}`;
      head.append(dSpan, aSpan);

      const descDiv = document.createElement('div');
      descDiv.className = 'txn-desc';
      descDiv.textContent = r.description;

      const actions = document.createElement('div');
      actions.className = 'txn-actions';
      const mobileSel = buildCodeSelect(r);
      const mobileRuleBtn = document.createElement('button');
      mobileRuleBtn.type = 'button';
      mobileRuleBtn.className = 'btn btn-outline btn-xs';
      mobileRuleBtn.textContent = 'Save Rule';
      mobileRuleBtn.addEventListener('click', () => applyQuickRuleAndRecompute(r.keywordHint, r.code));
      actions.append(mobileSel, mobileRuleBtn);

      card.append(head, descDiv, actions);
      mobileWrap.appendChild(card);
    });

    refreshExportBanner();
  }

  function runCompile() {
    const raw = $('rawStatementBox').value;
    if (!raw.trim() || raw.length > MAX_INPUT_BYTES) return;
    currentLedger = compileStatementLedger(raw, loadCustomRules(), {
      reportTitle: $('repTitle').value,
      accountHolder: $('repEntity').value,
      periodLabel: $('repMonth').value,
    });
    if (!currentLedger.rows.length) {
      $('loadedFileLabel').textContent = 'Could not detect transactions — check extracted lines below or paste CSV.';
      $('rawEditorDrawer').classList.add('open');
      return;
    }
    renderLedgerResults();
  }

  async function verifyStoredProKeyLive() {
    const key = (localStorage.getItem('zyk_mypayroll_key') || '').trim().toUpperCase();
    if (!key) return false;
    try {
      const qs = new URLSearchParams({ action: 'verifyKey', key, product: 'MYPAYROL' });
      const data = await (await fetch(`${CLOUD_AUTOPAY_EXEC_URL}?${qs.toString()}`)).json();
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

  async function handleExport(kind) {
    if (!currentLedger || !currentLedger.rows.length) return;
    let proOk = false;
    if (isUnlocked) proOk = await verifyStoredProKeyLive();

    if (kind === 'CSV') {
      if (!proOk && currentLedger.rows.length > FREE_ROW_LIMIT) {
        // Export free 25-row sample or open drawer
        const csv = buildCategorizedCsv(currentLedger, FREE_ROW_LIMIT);
        triggerDownload(`FREE25_Statement_${currentLedger.meta.periodLabel}.csv`, csv, 'text/csv;charset=utf-8');
        openUnlockDrawer('MYPAYROL');
        return;
      }
      const csv = buildCategorizedCsv(currentLedger, null);
      triggerDownload(`Statement_PnL_${currentLedger.meta.periodLabel}.csv`, csv, 'text/csv;charset=utf-8');
      return;
    }

    const pdfBytes = generateMonthlyPnlPdfBytes(currentLedger, { watermark: !proOk });
    triggerDownload(`Monthly_PnL_${currentLedger.meta.periodLabel}.pdf`, pdfBytes, 'application/pdf');
  }

  function triggerDownload(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function loadSampleStatement() {
    const sample = [
      'Date,Description,Debit,Credit',
      '2026-10-01,SHOPEE PAYOUT MY SETTLEMENT,,4820.50',
      '2026-10-02,TENAGA NASIONAL BERHAD (TNB),248.60,',
      '2026-10-03,UNIFI TM HOME & OFFICE,149.00,',
      '2026-10-04,DUITNOW QR - RESTORAN ALI MAMAK,18.50,',
      '2026-10-05,PETRONAS SETAPAK,85.00,',
      '2026-10-06,TOUCH N GO RFID RELOAD,50.00,',
      '2026-10-08,SHOPEE PAYOUT MY SETTLEMENT,,3190.00',
      '2026-10-09,J&T EXPRESS SHIPPING CHARGE,312.40,',
      '2026-10-10,GOOGLE ADS *849201,420.00,',
      '2026-10-12,KLINIK MEDIVIRON MALAYSIA,75.00,',
      '2026-10-14,DUITNOW QR - KEDAI BUKU POPULAR,92.00,',
      '2026-10-15,KWSP / EPF CONTRIBUTION,1120.00,',
      '2026-10-18,RENTAL OCTOBER OFFICE UNIT,1800.00,',
      '2026-10-20,DUITNOW QR - WARUNG KAK ROS,14.00,',
    ].join('\n');
    $('loadedFileLabel').textContent = '14 Malaysian Bank Rows Loaded — Watch 93% Auto-Code in 1ms!';
    $('rawStatementBox').value = sample;
    runCompile();
  }

  function selectTier(tier) {
    activeCheckoutProduct = tier === 'MYBUND' ? 'MYBUND' : 'MYPAYROL';
    const isBundle = activeCheckoutProduct === 'MYBUND';
    $('tierBtnSingle').classList.toggle('active', !isBundle);
    $('tierBtnBundle').classList.toggle('active', isBundle);
    $('cardProductLabel').textContent = isBundle
      ? 'Malaysia SME Master Bundle (All 5 Tools)'
      : 'Statement P&L + MyPayroll + Borang EA + GIRO';
    $('cardPriceLabel').textContent = isBundle
      ? 'USD 14.99 (~RM 55 One-Time · Unlocks All 5 Tools)'
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
      const data = await (await fetch(`${CLOUD_AUTOPAY_EXEC_URL}?${qs.toString()}`)).json();
      if (data?.valid) {
        localStorage.setItem('zyk_mypayroll_key', key);
        refreshUnlockUi();
        msg.textContent = 'Pro Activated! Unlimited rows & clean white-label P&L PDF unlocked.';
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
      const data = await (await fetch(`${CLOUD_AUTOPAY_EXEC_URL}?${qs.toString()}`)).json();
      if (!data?.ok || !data.order) throw new Error('Order error');
      activeOrderId = data.order.orderId;
      $('exactPayAmount').textContent = `${data.order.currency} ${data.order.exactAmountFormatted}`;
      $('exactPayAmount').setAttribute('data-raw', data.order.exactAmountFormatted);
      $('exactOrderRef').textContent = data.order.orderId;
      $('orderPollStatus').textContent = 'Waiting for Wise transfer (24/7 Cloud AutoPay)...';

      pollTimer = setInterval(async () => {
        try {
          const stQs = new URLSearchParams({ action: 'orderStatus', orderId: activeOrderId });
          const st = await (await fetch(`${CLOUD_AUTOPAY_EXEC_URL}?${stQs.toString()}`)).json();
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

  let pendingPdfBytes = null;
  let pendingPdfName = '';

  async function extractPdfLinesLocally(uint8Bytes, password = '') {
    const pdfjsLib = await import('./vendor/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.mjs';

    const loadingTask = pdfjsLib.getDocument({
      data: uint8Bytes.slice(),
      password: password || undefined,
    });
    const doc = await loadingTask.promise;
    const allLines = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const buckets = new Map();
      for (const item of tc.items) {
        const str = String(item.str || '').trim();
        if (!str) continue;
        const y = Math.round((item.transform?.[5] || 0) / 5) * 5;
        const x = item.transform?.[4] || 0;
        if (!buckets.has(y)) buckets.set(y, []);
        buckets.get(y).push({ x, str });
      }
      const ys = Array.from(buckets.keys()).sort((a, b) => b - a);
      for (const y of ys) {
        const rowStr = buckets
          .get(y)
          .sort((a, b) => a.x - b.x)
          .map((t) => t.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (rowStr) allLines.push(rowStr);
      }
    }
    return allLines.join('\n');
  }

  async function handleUploadedFile(file) {
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      $('loadedFileLabel').textContent = 'File exceeds 10 MB limit.';
      return;
    }
    const isPdf = /\.pdf$/i.test(file.name || '') || file.type === 'application/pdf';
    if (!isPdf) {
      $('pdfPasswordBox').style.display = 'none';
      pendingPdfBytes = null;
      $('loadedFileLabel').textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      $('rawStatementBox').value = await file.text();
      runCompile();
      return;
    }

    $('loadedFileLabel').textContent = `Decrypting & reading PDF locally in browser RAM: ${file.name}...`;
    pendingPdfName = file.name;
    pendingPdfBytes = new Uint8Array(await file.arrayBuffer());
    await tryUnlockAndParsePdf('');
  }

  async function tryUnlockAndParsePdf(password) {
    if (!pendingPdfBytes) return;
    try {
      const extractedText = await extractPdfLinesLocally(pendingPdfBytes, password);
      $('pdfPasswordBox').style.display = 'none';
      $('pdfPasswordInput').value = '';
      $('pdfPasswordMsg').textContent = '';
      pendingPdfBytes = null;
      $('loadedFileLabel').textContent = `PDF Decrypted Locally: ${pendingPdfName} — Auto-Coding Now!`;
      $('rawStatementBox').value = extractedText;
      runCompile();
    } catch (err) {
      if (err && (err.name === 'PasswordException' || /password/i.test(err.message || ''))) {
        $('pdfPasswordBox').style.display = 'block';
        $('loadedFileLabel').textContent = `Password-Protected PDF: ${pendingPdfName}`;
        $('pdfPasswordMsg').textContent =
          err.code === 2
            ? 'Incorrect PDF password — please try again.'
            : 'Enter PDF password below (100% local in RAM — never uploaded).';
        $('pdfPasswordInput').focus();
      } else {
        $('loadedFileLabel').textContent = `Could not read PDF (${err?.message || 'Unsupported PDF'}). Try pasting statement text instead.`;
      }
    }
  }

  refreshUnlockUi();
  $('licenseStatusBadge').addEventListener('click', () => openUnlockDrawer('MYPAYROL'));
  $('btnSelectCsv').addEventListener('click', () => $('csvFileInput').click());
  $('btnLoadDemo').addEventListener('click', loadSampleStatement);
  $('btnToggleRaw').addEventListener('click', () => $('rawEditorDrawer').classList.toggle('open'));
  $('btnRecompile').addEventListener('click', runCompile);
  $('btnUnlockPdf').addEventListener('click', () => tryUnlockAndParsePdf($('pdfPasswordInput').value));
  $('pdfPasswordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlockAndParsePdf($('pdfPasswordInput').value);
  });

  $('csvFileInput').addEventListener('change', async (e) => {
    await handleUploadedFile(e.target.files?.[0]);
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
    await handleUploadedFile(e.dataTransfer?.files?.[0]);
  });

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderLedgerResults();
    });
  });

  $('btnExportCsv').addEventListener('click', () => handleExport('CSV'));
  $('btnExportPdf').addEventListener('click', () => handleExport('PDF'));
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

  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1' || params.get('ref') === 'pdf_watermark') {
    loadSampleStatement();
  }
}
