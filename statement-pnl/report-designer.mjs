/**
 * Hyperfetch Fully-Editable Visual Report Designer
 * Supports custom backgrounds (solid, gradient, grid, dots, uploaded wallpaper + dimmer),
 * custom uploaded image/logo/sticker assets, custom text blocks, dividers, card styling,
 * drag-and-drop / mobile ↑↓ reordering, 1080px / IG-Story 9:16 PNG export, and ordered PDF export.
 * Zero external dependencies. Strict CSP ('self', img-src 'self' data: blob:) compatible.
 */

export const DESIGN_STORAGE_KEY = 'zyk_statement_design_v2';

export const DESIGN_THEMES = {
  NAVY: { name: 'Midnight Navy', bg: '#ffffff', bg2: '#e2e8f0', headerBg: '#0b1f3a', headerFg: '#ffffff', accent: '#059669', cardBg: '#f8fafc', text: '#0f172a', muted: '#64748b' },
  PASTEL: { name: 'Soft Pastel', bg: '#fffdf9', bg2: '#fce7f3', headerBg: '#ede9fe', headerFg: '#4c1d95', accent: '#db2777', cardBg: '#fdf2f8', text: '#1e1b4b', muted: '#6b7280' },
  MINT: { name: 'Fresh Mint', bg: '#ffffff', bg2: '#d1fae5', headerBg: '#064e3b', headerFg: '#ffffff', accent: '#10b981', cardBg: '#ecfdf5', text: '#064e3b', muted: '#475569' },
  MONO: { name: 'Minimal Mono', bg: '#ffffff', bg2: '#e4e4e7', headerBg: '#18181b', headerFg: '#fafafa', accent: '#3f3f46', cardBg: '#f4f4f5', text: '#09090b', muted: '#71717a' },
  SUNSET: { name: 'Warm Sunset', bg: '#fffbeb', bg2: '#fed7aa', headerBg: '#7c2d12', headerFg: '#fff7ed', accent: '#ea580c', cardBg: '#ffedd5', text: '#431407', muted: '#9a3412' },
};

export const DEFAULT_BLOCKS = [
  { id: 'TITLE', kind: 'BUILTIN', label: 'Title & Period Banner', visible: true },
  { id: 'NAME', kind: 'BUILTIN', label: 'Name / Account Box', visible: true },
  { id: 'KPIS', kind: 'BUILTIN', label: 'Summary Cards (In / Out / Net)', visible: true },
  { id: 'CATEGORIES', kind: 'BUILTIN', label: 'Category Breakdown Bars', visible: true },
  { id: 'TRANSACTIONS', kind: 'BUILTIN', label: 'Top Transactions List', visible: true },
  { id: 'NOTE', kind: 'BUILTIN', label: 'Custom Note / Goal Box', visible: true },
];

