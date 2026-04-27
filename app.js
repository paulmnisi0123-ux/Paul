// ============================================
//  TRADER JOURNAL — APP.JS
// ============================================

let tradeDirection = 'LONG';
let pnlChart = null;
let donutChart = null;
let marketChart = null;
let ratingChart = null;

// ── INIT ──

document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  updateLiveDate();
  setInterval(updateLiveDate, 60000);
  showPage('dashboard', null);
  rotateDailyQuote();
  setupLiveCalc();
  renderQuotesPage();
});

function setTodayDate() {
  const d = document.getElementById('f-date');
  if (d) d.value = new Date().toISOString().split('T')[0];
}

function updateLiveDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  const str = now.toLocaleDateString('en-US', options).toUpperCase();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('live-date');
  if (el) el.innerHTML = `${str} &nbsp;·&nbsp; ${time}`;
  const tb = document.getElementById('topbar-date');
  if (tb) tb.textContent = time;
}

// ── NAVIGATION ──

function showPage(pageId, link) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');
  if (link) link.classList.add('active');
  else {
    const match = document.querySelector(`[data-page="${pageId}"]`);
    if (match) match.classList.add('active');
  }

  // close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  // render page-specific content
  switch (pageId) {
    case 'dashboard': renderDashboard(); break;
    case 'journal': renderTradeLog(); break;
    case 'analytics': renderAnalytics(); break;
  }

  return false;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── QUOTE ROTATOR ──

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);

function rotateDailyQuote() {
  const q = QUOTES[currentQuoteIdx];
  const qt = document.getElementById('quote-rotator');
  const qa = document.getElementById('quote-author');
  if (qt) qt.textContent = q.text;
  if (qa) qa.textContent = `— ${q.author}, ${q.role}`;
  currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length;
  setTimeout(rotateDailyQuote, 12000);
}

// ── DASHBOARD ──

function renderDashboard() {
  const trades = getTrades();
  const stats = computeStats(trades);

  // update stat cards
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-winrate').textContent = stats.winRate + '%';

  const pnlEl = document.getElementById('stat-pnl');
  pnlEl.textContent = formatCurrency(stats.netPnl);
  pnlEl.style.color = stats.netPnl >= 0 ? 'var(--win)' : 'var(--loss)';

  document.getElementById('stat-best').textContent = stats.total ? formatCurrency(stats.best) : '$0.00';
  document.getElementById('stat-best').style.color = 'var(--win)';
  document.getElementById('stat-worst').textContent = stats.total ? formatCurrency(stats.worst) : '$0.00';
  document.getElementById('stat-worst').style.color = 'var(--loss)';
  document.getElementById('stat-rr').textContent = stats.avgRR ? `1:${stats.avgRR}` : '—';

  renderPnlChart(trades);
  renderRecentTrades(trades.slice(0, 8));
}

// ── P&L CHART ──

function renderPnlChart(trades) {
  const ctx = document.getElementById('pnl-chart');
  if (!ctx) return;

  if (pnlChart) { pnlChart.destroy(); pnlChart = null; }

  if (!trades.length) {
    ctx.height = 100;
    return;
  }

  // cumulative
  const sorted = [...trades].reverse();
  let cum = 0;
  const labels = sorted.map((t, i) => `#${i + 1}`);
  const data = sorted.map(t => { cum += parseFloat(t.pnl) || 0; return parseFloat(cum.toFixed(2)); });

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(0,229,255,0.3)');
  gradient.addColorStop(1, 'rgba(0,229,255,0)');

  pnlChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Cumulative P&L',
        data,
        borderColor: '#00e5ff',
        backgroundColor: gradient,
        borderWidth: 2,
        pointRadius: data.length > 30 ? 0 : 3,
        pointBackgroundColor: '#00e5ff',
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111114',
          borderColor: '#2a2a33',
          borderWidth: 1,
          titleColor: '#6b6b80',
          bodyColor: '#00e5ff',
          callbacks: {
            label: ctx => ' $' + ctx.parsed.y.toFixed(2)
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(42,42,51,0.5)' },
          ticks: { color: '#6b6b80', font: { family: 'Space Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(42,42,51,0.5)' },
          ticks: {
            color: '#6b6b80',
            font: { family: 'Space Mono', size: 10 },
            callback: v => '$' + v
          }
        }
      }
    }
  });
}

