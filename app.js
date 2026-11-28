const _u = 'https://qsunggfjeuexjenusxpb.supabase.co';
const _k = 'sb_publishable_inQHU8anxLvyQpCK1lzLnA_wGn3qswJ';
const db = window.supabase.createClient(_u, _k);

const K_TX = 'shop_app_tx_v2';
const K_NAME = 'shop_app_name_v2';

const st = {
  shopName: localStorage.getItem(K_NAME) || 'ร้านของฉัน',
  txs: JSON.parse(localStorage.getItem(K_TX) || '[]'),
  tab: 'dashboard', dashP: 'today',
  saleDate: localDate(), pay: 'cash',
  expDate: localDate(), cat: 'cost',
  histP: 'today', histT: 'all', busy: false
};

const $ = (id) => document.getElementById(id);
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return localDate(d); }
function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n); return localDate(dt); }
function thDate(s) { if (!s) return '-'; const [y, m, d] = s.split('-').map(Number); return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y + 543).slice(-2)}`; }
function thFullToday() {
  const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const n = new Date();
  return `วัน${days[n.getDay()]}ที่ ${n.getDate()} ${months[n.getMonth()]} ${n.getFullYear() + 543}`;
}
function money(n) { return (Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 }); }
function esc(s) { return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid() { return 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

let tTimer;
function toast(msg, err = false) {
  const el = $('toast'); $('toast-msg').textContent = msg;
  el.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] px-4 py-2.5 rounded-full text-white text-xs font-medium shadow-xl ${err ? 'bg-rose-600' : 'bg-slate-900/95'}`;
  clearTimeout(tTimer); tTimer = setTimeout(() => el.classList.add('hidden'), 2300);
}

function saveCache() {
  try { localStorage.setItem(K_TX, JSON.stringify(st.txs)); localStorage.setItem(K_NAME, st.shopName); } catch (e) {}
}

async function refreshData(notify = false) {
  if (st.busy) return; st.busy = true;
  const ic = $('refresh-icon'); if (ic) ic.classList.add('animate-spin');
  try {
    const [r1, r2] = await Promise.all([
      db.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      db.from('app_settings').select('value').eq('key', 'shop_name').maybeSingle()
    ]);
    if (r1.error) throw r1.error; if (r2.error) throw r2.error;
    st.txs = (r1.data || []).map((x) => ({ ...x, amount: Number(x.amount) || 0, note: x.note || '' }));
    if (r2.data && r2.data.value) st.shopName = r2.data.value;
    saveCache(); renderAll();
    if (notify) toast('อัปเดตข้อมูลล่าสุดแล้ว');
  } catch (e) {
    if (notify) toast('ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้', true);
  } finally {
    st.busy = false;
    if (ic) ic.classList.remove('animate-spin');
  }
}

