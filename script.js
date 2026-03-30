let coinsList = [];
let filteredList = [];
let compareList = [];
let favList = JSON.parse(localStorage.getItem('crypto_favs') || '[]');
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

window.addEventListener('hashchange', () => {
    switchView(window.location.hash || '#/');
});

async function startApp() {
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    addEventListeners();
    switchView(window.location.hash || '#/');
    
    await getGlobalData();
    displayGlobalStats();

    getCoinsByPage(1);
}

function switchView(hash) {
    const views = ['dashboard', 'compare', 'favorites'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
        const nav = document.getElementById(`nav-${v}`);
        if (nav) nav.classList.remove('active', 'text-slate-900', 'dark:text-white');
    });

    let target = 'dashboard';
    if (hash === '#/compare') {
        target = 'compare';
        renderComparison();
    }
    if (hash === '#/favorites') {
        target = 'favorites';
        renderFavorites();
    }

    const targetEl = document.getElementById(`view-${target}`);
    if (targetEl) targetEl.classList.remove('hidden');
    const targetNav = document.getElementById(`nav-${target}`);
    if (targetNav) targetNav.classList.add('active', 'text-slate-900', 'dark:text-white');
}

async function getGlobalData() {
    try {
        const res = await fetch(globalUrl);
        const json = await res.json();
        globalStats = json.data;
        displayGlobalStats();
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
        if (window.location.hash === '#/favorites') renderFavorites();
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
        const isFav = favList.includes(coin.id);
        const percentChange = coin.price_change_percentage_24h || 0;
        const up = percentChange >= 0;
        rowsHtml += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                <td class="p-6 text-sm font-bold text-slate-400">#${coin.market_cap_rank}</td>
                <td class="p-6">
                    <div class="flex items-center gap-4">
                        <img src="${coin.image}" class="w-10 h-10 rounded-2xl border" alt="${coin.name}">
                        <div>
                            <div class="font-extrabold text-slate-900 dark:text-white">${coin.name}</div>
                            <div class="text-[10px] text-slate-500 uppercase font-black tracking-widest">${coin.symbol}</div>
                        </div>
                    </div>
                </td>
                <td class="p-6 font-mono font-bold font-mono">$${getPriceString(coin.current_price)}</td>
                <td class="p-6 text-right font-mono font-black ${up ? 'text-secondary' : 'text-danger'}">
                    <span class="inline-flex items-center">
                        <i data-lucide="${up ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 mr-1"></i>
                        ${Math.abs(percentChange).toFixed(2)}%
                    </span>
                </td>
                <td class="p-6">
                    <div class="w-24 h-10 mx-auto">${getSparklineSvg(coin.sparkline_in_7d.price, up)}</div>
                </td>
                <td class="p-6">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="handleCompareClick('${coin.id}')" class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm" title="Compare">
                            <i data-lucide="repeat" class="w-5 h-5"></i>
                        </button>
                        <button onclick="toggleFavorite('${coin.id}')" class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 ${isFav ? 'text-yellow-500' : 'text-slate-400'} hover:scale-110 transition-all shadow-sm">
                            <i data-lucide="star" class="w-5 h-5 ${isFav ? 'fill-yellow-500' : ''}"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }
    tableBody.innerHTML = rowsHtml;
    lucide.createIcons();
}

function toggleFavorite(id) {
    if (favList.includes(id)) {
        favList = favList.filter(f => f !== id);
    } else {
        favList.push(id);
    }
    localStorage.setItem('crypto_favs', JSON.stringify(favList));
    displayCoinsTable();
    renderFavorites();
}