// ── RECENT TRADES ──

function renderRecentTrades(trades) {
  const container = document.getElementById('recent-trades-list');
  if (!container) return;

  if (!trades.length) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state-icon">◫</span>
      NO TRADES LOGGED YET.<br>START WITH YOUR FIRST TRADE.
    </div>`;
    return;
  }

  container.innerHTML = trades.map(t => `
    <div class="trade-row" onclick="openTradeModal(${t.id})">
      <span class="trade-ticker">${t.ticker}</span>
      <span class="trade-dir ${t.direction === 'LONG' ? 'dir-long' : 'dir-short'}">${t.direction}</span>
      <span class="trade-market" style="color:var(--text-muted)">${t.market || ''}</span>
      <span class="trade-date">${formatDate(t.date)}</span>
      <span class="trade-pnl ${t.outcome === 'WIN' ? 'pnl-win' : t.outcome === 'LOSS' ? 'pnl-loss' : 'pnl-be'}">${formatCurrency(parseFloat(t.pnl) || 0)}</span>
      <span class="trade-outcome ${t.outcome === 'WIN' ? 'out-win' : t.outcome === 'LOSS' ? 'out-loss' : 'out-be'}">${t.outcome}</span>
    </div>
  `).join('');
}

// ── TRADE FORM ──

function setDir(dir) {
  tradeDirection = dir;
  document.getElementById('btn-long').classList.toggle('active', dir === 'LONG');
  document.getElementById('btn-short').classList.toggle('active', dir === 'SHORT');
}

function setupLiveCalc() {
  ['f-entry', 'f-exit', 'f-size', 'f-sl', 'f-tp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateCalc);
  });
}

function updateCalc() {
  const entry = parseFloat(document.getElementById('f-entry')?.value) || 0;
  const exit = parseFloat(document.getElementById('f-exit')?.value) || 0;
  const size = parseFloat(document.getElementById('f-size')?.value) || 1;
  const sl = parseFloat(document.getElementById('f-sl')?.value) || 0;
  const tp = parseFloat(document.getElementById('f-tp')?.value) || 0;

  if (!entry) return;

  const pnl = (exit - entry) * size * (tradeDirection === 'SHORT' ? -1 : 1);
  const riskPts = tradeDirection === 'LONG' ? (entry - sl) : (sl - entry);
  const rewardPts = tradeDirection === 'LONG' ? (tp - entry) : (entry - tp);
  const rr = riskPts > 0 && rewardPts > 0 ? (rewardPts / riskPts).toFixed(2) : '—';
  const ret = entry > 0 ? ((pnl / (entry * size)) * 100).toFixed(2) : '—';

  const pnlEl = document.getElementById('calc-pnl');
  const rrEl = document.getElementById('calc-rr');
  const retEl = document.getElementById('calc-ret');

  if (pnlEl) {
    pnlEl.textContent = isNaN(pnl) ? '—' : formatCurrency(pnl);
    pnlEl.style.color = pnl >= 0 ? 'var(--win)' : 'var(--loss)';
  }
  if (rrEl) rrEl.textContent = rr !== '—' ? `1:${rr}` : '—';
  if (retEl) retEl.textContent = ret !== '—' ? `${ret}%` : '—';
}

function saveTrade() {
  const ticker = document.getElementById('f-ticker')?.value?.trim().toUpperCase();
  const date = document.getElementById('f-date')?.value;
  const market = document.getElementById('f-market')?.value;
  const entry = parseFloat(document.getElementById('f-entry')?.value);
  const exit = parseFloat(document.getElementById('f-exit')?.value);
  const size = parseFloat(document.getElementById('f-size')?.value) || 1;
  const sl = parseFloat(document.getElementById('f-sl')?.value) || 0;
  const tp = parseFloat(document.getElementById('f-tp')?.value) || 0;
  const outcome = document.getElementById('f-outcome')?.value;
  const setup = document.getElementById('f-setup')?.value?.trim();
  const notes = document.getElementById('f-notes')?.value?.trim();
  const mistakes = document.getElementById('f-mistakes')?.value?.trim();
  const rating = document.getElementById('f-rating')?.value;

  if (!ticker || !date || isNaN(entry) || isNaN(exit)) {
    showToast('FILL IN TICKER, DATE, ENTRY & EXIT');
    return;
  }

  const pnl = ((exit - entry) * size * (tradeDirection === 'SHORT' ? -1 : 1)).toFixed(2);
  const riskPts = tradeDirection === 'LONG' ? (entry - sl) : (sl - entry);
  const rewardPts = tradeDirection === 'LONG' ? (tp - entry) : (entry - tp);
  const rr = riskPts > 0 && rewardPts > 0 ? (rewardPts / riskPts).toFixed(2) : null;

  const trade = {
    ticker, date, market, direction: tradeDirection,
    entry, exit, size, sl, tp, outcome, setup, notes, mistakes,
    rating: parseInt(rating), pnl, rr
  };

  addTrade(trade);
  showToast('TRADE LOGGED ✓');
  resetForm();
  showPage('journal', null);
}

function resetForm() {
  ['f-ticker','f-entry','f-exit','f-sl','f-tp','f-setup','f-notes','f-mistakes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('f-size').value = '1';
  document.getElementById('f-outcome').value = 'WIN';
  document.getElementById('f-market').value = 'Stocks';
  document.getElementById('f-rating').value = 5;
  document.getElementById('rating-val').textContent = '5';
  setDir('LONG');
  setTodayDate();
  document.getElementById('calc-pnl').textContent = '—';
  document.getElementById('calc-rr').textContent = '—';
  document.getElementById('calc-ret').textContent = '—';
}

// ── TRADE LOG ──

function renderTradeLog() {
  const container = document.getElementById('trade-log-container');
  if (!container) return;

  let trades = getTrades();
  const search = document.getElementById('search-trades')?.value?.toLowerCase() || '';
  const outcome = document.getElementById('filter-outcome')?.value || '';
  const market = document.getElementById('filter-market')?.value || '';

  if (search) trades = trades.filter(t => t.ticker.toLowerCase().includes(search));
  if (outcome) trades = trades.filter(t => t.outcome === outcome);
  if (market) trades = trades.filter(t => t.market === market);

  if (!trades.length) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state-icon">◫</span>
      NO TRADES MATCH YOUR FILTERS.
    </div>`;
    return;
  }

  container.innerHTML = `
    <table class="trade-table">
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Date</th>
          <th class="hide-mobile">Market</th>
          <th>Dir</th>
          <th class="hide-mobile">Entry</th>
          <th class="hide-mobile">Exit</th>
          <th>P&L</th>
          <th>Outcome</th>
          <th class="hide-mobile">R:R</th>
          <th class="hide-mobile">Rating</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${trades.map(t => `
          <tr onclick="openTradeModal(${t.id})">
            <td><strong>${t.ticker}</strong></td>
            <td>${formatDate(t.date)}</td>
            <td class="hide-mobile" style="color:var(--text-muted)">${t.market || '—'}</td>
            <td><span class="trade-dir ${t.direction === 'LONG' ? 'dir-long' : 'dir-short'}">${t.direction}</span></td>
            <td class="hide-mobile">$${parseFloat(t.entry).toFixed(2)}</td>
            <td class="hide-mobile">$${parseFloat(t.exit).toFixed(2)}</td>
            <td class="${t.outcome === 'WIN' ? 'pnl-win' : t.outcome === 'LOSS' ? 'pnl-loss' : 'pnl-be'}">${formatCurrency(parseFloat(t.pnl))}</td>
            <td><span class="trade-outcome ${t.outcome === 'WIN' ? 'out-win' : t.outcome === 'LOSS' ? 'out-loss' : 'out-be'}">${t.outcome}</span></td>
            <td class="hide-mobile" style="color:var(--text-muted)">${t.rr ? '1:' + t.rr : '—'}</td>
            <td class="hide-mobile" style="color:var(--accent)">${'★'.repeat(Math.round((t.rating || 5)/2))}</td>
            <td onclick="event.stopPropagation()">
              <button class="delete-btn" onclick="confirmDelete(${t.id})">✕</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function confirmDelete(id) {
  if (confirm('Delete this trade?')) {
    deleteTrade(id);
    renderTradeLog();
    showToast('TRADE DELETED');
  }
}

