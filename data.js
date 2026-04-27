// ============================================
//  TRADER JOURNAL — DATA.JS
//  Quotes + localStorage helpers
// ============================================

const QUOTES = [
  {
    text: "The goal of a successful trader is to make the best trades. Money is secondary.",
    author: "Alexander Elder",
    role: "Trading Psychologist & Author"
  },
  {
    text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.",
    author: "George Soros",
    role: "Legendary Hedge Fund Manager"
  },
  {
    text: "The most important thing is to have a method and to stick with it.",
    author: "Michael Covel",
    role: "Trend Following Author"
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
    role: "CEO of Berkshire Hathaway"
  },
  {
    text: "I'm always thinking about losing money as opposed to making money. Don't focus on making money, focus on protecting what you have.",
    author: "Paul Tudor Jones",
    role: "Founder, Tudor Investment Corp"
  },
  {
    text: "The biggest risk is not taking any risk. In a world that's changing really quickly, the only strategy that is guaranteed to fail is not taking risks.",
    author: "Mark Zuckerberg",
    role: "CEO, Meta"
  },
  {
    text: "The elements of good trading are: cutting losses, cutting losses, and cutting losses.",
    author: "Ed Seykota",
    role: "Pioneer of Systems Trading"
  },
  {
    text: "Amateurs focus on how much money they can make. Professionals focus on how much money they could lose.",
    author: "Jack Schwager",
    role: "Market Wizards Author"
  },
  {
    text: "The key to trading success is emotional discipline. If intelligence were the key, there would be a lot more people making money trading.",
    author: "Victor Sperandeo",
    role: "Wall Street Trader"
  },
  {
    text: "An investor without investment objectives is like a traveler without a destination.",
    author: "Ralph Seger",
    role: "Investment Analyst"
  },
  {
    text: "In trading/investing, it's not about how much you make but rather how much you don't lose.",
    author: "Bernard Baruch",
    role: "Financier & Statesman"
  },
  {
    text: "Losing a position is aggravating, whereas losing your nerve is devastating.",
    author: "Ed Seykota",
    role: "Pioneer of Systems Trading"
  },
  {
    text: "Markets can remain irrational longer than you can remain solvent.",
    author: "John Maynard Keynes",
    role: "Economist"
  },
  {
    text: "The trend is your friend until the end when it bends.",
    author: "Ed Seykota",
    role: "Pioneer of Systems Trading"
  },
  {
    text: "I never attempt to make money on the stock market. I buy on the assumption that they could close the market the next day and not reopen it for five years.",
    author: "Warren Buffett",
    role: "CEO of Berkshire Hathaway"
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
    role: "Author & Motivational Speaker"
  },
  {
    text: "Win or lose, everybody gets what they want out of the market. Some people seem to like to lose, so they win by losing money.",
    author: "Ed Seykota",
    role: "Pioneer of Systems Trading"
  },
  {
    text: "Do more of what works and less of what doesn't.",
    author: "Steve Clark",
    role: "Professional Trader"
  },
  {
    text: "You need to know how to take losses. The most important thing is money management, money management, money management.",
    author: "Louis Bacon",
    role: "Founder, Moore Capital Management"
  },
  {
    text: "Every battle is won before it's ever fought.",
    author: "Sun Tzu",
    role: "The Art of War"
  },
  {
    text: "Opportunities come infrequently. When it rains gold, put out the bucket, not the thimble.",
    author: "Warren Buffett",
    role: "CEO of Berkshire Hathaway"
  },
  {
    text: "A peak performance trader is totally focused on the process and not on the money.",
    author: "Van K. Tharp",
    role: "Trading Coach"
  },
  {
    text: "The secret to being successful from a trading perspective is to have an indefatigable and an undying and unquenchable thirst for information and knowledge.",
    author: "Paul Tudor Jones",
    role: "Founder, Tudor Investment Corp"
  },
  {
    text: "I always define my risk, and I don't have to worry about it.",
    author: "Tony Saliba",
    role: "Options Trader, Market Wizards"
  }
];

// ── localStorage helpers ──

function getTrades() {
  try {
    return JSON.parse(localStorage.getItem('tj_trades') || '[]');
  } catch { return []; }
}

function saveTrades(trades) {
  localStorage.setItem('tj_trades', JSON.stringify(trades));
}

function addTrade(trade) {
  const trades = getTrades();
  trade.id = Date.now();
  trades.unshift(trade);
  saveTrades(trades);
  return trade;
}

function deleteTrade(id) {
  const trades = getTrades().filter(t => t.id !== id);
  saveTrades(trades);
}

// ── Stats helpers ──

function computeStats(trades) {
  if (!trades.length) {
    return { total: 0, wins: 0, losses: 0, be: 0, winRate: 0, netPnl: 0, best: 0, worst: 0, avgRR: 0 };
  }

  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = trades.filter(t => t.outcome === 'LOSS').length;
  const be = trades.filter(t => t.outcome === 'BREAKEVEN').length;
  const winRate = ((wins / trades.length) * 100).toFixed(1);
  const pnls = trades.map(t => parseFloat(t.pnl) || 0);
  const netPnl = pnls.reduce((a, b) => a + b, 0);
  const best = Math.max(...pnls);
  const worst = Math.min(...pnls);

  const rrs = trades.map(t => parseFloat(t.rr)).filter(r => !isNaN(r) && r > 0);
  const avgRR = rrs.length ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : 0;

  return { total: trades.length, wins, losses, be, winRate, netPnl, best, worst, avgRR };
}

function formatCurrency(n) {
  const abs = Math.abs(n).toFixed(2);
  return (n >= 0 ? '+$' : '-$') + abs;
}