function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;
    if (favList.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-24 text-center glass rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div class="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i data-lucide="star" class="w-10 h-10 text-slate-300"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">No Favorites Yet</h3>
                <p class="text-slate-500 max-w-sm mx-auto px-6">Go to the Dashboard and click the star icon on any coin to build your personalized watchlist.</p>
            </div>`;
        lucide.createIcons();
        return;
    }
    const favCoins = coinsList.filter(c => favList.includes(c.id));
    let html = '';
    favCoins.forEach(coin => {
        const up = coin.price_change_percentage_24h >= 0;
        html += `
            <div class="glass p-6 rounded-[32px] border relative group animate-in">
                <button onclick="toggleFavorite('${coin.id}')" class="absolute top-4 right-4 text-yellow-500 hover:scale-125 transition-all"><i data-lucide="star" class="w-6 h-6 fill-yellow-500"></i></button>
                <div class="flex items-center gap-4 mb-6">
                    <img src="${coin.image}" class="w-12 h-12 rounded-2xl" alt="${coin.name}">
                    <div><h3 class="font-black text-slate-900 dark:text-white">${coin.name}</h3><p class="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono">${coin.symbol}</p></div>
                </div>
                <div class="space-y-4">
                    <div><p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Current Price</p><p class="text-2xl font-black text-slate-900 dark:text-white font-mono">$${getPriceString(coin.current_price)}</p></div>
                    <div class="flex justify-between items-end"><div class="font-black ${up ? 'text-secondary' : 'text-danger'} font-mono">${coin.price_change_percentage_24h.toFixed(2)}%</div><div class="w-20 h-8">${getSparklineSvg(coin.sparkline_in_7d.price, up)}</div></div>
                </div>
            </div>`;
    });
    grid.innerHTML = html;
    lucide.createIcons();
}

function handleCompareClick(coinId) {
    const coin = coinsList.find(c => c.id === coinId);
    if (!coin) return;
    if (compareList.find(c => c.id === coinId)) return;
    if (compareList.length >= 2) return;
    compareList.push(coin);
    if (compareList.length === 1) window.location.hash = '#/compare';
    renderComparison();
}

function renderComparison() {
    for (let i = 0; i < 2; i++) {
        const slot = document.getElementById(`compare-slot-${i}`);
        if (!slot) continue;
        const coin = compareList[i];
        if (coin) {
            const up = coin.price_change_percentage_24h >= 0;
            slot.innerHTML = `
                <button onclick="removeCompare(${i})" class="absolute top-6 right-6 p-2 rounded-xl bg-white dark:bg-slate-800 text-danger opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
                <div class="w-full space-y-8 animate-in text-left">
                    <div class="flex items-center gap-6">
                        <img src="${coin.image}" class="w-24 h-24 rounded-[32px] p-1 border shadow-2xl" alt="${coin.name}">
                        <div>
                            <h3 class="text-4xl font-black text-slate-900 dark:text-white font-orbitron">${coin.name}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-sm font-black text-slate-400 uppercase tracking-widest">${coin.symbol}</span>
                                <span class="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold font-mono">Rank #${coin.market_cap_rank}</span>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="glass p-6 rounded-3xl border"><p class="text-[10px] font-black text-slate-400 uppercase mb-2">Price</p><p class="text-2xl font-black text-slate-900 dark:text-white font-mono">$${getPriceString(coin.current_price)}</p></div>
                        <div class="glass p-6 rounded-3xl border"><p class="text-[10px] font-black text-slate-400 uppercase mb-2">24h Change</p><p class="text-2xl font-black ${up ? 'text-secondary' : 'text-danger'} font-mono">${coin.price_change_percentage_24h.toFixed(2)}%</p></div>
                    </div>
                    <div class="glass p-8 rounded-[40px] border"><p class="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Market Cap (USD)</p><p class="text-3xl font-black text-slate-900 dark:text-white mb-1 font-mono">$${(coin.market_cap / 1e9).toFixed(2)}B</p></div>
                </div>`;
            slot.classList.remove('border-dashed');
            slot.classList.add('border-solid');
        } else {
            slot.innerHTML = `
                <div class="text-center group-hover:scale-110 transition-transform">
                    <div class="bg-slate-200/50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"><i data-lucide="plus" class="w-10 h-10 text-slate-500"></i></div>
                    <h3 class="text-xl font-bold mb-2">${i === 0 ? 'Primary Asset' : 'Secondary Asset'}</h3>
                    <p class="text-slate-500 text-sm">Select a coin from dashboard</p>
                </div>`;
            slot.classList.add('border-dashed');
            slot.classList.remove('border-solid');
        }
    }
    lucide.createIcons();
}

function removeCompare(idx) {
    compareList.splice(idx, 1);
    renderComparison();
}

function updatePaginationUI() {
    const info = document.getElementById('page-info');
    if (info) info.innerText = `Showing Page ${currentPage}`;
    const prevBtn = document.getElementById('prev-page');
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
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; getCoinsByPage(currentPage); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; getCoinsByPage(currentPage); });
}

function runFilters() {
    let list = [...coinsList];
    if (searchText) list = list.filter(c => c.name.toLowerCase().includes(searchText) || c.symbol.toLowerCase().includes(searchText));
    filteredList = list;
    displayCoinsTable();
}

function getSparklineSvg(prices, up) {
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);
    let valRange = maxVal - minVal || 1;
    let pathPoints = '';
    for (let i = 0; i < prices.length; i++) {
        const x = (i / (prices.length - 1)) * 100;
        const y = 40 - ((prices[i] - minVal) / valRange) * 40;
        pathPoints += `${x},${y} `;
    }
    return `<svg viewBox="0 0 100 40" class="overflow-visible"><polyline fill="none" stroke="${up ? '#0ECB81' : '#F6465D'}" stroke-width="3" stroke-linecap="round" points="${pathPoints}" /></svg>`;
}

function getPriceString(p) {
    if (!p) return '0.00';
    return p >= 1 ? p.toLocaleString(undefined, { minimumFractionDigits: 2 }) : p.toFixed(6);
}

function displayGlobalStats() {
    const statsGrid = document.getElementById('global-stats-grid');
    if (!globalStats || !statsGrid) return;
    const statsArray = [
        { title: 'Global Cap', val: `$${(globalStats.total_market_cap.usd / 1e12).toFixed(2)}T`, icon: 'trending-up', color: 'text-secondary' },
        { title: 'Volume', val: `$${(globalStats.total_volume.usd / 1e9).toFixed(2)}B`, icon: 'activity', color: 'text-secondary' },
        { title: 'BTC Dom', val: `${globalStats.market_cap_percentage.btc.toFixed(1)}%`, icon: 'percent', color: 'text-warning' },
        { title: 'Coins', val: (globalStats.active_cryptocurrencies || 0).toLocaleString(), icon: 'layers', color: 'text-slate-400' }
    ];
    let htmlContent = '';
    for (let i = 0; i < statsArray.length; i++) {
        let s = statsArray[i];
        htmlContent += `<div class="glass p-6 rounded-[32px] border group transition-all hover:scale-[1.03]"><div class="flex justify-between items-start mb-4"><p class="text-slate-500 font-bold uppercase text-[10px] tracking-widest">${s.title}</p><div class="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><i data-lucide="${s.icon}" class="${s.color} w-5 h-5"></i></div></div><h3 class="text-3xl font-black font-mono">${s.val}</h3></div>`;
    }
    statsGrid.innerHTML = htmlContent;
    lucide.createIcons();
}