// ── MODAL ──

function openTradeModal(id) {
  const trade = getTrades().find(t => t.id === id);
  if (!trade) return;

  const pnlColor = trade.outcome === 'WIN' ? 'var(--win)' : trade.outcome === 'LOSS' ? 'var(--loss)' : 'var(--neutral)';

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-ticker">${trade.ticker}</div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:4px">
      <span class="trade-dir ${trade.direction === 'LONG' ? 'dir-long' : 'dir-short'}">${trade.direction}</span>
      <span class="trade-outcome ${trade.outcome === 'WIN' ? 'out-win' : trade.outcome === 'LOSS' ? 'out-loss' : 'out-be'}">${trade.outcome}</span>
      <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">${formatDate(trade.date)}</span>
    </div>
    <div style="font-family:var(--font-display);font-size:2.4rem;color:${pnlColor};margin:12px 0;">${formatCurrency(parseFloat(trade.pnl))}</div>

    <div class="modal-grid">
      <div class="modal-item">
        <span class="modal-label">Market</span>
        <span class="modal-val">${trade.market || '—'}</span>
      </div>
      <div class="modal-item">
        <span class="modal-label">Entry</span>
        <span class="modal-val">$${parseFloat(trade.entry).toFixed(4)}</span>
      </div>
      <div class="modal-item">
        <span class="modal-label">Exit</span>
        <span class="modal-val">$${parseFloat(trade.exit).toFixed(4)}</span>
      </div>
      <div class="modal-item">
        <span class="modal-label">Size</span>
        <span class="modal-val">${trade.size}</span>
      </div>
      <div class="modal-item">
        <span class="modal-label">Stop Loss</span>
        <span class="modal-val" style="color:var(--loss)">${trade.sl ? '$' + parseFloat(trade.sl).toFixed(4) : '—'}</span>
      </div>
      <div class="modal-item">
        <span class="modal-label">Take Profit</span>
        <span class="modal-val" style="color:var(--win)">${trade.tp ? '$' + parseFloat(trade.tp).toFixed(4) : '—'}</span>
      </div>
      <div class="modal-item">
        <span class="modal-label">R:R</span>
        <span class="modal-val">${trade.rr ? '1:' + trade.rr : '—'}</span>
      </div>
      <div class="modal-item">
        <span class="modal-label">Quality Rating</span>
        <span class="modal-val" style="color:var(--accent)">${trade.rating || '—'}/10</span>
      </div>
      ${trade.setup ? `
        <div class="modal-item" style="grid-column:1/-1">
          <span class="modal-label">Setup / Strategy</span>
          <span class="modal-val">${trade.setup}</span>
        </div>
      ` : ''}
    </div>

    ${trade.notes ? `
      <div class="modal-notes-section">
        <div class="modal-notes-title">Notes & Emotions</div>
        <div class="modal-notes-text">${trade.notes}</div>
      </div>
    ` : ''}

    ${trade.mistakes ? `
      <div class="modal-notes-section">
        <div class="modal-notes-title" style="color:var(--loss)">Mistakes</div>
        <div class="modal-notes-text" style="color:var(--loss)">${trade.mistakes}</div>
      </div>
    ` : ''}
  `;

  document.getElementById('modal').classList.add('active');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.remove('active');
  }
}

// ── ANALYTICS ──

function renderAnalytics() {
  const trades = getTrades();
  const stats = computeStats(trades);

  renderDonutChart(stats);
  renderMarketChart(trades);
  renderRatingChart(trades);
  renderTopPerformers(trades);
  renderMistakeList(trades);
}

function renderDonutChart(stats) {
  const ctx = document.getElementById('donut-chart');
  if (!ctx) return;
  if (donutChart) { donutChart.destroy(); donutChart = null; }

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses', 'Breakeven'],
      datasets: [{
        data: [stats.wins, stats.losses, stats.be],
        backgroundColor: ['rgba(0,200,150,0.8)', 'rgba(255,71,87,0.8)', 'rgba(255,215,0,0.6)'],
        borderColor: '#0a0a0c',
        borderWidth: 3,
      }]
    },
    options: {
      cutout: '70%',
      plugins: {
        legend: {
          labels: { color: '#6b6b80', font: { family: 'Space Mono', size: 10 } }
        }
      }
    }
  });
}

function renderMarketChart(trades) {
  const ctx = document.getElementById('market-chart');
  if (!ctx) return;
  if (marketChart) { marketChart.destroy(); marketChart = null; }

  const markets = {};
  trades.forEach(t => {
    const m = t.market || 'Other';
    markets[m] = (markets[m] || 0) + (parseFloat(t.pnl) || 0);
  });

  const labels = Object.keys(markets);
  const data = labels.map(l => parseFloat(markets[l].toFixed(2)));
  const colors = data.map(v => v >= 0 ? 'rgba(0,200,150,0.7)' : 'rgba(255,71,87,0.7)');

  marketChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 6,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b6b80', font: { family: 'Space Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(42,42,51,0.5)' },
          ticks: {
            color: '#6b6b80',
            font: { family: 'Space Mono', size: 10 },
            callback: v => '$' + v
          }
        }
      }
    }
  });
}

function renderRatingChart(trades) {
  const ctx = document.getElementById('rating-chart');
  if (!ctx) return;
  if (ratingChart) { ratingChart.destroy(); ratingChart = null; }

  const buckets = Array(10).fill(0);
  trades.forEach(t => {
    const r = parseInt(t.rating);
    if (r >= 1 && r <= 10) buckets[r - 1]++;
  });

  ratingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1','2','3','4','5','6','7','8','9','10'],
      datasets: [{
        label: 'Trades',
        data: buckets,
        backgroundColor: buckets.map((_, i) => `hsl(${(i / 9) * 120}, 70%, 55%)`),
        borderRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b6b80', font: { family: 'Space Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(42,42,51,0.5)' },
          ticks: { color: '#6b6b80', font: { family: 'Space Mono', size: 10 } }
        }
      }
    }
  });
}

function renderTopPerformers(trades) {
  const el = document.getElementById('top-performers');
  if (!el) return;

  const tickers = {};
  trades.forEach(t => {
    if (!tickers[t.ticker]) tickers[t.ticker] = 0;
    tickers[t.ticker] += parseFloat(t.pnl) || 0;
  });

  const sorted = Object.entries(tickers).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (!sorted.length) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:0.75rem;font-family:var(--font-mono)">NO DATA YET</div>';
    return;
  }

  el.innerHTML = sorted.map(([ticker, pnl]) => `
    <div class="performer-row">
      <span style="color:var(--text)">${ticker}</span>
      <span style="color:${pnl >= 0 ? 'var(--win)' : 'var(--loss)'}">${formatCurrency(pnl)}</span>
    </div>
  `).join('');
}

function renderMistakeList(trades) {
  const el = document.getElementById('mistake-list');
  if (!el) return;

  const mistakes = trades
    .filter(t => t.mistakes && t.mistakes.trim())
    .map(t => t.mistakes.trim());

  if (!mistakes.length) {
    el.innerHTML = '<div style="color:var(--win);font-size:0.75rem;font-family:var(--font-mono)">NO MISTAKES LOGGED ✓</div>';
    return;
  }

  // count
  const counts = {};
  mistakes.forEach(m => {
    const key = m.toLowerCase().substring(0, 40);
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  el.innerHTML = sorted.map(([m, c]) => `
    <div class="mistake-row">
      <span style="color:var(--text-muted);font-size:0.68rem">${m}</span>
      <span style="color:var(--loss);font-family:var(--font-mono)">×${c}</span>
    </div>
  `).join('');
}

// ── QUOTES PAGE ──

function renderQuotesPage() {
  const grid = document.getElementById('quotes-grid');
  if (!grid) return;

  grid.innerHTML = QUOTES.map(q => `
    <div class="quote-card">
      <p class="qc-text">${q.text}</p>
      <div class="qc-author">${q.author}</div>
      <div class="qc-role">${q.role}</div>
    </div>
  `).join('');
}

// ── EXPORT CSV ──

function exportCSV() {
  const trades = getTrades();
  if (!trades.length) { showToast('NO TRADES TO EXPORT'); return; }

  const headers = ['Date','Ticker','Market','Direction','Entry','Exit','Size','SL','TP','P&L','R:R','Outcome','Rating','Setup','Notes','Mistakes'];
  const rows = trades.map(t => [
    t.date, t.ticker, t.market, t.direction,
    t.entry, t.exit, t.size, t.sl, t.tp,
    t.pnl, t.rr, t.outcome, t.rating,
    `"${(t.setup || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
    `"${(t.mistakes || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading-journal-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV EXPORTED ✓');
}

// ── HELPERS ──

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).toUpperCase();
}

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
