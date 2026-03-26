let globalStats = null;
let currentTheme = localStorage.getItem('crypto_theme') || 'dark';

const apiBaseUrl = 'https://api.coingecko.com/api/v3';
const globalUrl = `${apiBaseUrl}/global`;

document.addEventListener('DOMContentLoaded', function () {
    startApp();
});

async function startApp() {
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    await getGlobalData();
    displayGlobalStats();
}

async function getGlobalData() {
    try {
        const res = await fetch(globalUrl);
        const json = await res.json();
        globalStats = json.data;
    } catch (err) {
        console.log('Error fetching global data:', err);
    }
}

function displayGlobalStats() {
    const statsGrid = document.getElementById('global-stats-grid');
    if (!globalStats || !statsGrid) return;

    const statsArray = [
        { title: 'Global Market Cap', val: `$${(globalStats.total_market_cap.usd / 1e12).toFixed(2)}T`, icon: 'trending-up', color: 'text-secondary' },
        { title: '24h Volume', val: `$${(globalStats.total_volume.usd / 1e9).toFixed(2)}B`, icon: 'activity', color: 'text-secondary' },
        { title: 'BTC Dominance', val: `${globalStats.market_cap_percentage.btc.toFixed(1)}%`, icon: 'percent', color: 'text-warning' },
        { title: 'Active Coins', val: (globalStats.active_cryptocurrencies || 0).toLocaleString(), icon: 'layers', color: 'text-slate-400' }
    ];

    let htmlContent = '';
    for (let i = 0; i < statsArray.length; i++) {
        let s = statsArray[i];
        htmlContent += `
        <div class="glass p-6 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 hover:scale-[1.03] transition-all group">
            <div class="flex justify-between items-start mb-4">
                <p class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">${s.title}</p>
                <div class="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 ${s.color} transition-all shadow-sm">
                    <i data-lucide="${s.icon}" class="w-5 h-5"></i>
                </div>
            </div>
            <h3 class="text-3xl font-black text-slate-900 dark:text-white font-mono">${s.val}</h3>
        </div>
        `;
    }
    statsGrid.innerHTML = htmlContent;
    lucide.createIcons();
}