function goTab(t) {
  st.tab = t;
  ['dashboard', 'sales', 'expenses', 'history'].forEach((x) => $('tab-' + x).classList.toggle('hidden', x !== t));
  document.querySelectorAll('.nav-btn').forEach((b) => {
    const a = b.dataset.nav === t;
    const activeCls = t === 'expenses' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600';
    b.className = 'nav-btn flex flex-col items-center gap-0.5 py-2 rounded-2xl transition ' + (a ? activeCls : 'text-slate-400');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' }); renderAll();
}

function filterP(list, p, cDate = '') {
  const td = localDate(), yd = yesterday(), ym = td.slice(0, 7);
  if (p === 'today') return list.filter((x) => x.date === td);
  if (p === 'yesterday') return list.filter((x) => x.date === yd);
  if (p === 'month') return list.filter((x) => x.date && x.date.startsWith(ym));
  if (p === 'custom' && cDate) return list.filter((x) => x.date === cDate);
  return list;
}

function setDashP(p) { st.dashP = p; renderDash(); }
function renderDash() {
  document.querySelectorAll('.dash-p').forEach((b) => {
    b.className = 'dash-p py-2 rounded-xl text-xs font-semibold transition ' +
      (b.dataset.p === st.dashP ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500');
  });
  const list = filterP(st.txs, st.dashP);
  const sL = list.filter((x) => x.type === 'sale'), eL = list.filter((x) => x.type === 'expense');
  const sSum = sL.reduce((a, b) => a + b.amount, 0), eSum = eL.reduce((a, b) => a + b.amount, 0);
  const prof = sSum - eSum, mar = sSum > 0 ? Math.round((prof / sSum) * 100) : 0;

  $('d-card').className = 'relative overflow-hidden rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br ' +
    (prof >= 0 ? 'shadow-emerald-600/20 from-emerald-500 via-emerald-600 to-teal-700' : 'shadow-rose-600/20 from-rose-500 via-rose-600 to-red-700');
  const lbs = { today: 'กำไรสุทธิวันนี้', yesterday: 'กำไรสุทธิเมื่อวาน', month: 'กำไรสุทธิเดือนนี้', all: 'กำไรสุทธิทั้งหมด' };
  const subs = { today: `ประจำวันที่ ${thDate(localDate())}`, yesterday: `ประจำวันที่ ${thDate(yesterday())}`, month: 'สรุปประจำเดือนนี้', all: 'รวมทุกวันที่มีบันทึก' };
  $('d-label').textContent = lbs[st.dashP]; $('d-sub').textContent = subs[st.dashP];
  $('d-profit').textContent = (prof > 0 ? '+' : '') + money(prof);
  $('d-margin').textContent = prof >= 0 ? `กำไร ${mar}%` : 'ขาดทุน';
  $('d-count').textContent = `${list.length} รายการ`;
  $('d-sales').textContent = money(sSum); $('d-exp').textContent = money(eSum);

  const cash = sL.filter((x) => x.payment_method !== 'transfer').reduce((a, b) => a + b.amount, 0);
  const tr = sL.filter((x) => x.payment_method === 'transfer').reduce((a, b) => a + b.amount, 0);
  const cp = sSum > 0 ? (cash / sSum) * 100 : 50;
  $('d-cash').textContent = money(cash) + ' ฿'; $('d-trans').textContent = money(tr) + ' ฿';
  $('bar-cash').style.width = cp + '%'; $('bar-trans').style.width = (100 - cp) + '%';

  const cost = eL.filter((x) => x.category !== 'other').reduce((a, b) => a + b.amount, 0);
  const oth = eL.filter((x) => x.category === 'other').reduce((a, b) => a + b.amount, 0);
  const ep = eSum > 0 ? (cost / eSum) * 100 : 50;
  $('d-cost').textContent = money(cost) + ' ฿'; $('d-other').textContent = money(oth) + ' ฿';
  $('bar-cost').style.width = ep + '%'; $('bar-other').style.width = (100 - ep) + '%';

  $('d-recent').innerHTML = list.length ? list.slice(0, 5).map((x) => rowHtml(x, false, false)).join('') : '<div class="py-8 text-center text-xs text-slate-400">ยังไม่มีรายการ</div>';
  lucide.createIcons();
}

function shiftDate(t, n) { if (t === 'sale') { st.saleDate = addDays(st.saleDate, n); renderSales(); } else { st.expDate = addDays(st.expDate, n); renderExp(); } }
function todayDate(t) { if (t === 'sale') { st.saleDate = localDate(); renderSales(); } else { st.expDate = localDate(); renderExp(); } }
function pickDate(t) { if (t === 'sale') { st.saleDate = $('s-date').value || localDate(); renderSales(); } else { st.expDate = $('e-date').value || localDate(); renderExp(); } }

function setPay(m) {
  st.pay = m;
  $('pay-cash').className = 'py-2.5 rounded-2xl border-2 text-sm font-semibold transition ' + (m === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500');
  $('pay-trans').className = 'py-2.5 rounded-2xl border-2 text-sm font-semibold transition ' + (m === 'transfer' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500');
}
function presetSale(t) { $('s-title').value = t; if (!$('s-amt').value) $('s-amt').focus(); }
function resetSale() {
  $('s-id').value = ''; $('s-amt').value = ''; $('s-title').value = ''; $('s-note').value = '';
  $('s-heading').textContent = 'เพิ่มยอดขาย'; $('s-btn-txt').textContent = 'บันทึกยอดขาย';
  $('s-cancel').classList.add('hidden'); setPay('cash');
}

async function saveSale(e) {
  e.preventDefault();
  const amount = parseFloat($('s-amt').value), title = $('s-title').value.trim(), note = $('s-note').value.trim(), id = $('s-id').value;
  if (!amount || amount <= 0 || !title) return toast('กรุณากรอกข้อมูลให้ครบ', true);
  $('s-btn').disabled = true;
  try {
    if (id) {
      const i = st.txs.findIndex((x) => x.id === id);
      const u = { ...st.txs[i], date: st.saleDate, title, amount, payment_method: st.pay, note };
      const { error } = await db.from('transactions').update({ date: u.date, title, amount, payment_method: st.pay, note }).eq('id', id);
      if (error) throw error; st.txs[i] = u; toast('แก้ไขรายการเรียบร้อย');
    } else {
      const n = { id: uid(), type: 'sale', date: st.saleDate, title, amount, payment_method: st.pay, category: null, note, created_at: new Date().toISOString() };
      const { error } = await db.from('transactions').insert([n]);
      if (error) throw error; st.txs.unshift(n); toast('บันทึกยอดขายเรียบร้อย');
    }
    saveCache(); resetSale(); renderAll();
  } catch (err) { toast('บันทึกไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต', true); }
  finally { $('s-btn').disabled = false; }
}

function renderSales() {
  $('s-date').value = st.saleDate;
  const list = st.txs.filter((x) => x.type === 'sale' && x.date === st.saleDate);
  $('s-total').textContent = money(list.reduce((a, b) => a + b.amount, 0));
  $('s-count').textContent = `${list.length} รายการ`;
  $('s-cash').textContent = money(list.filter((x) => x.payment_method !== 'transfer').reduce((a, b) => a + b.amount, 0)) + ' ฿';
  $('s-trans').textContent = money(list.filter((x) => x.payment_method === 'transfer').reduce((a, b) => a + b.amount, 0)) + ' ฿';
  $('s-list').innerHTML = list.length ? list.map((x) => rowHtml(x, true, false)).join('') : `<div class="py-8 text-center text-xs text-slate-400">ยังไม่มียอดขายวันที่ ${thDate(st.saleDate)}</div>`;
  lucide.createIcons();
}

function setCat(c) {
  st.cat = c;
  $('cat-cost').className = 'py-2.5 rounded-2xl border-2 text-sm font-semibold transition ' + (c === 'cost' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500');
  $('cat-other').className = 'py-2.5 rounded-2xl border-2 text-sm font-semibold transition ' + (c === 'other' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500');
}
function presetExp(t, c) { $('e-title').value = t; setCat(c); if (!$('e-amt').value) $('e-amt').focus(); }
function resetExp() {
  $('e-id').value = ''; $('e-amt').value = ''; $('e-title').value = ''; $('e-note').value = '';
  $('e-heading').textContent = 'เพิ่มต้นทุน / ยอดจ่าย'; $('e-btn-txt').textContent = 'บันทึกยอดจ่าย';
  $('e-cancel').classList.add('hidden'); setCat('cost');
}

async function saveExp(e) {
  e.preventDefault();
  const amount = parseFloat($('e-amt').value), title = $('e-title').value.trim(), note = $('e-note').value.trim(), id = $('e-id').value;
  if (!amount || amount <= 0 || !title) return toast('กรุณากรอกข้อมูลให้ครบ', true);
  $('e-btn').disabled = true;
  try {
    if (id) {
      const i = st.txs.findIndex((x) => x.id === id);
      const u = { ...st.txs[i], date: st.expDate, title, amount, category: st.cat, note };
      const { error } = await db.from('transactions').update({ date: u.date, title, amount, category: st.cat, note }).eq('id', id);
      if (error) throw error; st.txs[i] = u; toast('แก้ไขรายการเรียบร้อย');
    } else {
      const n = { id: uid(), type: 'expense', date: st.expDate, title, amount, payment_method: null, category: st.cat, note, created_at: new Date().toISOString() };
      const { error } = await db.from('transactions').insert([n]);
      if (error) throw error; st.txs.unshift(n); toast('บันทึกยอดจ่ายเรียบร้อย');
    }
    saveCache(); resetExp(); renderAll();
  } catch (err) { toast('บันทึกไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต', true); }
  finally { $('e-btn').disabled = false; }
}

function renderExp() {
  $('e-date').value = st.expDate;
  const list = st.txs.filter((x) => x.type === 'expense' && x.date === st.expDate);
  $('e-total').textContent = money(list.reduce((a, b) => a + b.amount, 0));
  $('e-count').textContent = `${list.length} รายการ`;
  $('e-cost').textContent = money(list.filter((x) => x.category !== 'other').reduce((a, b) => a + b.amount, 0)) + ' ฿';
  $('e-other').textContent = money(list.filter((x) => x.category === 'other').reduce((a, b) => a + b.amount, 0)) + ' ฿';
  $('e-list').innerHTML = list.length ? list.map((x) => rowHtml(x, true, false)).join('') : `<div class="py-8 text-center text-xs text-slate-400">ยังไม่มียอดจ่ายวันที่ ${thDate(st.expDate)}</div>`;
  lucide.createIcons();
}

function setHistP(p) {
  st.histP = p; $('h-cdate-wrap').classList.toggle('hidden', p !== 'custom');
  if (p === 'custom' && !$('h-cdate').value) $('h-cdate').value = localDate();
  renderHist();
}
function setHistT(t) { st.histT = t; renderHist(); }
function renderHist() {
  document.querySelectorAll('.hist-p').forEach((b) => {
    b.className = 'hist-p px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ' + (b.dataset.p === st.histP ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500');
  });
  document.querySelectorAll('.hist-t').forEach((b) => {
    b.className = 'hist-t py-1.5 rounded-xl text-xs font-semibold ' + (b.dataset.t === st.histT ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500');
  });
  let list = filterP(st.txs, st.histP, $('h-cdate').value);
  if (st.histT !== 'all') list = list.filter((x) => x.type === st.histT);
  const q = $('h-search').value.trim().toLowerCase();
  if (q) list = list.filter((x) => (x.title || '').toLowerCase().includes(q) || (x.note || '').toLowerCase().includes(q));

  const sS = list.filter((x) => x.type === 'sale').reduce((a, b) => a + b.amount, 0);
  const eS = list.filter((x) => x.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const net = sS - eS;
  $('h-sales').textContent = money(sS); $('h-exp').textContent = money(eS);
  $('h-net').textContent = (net > 0 ? '+' : '') + money(net);
  $('h-net').className = 'text-base font-bold mt-0.5 truncate ' + (net >= 0 ? 'text-emerald-600' : 'text-rose-600');
  $('h-count').textContent = `${list.length} รายการ`;
  $('h-list').innerHTML = list.length ? list.map((x) => rowHtml(x, true, true)).join('') : '<div class="py-8 text-center text-xs text-slate-400">ไม่พบรายการ</div>';
  lucide.createIcons();
}

function rowHtml(tx, acts, showD) {
  const s = tx.type === 'sale';
  const tag = s ? (tx.payment_method === 'transfer' ? 'โอนเงิน' : 'เงินสด') : (tx.category === 'other' ? 'ค่าใช้จ่ายอื่น' : 'ต้นทุนสินค้า');
  const tc = s ? (tx.payment_method === 'transfer' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600') : (tx.category === 'other' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600');
  return `<div class="py-3.5 flex items-center justify-between gap-2.5">
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <div class="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center ${s ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}">
        <i data-lucide="${s ? 'arrow-down-left' : 'arrow-up-right'}" class="w-5 h-5"></i>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold text-slate-800 truncate">${esc(tx.title)}</div>
        <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md ${tc}">${tag}</span>
          ${showD ? `<span class="text-[11px] text-slate-400">${thDate(tx.date)}</span>` : ''}
          ${tx.note ? `<span class="text-[11px] text-slate-400 truncate max-w-[120px]">• ${esc(tx.note)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-1.5 shrink-0">
      <span class="text-sm font-bold ${s ? 'text-emerald-600' : 'text-orange-600'}">${s ? '+' : '-'}${money(tx.amount)}</span>
      ${acts ? `<button onclick="editTx('${tx.id}')" class="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
      <button onclick="delTx('${tx.id}')" class="w-7 h-7 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : ''}
    </div>
  </div>`;
}

function editTx(id) {
  const tx = st.txs.find((x) => x.id === id); if (!tx) return;
  if (tx.type === 'sale') {
    st.saleDate = tx.date; goTab('sales');
    $('s-id').value = tx.id; $('s-amt').value = tx.amount; $('s-title').value = tx.title; $('s-note').value = tx.note || '';
    setPay(tx.payment_method || 'cash'); $('s-heading').textContent = 'แก้ไขยอดขาย'; $('s-btn-txt').textContent = 'บันทึกการแก้ไข'; $('s-cancel').classList.remove('hidden');
  } else {
    st.expDate = tx.date; goTab('expenses');
    $('e-id').value = tx.id; $('e-amt').value = tx.amount; $('e-title').value = tx.title; $('e-note').value = tx.note || '';
    setCat(tx.category || 'cost'); $('e-heading').textContent = 'แก้ไขยอดจ่าย'; $('e-btn-txt').textContent = 'บันทึกการแก้ไข'; $('e-cancel').classList.remove('hidden');
  }
}

async function delTx(id) {
  const tx = st.txs.find((x) => x.id === id);
  if (!tx || !confirm(`ลบรายการ "${tx.title}" (${money(tx.amount)} บาท) ใช่หรือไม่?`)) return;
  try {
    const { error } = await db.from('transactions').delete().eq('id', id);
    if (error) throw error;
    st.txs = st.txs.filter((x) => x.id !== id);
    saveCache(); renderAll(); toast('ลบรายการเรียบร้อย');
  } catch (e) { toast('ลบไม่สำเร็จ กรุณาลองใหม่', true); }
}

function openLine() {
  $('l-date').value = st.histP === 'yesterday' ? yesterday() : (st.histP === 'custom' && $('h-cdate').value ? $('h-cdate').value : localDate());
  renderLine(); $('line-modal').classList.remove('hidden'); $('line-modal').classList.add('flex'); lucide.createIcons();
}
function closeLine() { $('line-modal').classList.add('hidden'); $('line-modal').classList.remove('flex'); }
function todayLine() { $('l-date').value = localDate(); renderLine(); }
function lineText() {
  const d = $('l-date').value || localDate();
  const list = st.txs.filter((x) => x.date === d);
  const sL = list.filter((x) => x.type === 'sale'), eL = list.filter((x) => x.type === 'expense');
  const cost = eL.reduce((a, b) => a + b.amount, 0), sales = sL.reduce((a, b) => a + b.amount, 0), prof = sales - cost;
  const out = [];
  if ($('l-opt-shop').checked) out.push(`ร้าน: ${st.shopName}`);
  out.push(`สรุปยอดประจำวันที่ ${thDate(d)}`);
  out.push(`ต้นทุนวันนี้        ${money(cost)} บาท`);
  out.push(`ยอดขายวันนี้   ${money(sales)} บาท`);
  out.push(`สรุปกำไรวันนี้   ${money(prof)} บาท`);
  if ($('l-opt-detail').checked) {
    const c = sL.filter((x) => x.payment_method !== 'transfer').reduce((a, b) => a + b.amount, 0);
    const t = sL.filter((x) => x.payment_method === 'transfer').reduce((a, b) => a + b.amount, 0);
    out.push('--------------------', `เงินสด: ${money(c)} บาท`, `โอนเงิน: ${money(t)} บาท`);
  }
  return out.join('\n');
}
function renderLine() { $('l-preview').textContent = lineText(); }
function shareLine() { window.open(`https://line.me/R/share?text=${encodeURIComponent(lineText())}`, '_blank'); }
async function copyLine() {
  try { await navigator.clipboard.writeText(lineText()); toast('คัดลอกข้อความแล้ว'); }
  catch (e) { toast('กรุณากดแชร์เข้า LINE โดยตรง', true); }
}

function openSettings() { $('set-shop').value = st.shopName; $('set-modal').classList.remove('hidden'); $('set-modal').classList.add('flex'); lucide.createIcons(); }
function closeSettings() { $('set-modal').classList.add('hidden'); $('set-modal').classList.remove('flex'); }
async function saveShop() {
  const v = $('set-shop').value.trim(); if (!v) return toast('กรุณากรอกชื่อร้าน', true);
  try {
    const { error } = await db.from('app_settings').upsert({ key: 'shop_name', value: v });
    if (error) throw error; st.shopName = v; saveCache();
    $('shop-name').textContent = v; document.title = v; closeSettings(); toast('เปลี่ยนชื่อร้านเรียบร้อย');
  } catch (e) { toast('บันทึกไม่สำเร็จ กรุณาลองใหม่', true); }
}

function exportCSV() {
  if (!st.txs.length) return toast('ยังไม่มีข้อมูลสำหรับส่งออก', true);
  const rows = st.txs.map((x) => [thDate(x.date), x.type === 'sale' ? 'ยอดขาย' : 'ยอดจ่าย', `"${(x.title || '').replace(/"/g, '""')}"`, x.amount, x.type === 'sale' ? (x.payment_method === 'transfer' ? 'โอนเงิน' : 'เงินสด') : (x.category === 'other' ? 'ค่าใช้จ่ายอื่น' : 'ต้นทุนสินค้า'), `"${(x.note || '').replace(/"/g, '""')}"`].join(','));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFFวันที่,ประเภท,รายการ,จำนวนเงิน,หมวดหมู่,หมายเหตุ\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' }));
  a.download = `บัญชีร้าน_${localDate()}.csv`; a.click(); toast('ส่งออกไฟล์รายงานแล้ว');
}

async function clearAll() {
  if (!confirm('ต้องการล้างรายการทั้งหมดใช่หรือไม่?') || !confirm('ยืนยันอีกครั้ง: ข้อมูลที่ลบจะไม่สามารถกู้คืนได้')) return;
  try {
    const { error } = await db.from('transactions').delete().neq('id', '');
    if (error) throw error; st.txs = []; saveCache();
    renderAll(); closeSettings(); toast('ล้างข้อมูลทั้งหมดแล้ว');
  } catch (e) { toast('ไม่สามารถล้างข้อมูลได้ กรุณาลองใหม่', true); }
}

function renderAll() {
  $('shop-name').textContent = st.shopName;
  $('today-subtitle').textContent = thFullToday();
  document.title = st.shopName;
  renderDash(); renderSales(); renderExp(); renderHist();
}

document.addEventListener('DOMContentLoaded', () => {
  setPay('cash'); setCat('cost'); goTab('dashboard'); refreshData(false);
});
