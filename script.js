let coinsList = [];
let filteredList = [];
let globalStats = null;
let currentTheme = localStorage.getItem('crypto_theme') || 'dark';
let searchText = '';
let selectedFilter = 'all';
let currentPage = 1;

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
    
    addEventListeners();
    await getGlobalData();
    displayGlobalStats();

    await getCoinsByPage(1);
}

async function getGlobalData() {
    try {
        const res = await fetch(globalUrl);
        const json = await res.json();
        globalStats = json.data;
    } catch (err) {
        console.log('Error:', err);
    }
}

async function getCoinsByPage(page) {
    try {
        const url = `${apiBaseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}&sparkline=true&price_change_percentage=24h`;
        const res = await fetch(url);
        const data = await res.json();
        coinsList = data;
        filteredList = [...data];
        displayCoinsTable();
        updatePaginationUI();
    } catch (err) {
        console.log('Error:', err);
    }
}

function displayCoinsTable() {
    const tableBody = document.getElementById('coin-table-body');
    if (!tableBody) return;

    let rowsHtml = '';
    for (let i = 0; i < filteredList.length; i++) {
        let coin = filteredList[i];
        const percentChange = coin.price_change_percentage_24h || 0;
        const up = percentChange >= 0;

        rowsHtml += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                <td class="p-6 text-sm font-bold text-slate-400">#${coin.market_cap_rank}</td>
                <td class="p-6">
                    <div class="flex items-center gap-4">
                        <img src="${coin.image}" class="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 p-0.5" alt="${coin.name}">
                        <div>
                            <div class="font-extrabold text-slate-900 dark:text-white">${coin.name}</div>
                            <div class="text-[10px] text-slate-500 uppercase font-black tracking-widest">${coin.symbol}</div>
                        </div>
                    </div>
                </td>
                <td class="p-6 font-mono font-bold text-slate-900 dark:text-white">$${getPriceString(coin.current_price)}</td>
                <td class="p-6 text-right">
                    <span class="inline-flex items-center font-black ${up ? 'text-secondary' : 'text-danger'} font-mono">
                        <i data-lucide="${up ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 mr-1"></i>
                        ${Math.abs(percentChange).toFixed(2)}%
                    </span>
                </td>
                <td class="p-6 text-center">
                    <div class="w-24 h-10 mx-auto">${getSparklineSvg(coin.sparkline_in_7d.price, up)}</div>
                </td>
                <td class="p-6">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <i data-lucide="star" class="w-5 h-5"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    tableBody.innerHTML = rowsHtml;
    lucide.createIcons();
}

function runFilters() {
    let list = [...coinsList];
    if (selectedFilter === 'gainers') {
        list = list.filter(c => (c.price_change_percentage_24h || 0) > 0);
        list.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    } else if (selectedFilter === 'losers') {
        list = list.filter(c => (c.price_change_percentage_24h || 0) < 0);
        list.sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
    }
    if (searchText) {
        list = list.filter(item => (item.name.toLowerCase().includes(searchText) || item.symbol.toLowerCase().includes(searchText)));
    }
    filteredList = list;
    displayCoinsTable();
}

function updatePaginationUI() {
    const info = document.getElementById('page-info');
    if (info) info.innerText = `Showing page ${currentPage} of market data`;
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
}

function addEventListeners() {
    const searchInput = document.getElementById('coin-search');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            searchText = e.target.value.toLowerCase();
            runFilters();
        });
    }
    ['all', 'gainers', 'losers'].forEach(f => {
        const btn = document.getElementById(`filter-${f}`);
        if (btn) {
            btn.addEventListener('click', () => {
                selectedFilter = f;
                document.querySelectorAll('[id^="filter-"]').forEach(el => el.classList.remove('bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900'));
                btn.classList.add('bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900');
                runFilters();
            });
        }
    });

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                getCoinsByPage(currentPage);
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentPage++;
            getCoinsByPage(currentPage);
        });
    }
}

function getSparklineSvg(prices, up) {
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);
    let valRange = maxVal - minVal;
    if (valRange === 0) valRange = 1;
    let pathPoints = '';
    for (let i = 0; i < prices.length; i++) {
        const x = (i / (prices.length - 1)) * 100;
        const y = 40 - ((prices[i] - minVal) / valRange) * 40;
        pathPoints += `${x},${y} `;
    }
    return `<svg viewBox="0 0 100 40" class="overflow-visible"><polyline fill="none" stroke="${up ? '#0ECB81' : '#F6465D'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pathPoints}" /></svg>`;
}

function getPriceString(p) {
    if (!p) return '0.00';
    if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return p.toFixed(6);
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
        htmlContent += `<div class="glass p-6 rounded-[32px] border group"><div class="flex justify-between items-start mb-4"><p class="text-slate-500 text-sm font-bold uppercase">${s.title}</p><div class="p-2.5 rounded-2xl bg-slate-100 ${s.color}"><i data-lucide="${s.icon}" class="w-5 h-5"></i></div></div><h3 class="text-3xl font-black font-mono">${s.val}</h3></div>`;
    }
    statsGrid.innerHTML = htmlContent;
    lucide.createIcons();
}
