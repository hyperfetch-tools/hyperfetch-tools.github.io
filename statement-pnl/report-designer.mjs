/**
 * Hyperfetch Visual Drag-and-Drop Report Designer
 * Renders customizable block-ordered Live Preview, 1080px PNG Image (Canvas), and Custom-Ordered Vector PDF.
 * Zero external dependencies. Strict CSP ('self') compatible.
 */

export const DESIGN_STORAGE_KEY = 'zyk_statement_design_v1';

export const DESIGN_THEMES = {
  NAVY: { name: 'Midnight Navy', bg: '#ffffff', headerBg: '#0b1f3a', headerFg: '#ffffff', accent: '#059669', cardBg: '#f8fafc', text: '#0f172a', muted: '#64748b' },
  PASTEL: { name: 'Soft Pastel', bg: '#fffdf9', headerBg: '#ede9fe', headerFg: '#4c1d95', accent: '#db2777', cardBg: '#fdf2f8', text: '#1e1b4b', muted: '#6b7280' },
  MINT: { name: 'Fresh Mint', bg: '#ffffff', headerBg: '#064e3b', headerFg: '#ffffff', accent: '#10b981', cardBg: '#ecfdf5', text: '#064e3b', muted: '#475569' },
  MONO: { name: 'Minimal Mono', bg: '#ffffff', headerBg: '#18181b', headerFg: '#fafafa', accent: '#3f3f46', cardBg: '#f4f4f5', text: '#09090b', muted: '#71717a' },
  SUNSET: { name: 'Warm Sunset', bg: '#fffbeb', headerBg: '#7c2d12', headerFg: '#fff7ed', accent: '#ea580c', cardBg: '#ffedd5', text: '#431407', muted: '#9a3412' },
};

export const DEFAULT_BLOCKS = [
  { id: 'TITLE', label: 'Title & Period Banner', visible: true },
  { id: 'NAME', label: 'Name / Account Box', visible: true },
  { id: 'KPIS', label: 'Summary Cards (In / Out / Net)', visible: true },
  { id: 'CATEGORIES', label: 'Category Breakdown Bars', visible: true },
  { id: 'TRANSACTIONS', label: 'Top Transactions List', visible: true },
  { id: 'NOTE', label: 'Custom Note / Goal Box', visible: true },
];

export function createDefaultDesignState() {
  return {
    themeKey: 'NAVY',
    accentColor: DESIGN_THEMES.NAVY.accent,
    fontStyle: 'SANS', // 'SANS' | 'SERIF' | 'MONO'
    customNote: 'Monthly Target: Track every ringgit effortlessly.',
    blocks: DEFAULT_BLOCKS.map((b) => ({ ...b })),
  };
}