export function createDefaultDesignState() {
  const t = DESIGN_THEMES.NAVY;
  return {
    themeKey: 'NAVY',
    bgType: 'SOLID', // 'SOLID' | 'GRADIENT' | 'DOTS' | 'GRID' | 'IMAGE'
    bgColor: t.bg,
    bgColor2: t.bg2,
    bgImageDataUrl: '',
    bgOverlayOpacity: 0.15,
    cardBgColor: t.cardBg,
    cardOpacity: 0.94,
    cardRadius: 12,
    textColor: t.text,
    accentColor: t.accent,
    fontStyle: 'SANS', // 'SANS' | 'SERIF' | 'MONO'
    canvasFormat: 'REPORT', // 'REPORT' | 'STORY'
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

export function hexToRgba(hex, alpha = 1) {
  const [r, g, b] = hexToRgbNorm(hex).map((v) => Math.round(v * 255));
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, Number(alpha) || 0)).toFixed(2)})`;
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Downscales an uploaded File (logo, sticker, or wallpaper) into a clean compressed Data URL in RAM.
 */
export function readAndCompressImageFile(file, maxDim = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = /png|webp/i.test(file.type || '');
        resolve(c.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.86));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function applyPreviewBackground(container, design, theme) {
  const bg1 = design.bgColor || theme.bg;
  const bg2 = design.bgColor2 || theme.bg2;
  container.style.backgroundColor = bg1;
  container.style.backgroundImage = 'none';
  container.style.backgroundSize = 'auto';

  if (design.bgType === 'GRADIENT') {
    container.style.backgroundImage = `linear-gradient(155deg, ${bg1} 0%, ${bg2} 100%)`;
  } else if (design.bgType === 'DOTS') {
    container.style.backgroundImage = `radial-gradient(${hexToRgba(design.accentColor || theme.accent, 0.25)} 1.5px, transparent 1.5px)`;
    container.style.backgroundSize = '18px 18px';
  } else if (design.bgType === 'GRID') {
    const lineCol = hexToRgba(design.textColor || theme.text, 0.08);
    container.style.backgroundImage = `linear-gradient(${lineCol} 1px, transparent 1px), linear-gradient(90deg, ${lineCol} 1px, transparent 1px)`;
    container.style.backgroundSize = '22px 22px';
  } else if (design.bgType === 'IMAGE' && design.bgImageDataUrl) {
    const dim = hexToRgba(bg1, design.bgOverlayOpacity ?? 0.2);
    container.style.backgroundImage = `linear-gradient(${dim}, ${dim}), url("${design.bgImageDataUrl}")`;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
  }
}

/**
 * Renders the Live Interactive Drag-and-Drop Report Canvas in the DOM.
 */
export function renderDesignerPreviewDom(container, ledger, design, handlers) {
  if (!container || !ledger) return;
  const theme = DESIGN_THEMES[design.themeKey] || DESIGN_THEMES.NAVY;
  const accent = design.accentColor || theme.accent;
  const textCol = design.textColor || theme.text;
  const cardFill = hexToRgba(design.cardBgColor || theme.cardBg, design.cardOpacity ?? 0.94);
  const radius = `${Number(design.cardRadius ?? 12)}px`;
  const fontFam =
    design.fontStyle === 'MONO'
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : design.fontStyle === 'SERIF'
        ? 'Georgia, "Times New Roman", serif'
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';

  applyPreviewBackground(container, design, theme);
  container.style.color = textCol;
  container.style.fontFamily = fontFam;
  container.style.maxWidth = design.canvasFormat === 'STORY' ? '430px' : '680px';
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

    if (blk.kind === 'CUSTOM') {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'ctrl-mini-btn';
      delBtn.style.color = '#b91c1c';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => handlers.onDelete(idx));
      btns.appendChild(delBtn);
    }

    bar.append(titleSpan, btns);
    wrap.appendChild(bar);

    if (blk.visible) {
      const body = document.createElement('div');
      body.className = 'block-preview-body';

      if (blk.id === 'TITLE') {
        body.style.background = theme.headerBg;
        body.style.color = theme.headerFg;
        body.style.borderRadius = radius;
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
        body.style.background = cardFill;
        body.style.borderLeft = `4px solid ${accent}`;
        body.style.padding = '10px 14px';
        body.style.borderRadius = radius;
        const lbl = document.createElement('div');
        lbl.style.fontSize = '11px';
        lbl.style.opacity = '0.7';
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
          ['NET BALANCE', `RM ${fmtMoney(t.netCashflow)}`, textCol],
        ].forEach(([k, v, col]) => {
          const c = document.createElement('div');
          c.style.background = cardFill;
          c.style.padding = '10px';
          c.style.borderRadius = radius;
          const kl = document.createElement('div');
          kl.style.fontSize = '10px';
          kl.style.opacity = '0.7';
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
        body.style.background = cardFill;
        body.style.padding = '12px';
        body.style.borderRadius = radius;
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
          barBg.style.background = 'rgba(148,163,184,0.3)';
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
        body.style.background = cardFill;
        body.style.padding = '12px';
        body.style.borderRadius = radius;
        ledger.rows.slice(0, 6).forEach((r) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.fontSize = '12px';
          row.style.padding = '4px 0';
          row.style.borderBottom = '1px solid rgba(148,163,184,0.25)';
          const left = document.createElement('span');
          left.textContent = `${r.date} · ${r.description.slice(0, 28)} (${r.categoryLabel})`;
          const right = document.createElement('strong');
          right.style.color = r.inflow > 0 ? accent : '#dc2626';
          right.textContent = r.inflow > 0 ? `+RM ${fmtMoney(r.inflow)}` : `-RM ${fmtMoney(r.outflow)}`;
          row.append(left, right);
          body.appendChild(row);
        });
      } else if (blk.id === 'NOTE') {
        body.style.background = cardFill;
        body.style.padding = '10px 14px';
        body.style.borderRadius = radius;
        body.style.fontSize = '12.5px';
        body.textContent = design.customNote || 'Monthly Note';
      } else if (blk.type === 'CUSTOM_TEXT') {
        body.style.background = cardFill;
        body.style.padding = '10px 14px';
        body.style.borderRadius = radius;
        body.style.textAlign = blk.align || 'left';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = blk.text || '';
        inp.style.width = '100%';
        inp.style.border = '0';
        inp.style.background = 'transparent';
        inp.style.color = textCol;
        inp.style.fontWeight = '700';
        inp.style.fontSize = '14px';
        inp.style.textAlign = blk.align || 'left';
        inp.addEventListener('input', () => handlers.onUpdateCustom(idx, { text: inp.value }));
        body.appendChild(inp);
      } else if (blk.type === 'CUSTOM_IMAGE' && blk.imageDataUrl) {
        body.style.textAlign = blk.align || 'center';
        body.style.padding = '4px 0';
        const img = document.createElement('img');
        img.src = blk.imageDataUrl;
        img.alt = blk.label;
        img.style.maxHeight = `${blk.sizePx || 88}px`;
        img.style.maxWidth = '100%';
        img.style.borderRadius = radius;
        body.appendChild(img);
      } else if (blk.type === 'CUSTOM_DIVIDER') {
        const hr = document.createElement('div');
        hr.style.height = '2px';
        hr.style.background = hexToRgba(accent, 0.45);
        hr.style.margin = '4px 0';
        body.appendChild(hr);
      }

      wrap.appendChild(body);
    }

    container.appendChild(wrap);
  });
}

function loadImageElement(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Renders the user's exact custom background, uploaded assets, block order & styling to a crisp PNG Blob.
 */
export async function exportDesignerPngBlob(ledger, design, { watermark = true } = {}) {
  const theme = DESIGN_THEMES[design.themeKey] || DESIGN_THEMES.NAVY;
  const accent = design.accentColor || theme.accent;
  const textCol = design.textColor || theme.text;
  const bg1 = design.bgColor || theme.bg;
  const bg2 = design.bgColor2 || theme.bg2;
  const cardFill = hexToRgba(design.cardBgColor || theme.cardBg, design.cardOpacity ?? 0.94);
  const r = Number(design.cardRadius ?? 12);
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

  // Preload background image & any custom asset images
  const bgImg = design.bgType === 'IMAGE' ? await loadImageElement(design.bgImageDataUrl) : null;
  const customImgs = new Map();
  for (const b of visible) {
    if (b.type === 'CUSTOM_IMAGE' && b.imageDataUrl) {
      customImgs.set(b.id, await loadImageElement(b.imageDataUrl));
    }
  }

  let H = PAD;
  for (const b of visible) {
    if (b.id === 'TITLE') H += 136;
    else if (b.id === 'NAME') H += 96;
    else if (b.id === 'KPIS') H += 134;
    else if (b.id === 'CATEGORIES') H += 64 + Math.min(10, ledger.categoryBreakdown.length) * 44;
    else if (b.id === 'TRANSACTIONS') H += 64 + Math.min(8, ledger.rows.length) * 40;
    else if (b.id === 'NOTE' || b.type === 'CUSTOM_TEXT') H += 84;
    else if (b.type === 'CUSTOM_IMAGE') H += Math.round((b.sizePx || 88) * 1.45) + 20;
    else if (b.type === 'CUSTOM_DIVIDER') H += 22;
    H += 22;
  }
  if (watermark) H += 64;
  H = design.canvasFormat === 'STORY' ? Math.max(1920, H + PAD) : Math.max(460, H + PAD);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Paint customizable background
  ctx.fillStyle = bg1;
  ctx.fillRect(0, 0, W, H);
  if (design.bgType === 'GRADIENT') {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, bg1);
    grad.addColorStop(1, bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (design.bgType === 'DOTS') {
    ctx.fillStyle = hexToRgba(accent, 0.25);
    for (let dx = 18; dx < W; dx += 32) {
      for (let dy = 18; dy < H; dy += 32) {
        ctx.beginPath();
        ctx.arc(dx, dy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (design.bgType === 'GRID') {
    ctx.strokeStyle = hexToRgba(textCol, 0.08);
    ctx.lineWidth = 1.5;
    for (let gx = 0; gx < W; gx += 36) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 36) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
  } else if (design.bgType === 'IMAGE' && bgImg) {
    const scale = Math.max(W / bgImg.width, H / bgImg.height);
    const dw = bgImg.width * scale;
    const dh = bgImg.height * scale;
    ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = hexToRgba(bg1, design.bgOverlayOpacity ?? 0.2);
    ctx.fillRect(0, 0, W, H);
  }

  const roundRect = (x, y, w, h, rad, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rad);
    ctx.fill();
  };

  let y = PAD;
  const t = ledger.totals;

  for (const b of visible) {
    if (b.id === 'TITLE') {
      roundRect(PAD, y, CW, 126, r + 4, theme.headerBg);
      ctx.fillStyle = theme.headerFg;
      ctx.font = `800 32px ${fontFam}`;
      ctx.fillText(ledger.meta.reportTitle.slice(0, 44), PAD + 28, y + 54);
      ctx.globalAlpha = 0.85;
      ctx.font = `500 20px ${fontFam}`;
      ctx.fillText(`Period: ${ledger.meta.periodLabel}   |   ${t.count} Transactions`, PAD + 28, y + 94);
      ctx.globalAlpha = 1;
      y += 148;
    } else if (b.id === 'NAME') {
      roundRect(PAD, y, CW, 88, r, cardFill);
      ctx.fillStyle = accent;
      ctx.fillRect(PAD, y, 10, 88);
      ctx.fillStyle = theme.muted;
      ctx.font = `700 16px ${fontFam}`;
      ctx.fillText('PREPARED FOR / ACCOUNT HOLDER', PAD + 28, y + 32);
      ctx.fillStyle = textCol;
      ctx.font = `800 26px ${fontFam}`;
      ctx.fillText(ledger.meta.accountHolder.slice(0, 48), PAD + 28, y + 66);
      y += 110;
    } else if (b.id === 'KPIS') {
      const cardW = (CW - 32) / 3;
      const kpis = [
        ['EARNINGS', `+RM ${fmtMoney(t.totalInflow)}`, accent],
        ['SPENDING', `-RM ${fmtMoney(t.totalOutflow)}`, '#dc2626'],
        ['NET BALANCE', `RM ${fmtMoney(t.netCashflow)}`, textCol],
      ];
      kpis.forEach(([lbl, val, col], idx) => {
        const cx = PAD + idx * (cardW + 16);
        roundRect(cx, y, cardW, 120, r, cardFill);
        ctx.fillStyle = theme.muted;
        ctx.font = `700 17px ${fontFam}`;
        ctx.fillText(lbl, cx + 22, y + 40);
        ctx.fillStyle = col;
        ctx.font = `800 28px ${fontFam}`;
        ctx.fillText(val, cx + 22, y + 86);
      });
      y += 142;
    } else if (b.id === 'CATEGORIES') {
      const cats = ledger.categoryBreakdown.slice(0, 10);
      const boxH = 58 + cats.length * 44;
      roundRect(PAD, y, CW, boxH, r, cardFill);
      ctx.fillStyle = textCol;
      ctx.font = `800 22px ${fontFam}`;
      ctx.fillText('CATEGORY BREAKDOWN', PAD + 24, y + 38);
      const maxAmt = Math.max(1, ...cats.map((c) => Math.max(c.inflow, c.outflow)));
      let cy = y + 72;
      cats.forEach((c) => {
        const amt = c.outflow > 0 ? c.outflow : c.inflow;
        ctx.fillStyle = textCol;
        ctx.font = `600 18px ${fontFam}`;
        ctx.fillText(`${c.label.slice(0, 32)} (${c.count})`, PAD + 24, cy);
        ctx.textAlign = 'right';
        ctx.fillText(`RM ${fmtMoney(amt)}`, PAD + CW - 24, cy);
        ctx.textAlign = 'left';
        roundRect(PAD + 24, cy + 10, CW - 48, 10, 5, 'rgba(148,163,184,0.35)');
        const fillW = Math.max(12, Math.round(((CW - 48) * amt) / maxAmt));
        roundRect(PAD + 24, cy + 10, fillW, 10, 5, c.group === 'INCOME' ? accent : theme.headerBg);
        cy += 44;
      });
      y += boxH + 22;
    } else if (b.id === 'TRANSACTIONS') {
      const rows = ledger.rows.slice(0, 8);
      const boxH = 58 + rows.length * 40;
      roundRect(PAD, y, CW, boxH, r, cardFill);
      ctx.fillStyle = textCol;
      ctx.font = `800 22px ${fontFam}`;
      ctx.fillText('RECENT TRANSACTIONS', PAD + 24, y + 38);
      let ry = y + 72;
      rows.forEach((rItem) => {
        ctx.fillStyle = textCol;
        ctx.font = `500 17px ${fontFam}`;
        ctx.fillText(`${rItem.date}  ${rItem.description.slice(0, 34)} · ${rItem.categoryLabel.slice(0, 18)}`, PAD + 24, ry);
        ctx.fillStyle = rItem.inflow > 0 ? accent : '#dc2626';
        ctx.font = `700 18px ${fontFam}`;
        ctx.textAlign = 'right';
        ctx.fillText(rItem.inflow > 0 ? `+RM ${fmtMoney(rItem.inflow)}` : `-RM ${fmtMoney(rItem.outflow)}`, PAD + CW - 24, ry);
        ctx.textAlign = 'left';
        ry += 40;
      });
      y += boxH + 22;
    } else if (b.id === 'NOTE' || b.type === 'CUSTOM_TEXT') {
      const txtVal = b.id === 'NOTE' ? String(design.customNote || '') : String(b.text || '');
      roundRect(PAD, y, CW, 76, r, cardFill);
      ctx.fillStyle = textCol;
      ctx.font = `700 21px ${fontFam}`;
      ctx.fillText(txtVal.slice(0, 74), PAD + 24, y + 46);
      y += 98;
    } else if (b.type === 'CUSTOM_IMAGE') {
      const imgEl = customImgs.get(b.id);
      if (imgEl) {
        const targetH = Math.round((b.sizePx || 88) * 1.45);
        const targetW = Math.min(CW, Math.round((imgEl.width / Math.max(1, imgEl.height)) * targetH));
        const ix = b.align === 'left' ? PAD : b.align === 'right' ? PAD + CW - targetW : PAD + (CW - targetW) / 2;
        ctx.drawImage(imgEl, ix, y, targetW, targetH);
        y += targetH + 22;
      }
    } else if (b.type === 'CUSTOM_DIVIDER') {
      roundRect(PAD, y + 6, CW, 4, 2, hexToRgba(accent, 0.55));
      y += 26;
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