export function hexToRgbNorm(hex) {
  const clean = String(hex || '#059669').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [0.02, 0.59, 0.41];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Renders the Live Interactive Drag-and-Drop Report Canvas in the DOM.
 */
export function renderDesignerPreviewDom(container, ledger, design, handlers) {
  if (!container || !ledger) return;
  const theme = DESIGN_THEMES[design.themeKey] || DESIGN_THEMES.NAVY;
  const accent = design.accentColor || theme.accent;
  const fontFam =
    design.fontStyle === 'MONO'
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : design.fontStyle === 'SERIF'
        ? 'Georgia, "Times New Roman", serif'
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';

  container.style.background = theme.bg;
  container.style.color = theme.text;
  container.style.fontFamily = fontFam;
  container.replaceChildren();

  let dragSrcIdx = null;
  const t = ledger.totals;

  design.blocks.forEach((blk, idx) => {
    const wrap = document.createElement('div');
    wrap.className = `design-block ${blk.visible ? '' : 'is-hidden'}`;
    wrap.draggable = true;
    wrap.dataset.index = String(idx);

    wrap.addEventListener('dragstart', (e) => {
      dragSrcIdx = idx;
      wrap.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    wrap.addEventListener('dragend', () => wrap.classList.remove('dragging'));
    wrap.addEventListener('dragover', (e) => {
      e.preventDefault();
      wrap.classList.add('drag-target');
    });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drag-target'));
    wrap.addEventListener('drop', (e) => {
      e.preventDefault();
      wrap.classList.remove('drag-target');
      if (dragSrcIdx === null || dragSrcIdx === idx) return;
      handlers.onMove(dragSrcIdx, idx);
      dragSrcIdx = null;
    });

    // Block Control Bar (Drag handle + Move Up/Down for mobile + Hide/Show)
    const bar = document.createElement('div');
    bar.className = 'block-ctrl-bar';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'block-ctrl-title';
    titleSpan.textContent = `⠿ ${blk.label}`;

    const btns = document.createElement('div');
    btns.className = 'block-ctrl-btns';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'ctrl-mini-btn';
    upBtn.textContent = '↑';
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', () => handlers.onMove(idx, idx - 1));

    const dnBtn = document.createElement('button');
    dnBtn.type = 'button';
    dnBtn.className = 'ctrl-mini-btn';
    dnBtn.textContent = '↓';
    dnBtn.disabled = idx === design.blocks.length - 1;
    dnBtn.addEventListener('click', () => handlers.onMove(idx, idx + 1));

    const visBtn = document.createElement('button');
    visBtn.type = 'button';
    visBtn.className = 'ctrl-mini-btn';
    visBtn.textContent = blk.visible ? 'Hide' : 'Show';
    visBtn.addEventListener('click', () => handlers.onToggle(idx));

    btns.append(upBtn, dnBtn, visBtn);
    bar.append(titleSpan, btns);
    wrap.appendChild(bar);

    if (blk.visible) {
      const body = document.createElement('div');
      body.className = 'block-preview-body';

      if (blk.id === 'TITLE') {
        body.style.background = theme.headerBg;
        body.style.color = theme.headerFg;
        body.style.borderRadius = '8px';
        body.style.padding = '14px 16px';
        const h = document.createElement('div');
        h.style.fontWeight = '800';
        h.style.fontSize = '16px';
        h.textContent = ledger.meta.reportTitle;
        const sub = document.createElement('div');
        sub.style.fontSize = '12px';
        sub.style.opacity = '0.85';
        sub.textContent = `Period: ${ledger.meta.periodLabel} · ${t.count} Transactions`;
        body.append(h, sub);
      } else if (blk.id === 'NAME') {
        body.style.background = theme.cardBg;
        body.style.borderLeft = `4px solid ${accent}`;
        body.style.padding = '10px 14px';
        body.style.borderRadius = '6px';
        const lbl = document.createElement('div');
        lbl.style.fontSize = '11px';
        lbl.style.color = theme.muted;
        lbl.textContent = 'PREPARED FOR / ACCOUNT HOLDER';
        const val = document.createElement('div');
        val.style.fontWeight = '700';
        val.style.fontSize = '14px';
        val.textContent = ledger.meta.accountHolder;
        body.append(lbl, val);
      } else if (blk.id === 'KPIS') {
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        grid.style.gap = '8px';
        [
          ['EARNINGS', `+RM ${fmtMoney(t.totalInflow)}`, accent],
          ['SPENDING', `-RM ${fmtMoney(t.totalOutflow)}`, '#dc2626'],
          ['NET BALANCE', `RM ${fmtMoney(t.netCashflow)}`, theme.text],
        ].forEach(([k, v, col]) => {
          const c = document.createElement('div');
          c.style.background = theme.cardBg;
          c.style.padding = '10px';
          c.style.borderRadius = '8px';
          const kl = document.createElement('div');
          kl.style.fontSize = '10px';
          kl.style.color = theme.muted;
          kl.style.fontWeight = '700';
          kl.textContent = k;
          const vl = document.createElement('div');
          vl.style.fontSize = '13.5px';
          vl.style.fontWeight = '800';
          vl.style.color = col;
          vl.textContent = v;
          c.append(kl, vl);
          grid.appendChild(c);
        });
        body.appendChild(grid);
      } else if (blk.id === 'CATEGORIES') {
        const maxAmt = Math.max(1, ...ledger.categoryBreakdown.map((c) => Math.max(c.inflow, c.outflow)));
        ledger.categoryBreakdown.slice(0, 7).forEach((cat) => {
          const amt = cat.outflow > 0 ? cat.outflow : cat.inflow;
          const row = document.createElement('div');
          row.style.marginBottom = '7px';
          const top = document.createElement('div');
          top.style.display = 'flex';
          top.style.justifyContent = 'space-between';
          top.style.fontSize = '12px';
          const left = document.createElement('span');
          left.textContent = `${cat.label} (${cat.count})`;
          const right = document.createElement('strong');
          right.textContent = `RM ${fmtMoney(amt)}`;
          top.append(left, right);
          const barBg = document.createElement('div');
          barBg.style.height = '6px';
          barBg.style.background = '#e2e8f0';
          barBg.style.borderRadius = '999px';
          const barFill = document.createElement('div');
          barFill.style.height = '100%';
          barFill.style.width = `${Math.min(100, Math.round((amt / maxAmt) * 100))}%`;
          barFill.style.background = cat.group === 'INCOME' ? accent : theme.headerBg;
          barFill.style.borderRadius = '999px';
          barBg.appendChild(barFill);
          row.append(top, barBg);
          body.appendChild(row);
        });
      } else if (blk.id === 'TRANSACTIONS') {
        ledger.rows.slice(0, 6).forEach((r) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.fontSize = '12px';
          row.style.padding = '4px 0';
          row.style.borderBottom = '1px solid #e2e8f0';
          const left = document.createElement('span');
          left.textContent = `${r.date} · ${r.description.slice(0, 28)} (${r.categoryLabel})`;
          const right = document.createElement('strong');
          right.style.color = r.inflow > 0 ? accent : '#dc2626';
          right.textContent = r.inflow > 0 ? `+RM ${fmtMoney(r.inflow)}` : `-RM ${fmtMoney(r.outflow)}`;
          row.append(left, right);
          body.appendChild(row);
        });
      } else if (blk.id === 'NOTE') {
        body.style.background = theme.cardBg;
        body.style.padding = '10px 14px';
        body.style.borderRadius = '8px';
        body.style.fontSize = '12.5px';
        body.style.color = theme.muted;
        body.textContent = design.customNote || 'Monthly Note';
      }

      wrap.appendChild(body);
    }

    container.appendChild(wrap);
  });
}

/**
 * Renders the user's exact custom block order & theme to a crisp 1080px-wide PNG Blob via HTML5 Canvas.
 */
export async function exportDesignerPngBlob(ledger, design, { watermark = true } = {}) {
  const theme = DESIGN_THEMES[design.themeKey] || DESIGN_THEMES.NAVY;
  const accent = design.accentColor || theme.accent;
  const fontFam =
    design.fontStyle === 'MONO'
      ? 'ui-monospace, Consolas, monospace'
      : design.fontStyle === 'SERIF'
        ? 'Georgia, serif'
        : 'system-ui, -apple-system, Segoe UI, sans-serif';

  const W = 1080;
  const PAD = 56;
  const CW = W - PAD * 2;
  const visible = design.blocks.filter((b) => b.visible);

  // Measure height dynamically based on visible blocks
  let H = PAD;
  for (const b of visible) {
    if (b.id === 'TITLE') H += 136;
    else if (b.id === 'NAME') H += 96;
    else if (b.id === 'KPIS') H += 134;
    else if (b.id === 'CATEGORIES') H += 64 + Math.min(10, ledger.categoryBreakdown.length) * 44;
    else if (b.id === 'TRANSACTIONS') H += 64 + Math.min(8, ledger.rows.length) * 40;
    else if (b.id === 'NOTE') H += 84;
    H += 24;
  }
  if (watermark) H += 64;
  H = Math.max(400, H + PAD);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  const roundRect = (x, y, w, h, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };

  let y = PAD;
  const t = ledger.totals;

  for (const b of visible) {
    if (b.id === 'TITLE') {
      roundRect(PAD, y, CW, 126, 18, theme.headerBg);
      ctx.fillStyle = theme.headerFg;
      ctx.font = `800 32px ${fontFam}`;
      ctx.fillText(ledger.meta.reportTitle.slice(0, 44), PAD + 28, y + 54);
      ctx.globalAlpha = 0.85;
      ctx.font = `500 20px ${fontFam}`;
      ctx.fillText(`Period: ${ledger.meta.periodLabel}   |   ${t.count} Transactions`, PAD + 28, y + 94);
      ctx.globalAlpha = 1;
      y += 150;
    } else if (b.id === 'NAME') {
      roundRect(PAD, y, CW, 88, 12, theme.cardBg);
      ctx.fillStyle = accent;
      ctx.fillRect(PAD, y, 10, 88);
      ctx.fillStyle = theme.muted;
      ctx.font = `700 16px ${fontFam}`;
      ctx.fillText('PREPARED FOR / ACCOUNT HOLDER', PAD + 28, y + 32);
      ctx.fillStyle = theme.text;
      ctx.font = `800 26px ${fontFam}`;
      ctx.fillText(ledger.meta.accountHolder.slice(0, 48), PAD + 28, y + 66);
      y += 112;
    } else if (b.id === 'KPIS') {
      const cardW = (CW - 32) / 3;
      const kpis = [
        ['EARNINGS', `+RM ${fmtMoney(t.totalInflow)}`, accent],
        ['SPENDING', `-RM ${fmtMoney(t.totalOutflow)}`, '#dc2626'],
        ['NET BALANCE', `RM ${fmtMoney(t.netCashflow)}`, theme.text],
      ];
      kpis.forEach(([lbl, val, col], idx) => {
        const cx = PAD + idx * (cardW + 16);
        roundRect(cx, y, cardW, 120, 14, theme.cardBg);
        ctx.fillStyle = theme.muted;
        ctx.font = `700 17px ${fontFam}`;
        ctx.fillText(lbl, cx + 22, y + 40);
        ctx.fillStyle = col;
        ctx.font = `800 28px ${fontFam}`;
        ctx.fillText(val, cx + 22, y + 86);
      });
      y += 144;
    } else if (b.id === 'CATEGORIES') {
      const cats = ledger.categoryBreakdown.slice(0, 10);
      const boxH = 58 + cats.length * 44;
      roundRect(PAD, y, CW, boxH, 14, theme.cardBg);
      ctx.fillStyle = theme.text;
      ctx.font = `800 22px ${fontFam}`;
      ctx.fillText('CATEGORY BREAKDOWN', PAD + 24, y + 38);
      const maxAmt = Math.max(1, ...cats.map((c) => Math.max(c.inflow, c.outflow)));
      let cy = y + 72;
      cats.forEach((c) => {
        const amt = c.outflow > 0 ? c.outflow : c.inflow;
        ctx.fillStyle = theme.text;
        ctx.font = `600 18px ${fontFam}`;
        ctx.fillText(`${c.label.slice(0, 32)} (${c.count})`, PAD + 24, cy);
        const amtText = `RM ${fmtMoney(amt)}`;
        ctx.textAlign = 'right';
        ctx.fillText(amtText, PAD + CW - 24, cy);
        ctx.textAlign = 'left';
        roundRect(PAD + 24, cy + 10, CW - 48, 10, 5, '#e2e8f0');
        const fillW = Math.max(12, Math.round(((CW - 48) * amt) / maxAmt));
        roundRect(PAD + 24, cy + 10, fillW, 10, 5, c.group === 'INCOME' ? accent : theme.headerBg);
        cy += 44;
      });
      y += boxH + 24;
    } else if (b.id === 'TRANSACTIONS') {
      const rows = ledger.rows.slice(0, 8);
      const boxH = 58 + rows.length * 40;
      roundRect(PAD, y, CW, boxH, 14, theme.cardBg);
      ctx.fillStyle = theme.text;
      ctx.font = `800 22px ${fontFam}`;
      ctx.fillText('RECENT TRANSACTIONS', PAD + 24, y + 38);
      let ry = y + 72;
      rows.forEach((r) => {
        ctx.fillStyle = theme.text;
        ctx.font = `500 17px ${fontFam}`;
        ctx.fillText(`${r.date}  ${r.description.slice(0, 34)} · ${r.categoryLabel.slice(0, 18)}`, PAD + 24, ry);
        ctx.fillStyle = r.inflow > 0 ? accent : '#dc2626';
        ctx.font = `700 18px ${fontFam}`;
        ctx.textAlign = 'right';
        ctx.fillText(r.inflow > 0 ? `+RM ${fmtMoney(r.inflow)}` : `-RM ${fmtMoney(r.outflow)}`, PAD + CW - 24, ry);
        ctx.textAlign = 'left';
        ry += 40;
      });
      y += boxH + 24;
    } else if (b.id === 'NOTE') {
      roundRect(PAD, y, CW, 76, 12, theme.cardBg);
      ctx.fillStyle = theme.muted;
      ctx.font = `600 19px ${fontFam}`;
      ctx.fillText(String(design.customNote || '').slice(0, 74), PAD + 24, y + 46);
      y += 100;
    }
  }

  if (watermark) {
    roundRect(PAD, H - 72, CW, 44, 10, '#ecfdf5');
    ctx.fillStyle = '#047857';
    ctx.font = `700 17px ${fontFam}`;
    ctx.fillText('Made free with Hyperfetch Statement Studio · hyperfetch-tools.github.io/statement-pnl', PAD + 20, H - 44);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
