let coinsList = [];
let filteredList = [];
let globalStats = null;
let favoriteCoins = JSON.parse(localStorage.getItem('crypto_favorites') || '[]');
let currentTheme = localStorage.getItem('crypto_theme') || 'dark';
let currentView = 'dashboard';
let searchText = '';
let selectedFilter = 'all';
let comparisonList = [null, null];
let itemsPerPage = 20;
let pageNumber = 1;

const apiBaseUrl = 'https://api.coingecko.com/api/v3';
const marketsUrl = `${apiBaseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h`;
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
    checkRoute();
    window.addEventListener('hashchange', checkRoute);

    await getGlobalData();
    await getCoinsData();

    updateUI();
}

async function getGlobalData() {
    try {
        const res = await fetch(globalUrl);
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        globalStats = json.data;
        localStorage.setItem('local_global', JSON.stringify(json.data));
    } catch (err) {
        console.log(err);
        const cached = localStorage.getItem('local_global');
        if (cached) {
            globalStats = JSON.parse(cached);
        } else {
            const grid = document.getElementById('global-stats-grid');
            if (grid) grid.innerHTML = '<div class="col-span-full text-center text-danger font-bold p-6">Failed to load global market stats. Rate limit exceeded.</div>';
        }
    }
}

async function getCoinsData() {
    showTableSkeletons();
    try {
        const res = await fetch(marketsUrl);
        if (!res.ok) throw new Error('API Error: Rate Limit Exceeded');
        const data = await res.json();
        coinsList = data;
        filteredList = [...data];
        localStorage.setItem('local_markets', JSON.stringify(data));
    } catch (err) {
        console.log(err);
        const cached = localStorage.getItem('local_markets');
        if (cached) {
            const data = JSON.parse(cached);
            coinsList = data;
            filteredList = [...data];
            setTimeout(function () {
                showNotification('Error: Free API Rate Limit Exceeded. Showing Offline Cached Data.');
            }, 1000);
        } else {
            displayErrorMessage('Error: API Rate Limit Exceeded. Please try again soon.');
        }
    }
}

function updateUI() {
    displayGlobalStats();
    displayCoinsTable();
    refreshNavBar();
    if (currentView === 'compare') {
        displayComparison();
    } else if (currentView === 'favorites') {
        displayFavorites();
    }
}

function showTableSkeletons() {
    const tableBody = document.getElementById('coin-table-body');
    if (!tableBody) return;
    let skeletons = '';
    for (let i = 0; i < 10; i++) {
        skeletons += `
            <tr class="animate-pulse">
                <td class="p-6 text-sm font-bold text-slate-400 group-hover:text-slate-600 transition-colors"><div class="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded"></div></td>
                <td class="p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-800"></div>
                        <div class="space-y-2">
                            <div class="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div class="h-2 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                    </div>
                </td>
                <td class="p-6"><div class="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div></td>
                <td class="p-6 text-right"><div class="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div></td>
                <td class="p-6"><div class="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div></td>
                <td class="p-6"><div class="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto"></div></td>
                <td class="p-6"><div class="h-10 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl mx-auto"></div></td>
            </tr>
        `;
    }
    tableBody.innerHTML = skeletons;
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
        <div class="glass p-6 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 hover:scale-[1.03] hover:shadow-xl dark:hover:shadow-white/5 transition-all group">
            <div class="flex justify-between items-start mb-4">
                <p class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">${s.title}</p>
                <div class="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 ${s.color} group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-slate-900 dark:group-hover:text-white transition-all shadow-sm">
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

function displayCoinsTable() {
    const tableBody = document.getElementById('coin-table-body');
    if (!tableBody) return;

    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentCoins = filteredList.slice(startIndex, endIndex);

    if (currentCoins.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-20 text-center text-slate-500">No assets found</td></tr>`;
        return;
    }

    let rowsHtml = '';
    for (let i = 0; i < currentCoins.length; i++) {
        let coin = currentCoins[i];
        const percentChange = coin.price_change_percentage_24h || 0;
        const up = percentChange >= 0;
        const isFav = favoriteCoins.includes(coin.id);

        rowsHtml += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                <td class="p-6 text-sm font-bold text-slate-400">#${coin.market_cap_rank}</td>
                <td class="p-6">
                    <div class="flex items-center gap-4">
                        <img src="${coin.image}" class="w-10 h-10 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-0.5" alt="${coin.name}">
                        <div>
                            <div class="font-extrabold text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">${coin.name}</div>
                            <div class="text-[10px] text-slate-500 uppercase font-black tracking-widest">${coin.symbol}</div>
                        </div>
                    </div>
                </td>
                <td class="p-6 font-mono font-bold text-slate-900 dark:text-white text-lg font-mono">$${getPriceString(coin.current_price)}</td>
                <td class="p-6 text-right">
                    <span class="inline-flex items-center font-black ${up ? 'text-secondary' : 'text-danger'} bg-transparent font-mono">
                        <i data-lucide="${up ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 mr-1"></i>
                        ${Math.abs(percentChange).toFixed(2)}%
                    </span>
                </td>
                <td class="p-6 text-right font-bold text-slate-500 dark:text-slate-400 font-mono">
                    $${coin.market_cap.toLocaleString()}
                </td>
                <td class="p-6">
                    <div class="w-24 h-10 mx-auto">
                        ${getSparklineSvg(coin.sparkline_in_7d.price, up)}
                    </div>
                </td>
                <td class="p-6">
                    <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                        <button onclick="handleFavoriteClick('${coin.id}')" class="p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${isFav ? 'text-yellow-500' : 'text-slate-400'}">
                            <i data-lucide="star" class="w-5 h-5 ${isFav ? 'fill-yellow-500' : ''}"></i>
                        </button>
                        <button onclick="handleCompareClick('${coin.id}')" class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm">
                            <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    tableBody.innerHTML = rowsHtml;

    document.getElementById('page-info').textContent = `Total Assets: ${filteredList.length} | Page ${pageNumber}`;
    document.getElementById('prev-page').disabled = pageNumber === 1;
    document.getElementById('next-page').disabled = pageNumber >= Math.ceil(filteredList.length / itemsPerPage);

    lucide.createIcons();
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

    const strokeColor = up ? '#0ECB81' : '#F6465D';

    return `
        <svg viewBox="0 0 100 40" class="overflow-visible">
            <polyline fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pathPoints}" />
        </svg>
    `;
}

function getPriceString(p) {
    if (!p) return '0.00';
    if (p >= 1) {
        return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return p.toFixed(6);
}

function addEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', function () {
        if (currentTheme === 'dark') {
            currentTheme = 'light';
            document.documentElement.classList.remove('dark');
        } else {
            currentTheme = 'dark';
            document.documentElement.classList.add('dark');
        }
        localStorage.setItem('crypto_theme', currentTheme);
    });

    const searchInput = document.getElementById('coin-search');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            searchText = e.target.value.toLowerCase();
            runFilters();
        });
    }

    document.getElementById('filter-all').addEventListener('click', function () {
        selectedFilter = 'all';
        refreshFilterButtons();
        runFilters();
    });

    document.getElementById('filter-gainers').addEventListener('click', function () {
        selectedFilter = 'gainers';
        refreshFilterButtons();
        runFilters();
    });

    document.getElementById('filter-losers').addEventListener('click', function () {
        selectedFilter = 'losers';
        refreshFilterButtons();
        runFilters();
    });

    document.getElementById('prev-page').addEventListener('click', function () {
        if (pageNumber > 1) {
            pageNumber--;
            displayCoinsTable();
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    });

    document.getElementById('next-page').addEventListener('click', function () {
        const maxPages = Math.ceil(filteredList.length / itemsPerPage);
        if (pageNumber < maxPages) {
            pageNumber++;
            displayCoinsTable();
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    });
}

function refreshFilterButtons() {
    const btnAll = document.getElementById('filter-all');
    const btnGainers = document.getElementById('filter-gainers');
    const btnLosers = document.getElementById('filter-losers');

    const buttonsList = [btnAll, btnGainers, btnLosers];

    for (let i = 0; i < buttonsList.length; i++) {
        let b = buttonsList[i];
        b.classList.remove('bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900', 'shadow-lg');
        b.classList.add('bg-white', 'dark:bg-[#1E2329]', 'text-slate-500', 'border', 'border-slate-200', 'dark:border-dark-border');
    }

    let currentBtn;
    if (selectedFilter === 'all') currentBtn = btnAll;
    if (selectedFilter === 'gainers') currentBtn = btnGainers;
    if (selectedFilter === 'losers') currentBtn = btnLosers;

    if (currentBtn) {
        currentBtn.classList.add('bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900', 'shadow-lg');
        currentBtn.classList.remove('bg-white', 'dark:bg-[#1E2329]', 'text-slate-500', 'border', 'border-slate-200', 'dark:border-dark-border');
    }
}

function runFilters() {
    let result = coinsList.filter(function (item) {
        const nameMatch = item.name.toLowerCase().includes(searchText);
        const symbolMatch = item.symbol.toLowerCase().includes(searchText);
        return nameMatch || symbolMatch;
    });

    if (selectedFilter === 'gainers') {
        result = result.filter(function (item) {
            return item.price_change_percentage_24h > 0;
        });
    } else if (selectedFilter === 'losers') {
        result = result.filter(function (item) {
            return item.price_change_percentage_24h < 0;
        });
    }

    filteredList = result;
    pageNumber = 1;
    displayCoinsTable();
}

function checkRoute() {
    const hash = window.location.hash || '#/';
    if (hash === '#/compare') {
        currentView = 'compare';
    } else if (hash === '#/favorites') {
        currentView = 'favorites';
    } else {
        currentView = 'dashboard';
    }

    const dashDiv = document.getElementById('view-dashboard');
    const compareDiv = document.getElementById('view-compare');
    const favDiv = document.getElementById('view-favorites');

    dashDiv.classList.add('hidden');
    compareDiv.classList.add('hidden');
    favDiv.classList.add('hidden');

    if (currentView === 'dashboard') {
        dashDiv.classList.remove('hidden');
    } else if (currentView === 'compare') {
        compareDiv.classList.remove('hidden');
        displayComparison();
    } else if (currentView === 'favorites') {
        favDiv.classList.remove('hidden');
        displayFavorites();
    }
    refreshNavBar();
}

function refreshNavBar() {
    const navDashboard = document.getElementById('nav-dashboard');
    const navCompare = document.getElementById('nav-compare');
    const navFavorites = document.getElementById('nav-favorites');

    const navLinks = [navDashboard, navCompare, navFavorites];

    for (let i = 0; i < navLinks.length; i++) {
        let link = navLinks[i];
        link.classList.remove('active', 'text-slate-900', 'dark:text-white');
        link.classList.add('text-slate-500');
    }

    let activeLink;
    if (currentView === 'dashboard') activeLink = navDashboard;
    else if (currentView === 'compare') activeLink = navCompare;
    else if (currentView === 'favorites') activeLink = navFavorites;

    if (activeLink) {
        activeLink.classList.remove('text-slate-500');
        activeLink.classList.add('active', 'text-slate-900', 'dark:text-white');
    }
}

window.handleFavoriteClick = function (id) {
    if (favoriteCoins.includes(id)) {
        favoriteCoins = favoriteCoins.filter(function (favId) {
            return favId !== id;
        });
    } else {
        favoriteCoins.push(id);
    }
    localStorage.setItem('crypto_favorites', JSON.stringify(favoriteCoins));
    displayCoinsTable();
    if (currentView === 'favorites') {
        displayFavorites();
    }
};

window.handleCompareClick = function (id) {
    const coinObj = coinsList.find(function (c) {
        return c.id === id;
    });
    if (!coinObj) return;

    let count = 0;
    if (comparisonList[0]) count++;
    if (comparisonList[1]) count++;

    const alreadyIn = comparisonList.some(function (item) {
        return item && item.id === id;
    });

    if (count >= 2 && !alreadyIn) {
        showNotification("Error: You can only compare 2 coins at a time. Remove one first!");
        return;
    }

    if (!comparisonList[0]) {
        comparisonList[0] = coinObj;
        showNotification(`Added ${coinObj.name} to comparison`);
    } else if (!comparisonList[1]) {
        if (comparisonList[0].id !== id) {
            comparisonList[1] = coinObj;
            showNotification(`Added ${coinObj.name} to comparison`);
        } else {
            showNotification(`Error: ${coinObj.name} is already being compared`);
        }
    }
    if (currentView === 'compare') {
        displayComparison();
    }
};

function displayComparison() {
    for (let i = 0; i < 2; i++) {
        const slotDiv = document.getElementById(`compare-slot-${i}`);
        const coin = comparisonList[i];

        if (!coin) {
            slotDiv.className = "glass rounded-[40px] border-2 border-dashed border-slate-300 dark:border-[#2B3139] flex items-center justify-center p-12 transition-all hover:border-slate-400 dark:hover:border-slate-500 group relative overflow-hidden bg-white/20 dark:bg-[#1E2329]/20 backdrop-blur-xl h-full min-h-[400px]";
            slotDiv.innerHTML = `
                <div class="text-center group-hover:scale-110 transition-transform duration-500 z-10">
                    <div class="bg-slate-200 dark:bg-slate-800 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 group-hover:bg-white dark:group-hover:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300">
                        <i data-lucide="line-chart" class="w-10 h-10"></i>
                    </div>
                    <h3 class="text-2xl font-black mb-3 text-slate-900 dark:text-white font-orbitron">Asset ${i + 1}</h3>
                    <p class="text-slate-500 font-medium tracking-wide">Select a coin from the dashboard to compare.</p>
                </div>
            `;
        } else {
            slotDiv.className = "flex items-center justify-center transition-all relative overflow-hidden h-full min-h-[400px] rounded-[40px] border border-slate-200/50 dark:border-slate-700/50 glass bg-white/40 dark:bg-[#1E2329]/60 backdrop-blur-2xl shadow-xl hover:border-slate-300 dark:hover:border-slate-500 group";
            slotDiv.innerHTML = `
                <div class="w-full h-full flex flex-col p-8 sm:p-10 animate-in zoom-in-95 duration-500 relative z-10 w-full">
                    <div class="absolute -top-32 -right-32 w-72 h-72 bg-slate-300/20 dark:bg-white/5 rounded-full blur-[60px] pointer-events-none transition-transform group-hover:scale-125 duration-700"></div>
                    <div class="absolute -bottom-32 -left-32 w-72 h-72 bg-slate-300/20 dark:bg-white/5 rounded-full blur-[60px] pointer-events-none transition-transform group-hover:scale-125 duration-700"></div>

                    <button onclick="removeCoinFromCompare(${i})" class="absolute top-6 right-6 p-3 rounded-2xl bg-white/50 dark:bg-[#181A20]/50 hover:bg-danger/10 hover:text-danger text-slate-400 dark:text-slate-500 transition-all backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 z-20 shadow-sm">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                    
                    <div class="flex items-center gap-6 mb-12 relative z-10">
                        <div class="relative group-hover:-translate-y-1 transition-transform duration-500">
                            <img src="${coin.image}" class="w-24 h-24 sm:w-28 sm:h-28 rounded-[32px] shadow-2xl p-1.5 bg-white dark:bg-[#181A20] border border-slate-200/50 dark:border-slate-700/50 object-cover relative z-10">
                            <div class="absolute -inset-2 bg-gradient-to-tr from-slate-200 to-white dark:from-white/10 dark:to-white/5 rounded-[2.5rem] blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </div>
                        <div>
                            <h3 class="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white font-orbitron tracking-tight leading-none">${coin.name}</h3>
                            <div class="flex items-center gap-2 mt-3"><div class="w-2 h-2 rounded-full bg-slate-400 dark:bg-white animate-pulse"></div><p class="text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] font-black text-sm">${coin.symbol}</p></div>
                        </div>
                    </div>
                    
                    <div class="space-y-4 relative z-10 flex-grow">
                        ${getCompareRowHtml('Price', `$${getPriceString(coin.current_price)}`, 'dollar-sign')}
                        ${getCompareRowHtml('Market Cap', `$${(coin.market_cap / 1e9).toFixed(1)}B`, 'layers')}
                        ${getCompareRowHtml('24h Change', `${coin.price_change_percentage_24h.toFixed(2)}%`, 'activity', coin.price_change_percentage_24h >= 0)}
                        ${getCompareRowHtml('Rank', `#${coin.market_cap_rank}`, 'hash')}
                    </div>
                </div>
            `;
        }
    }
    lucide.createIcons();
}

function getCompareRowHtml(label, value, icon, isPositive = null) {
    let colorText = 'text-slate-900 dark:text-white';
    let bgIcon = 'bg-slate-200 dark:bg-[#181A20] group-hover:bg-white dark:group-hover:bg-slate-700';
    let colorIcon = 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white';

    if (isPositive === true) {
        colorText = 'text-secondary';
        bgIcon = 'bg-secondary/10';
        colorIcon = 'text-secondary';
    }
    if (isPositive === false) {
        colorText = 'text-danger';
        bgIcon = 'bg-danger/10';
        colorIcon = 'text-danger';
    }

    return `
        <div class="flex items-center justify-between p-5 rounded-3xl bg-white/60 dark:bg-[#1E2329]/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 transition-all hover:scale-[1.02] hover:bg-white dark:hover:bg-[#2B3139] hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 group">
            <div class="flex items-center gap-4 ${colorIcon} transition-colors">
                <div class="p-2.5 rounded-2xl ${bgIcon} transition-colors">
                    <i data-lucide="${icon}" class="w-4 h-4"></i>
                </div>
                <span class="text-xs font-black uppercase tracking-[0.2em]">${label}</span>
            </div>
            <span class="text-xl font-black ${colorText} font-mono">${value}</span>
        </div>
    `;
}

window.removeCoinFromCompare = function (idx) {
    comparisonList[idx] = null;
    displayComparison();
};

function showNotification(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-10 right-10 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-3xl shadow-2xl glass font-bold flex items-center gap-4 animate-in slide-in-from-right duration-500';
    if (msg.includes('Error')) {
        toast.innerHTML = `<i data-lucide="alert-circle" class="w-6 h-6 text-danger"></i><span>${msg}</span>`;
    } else {
        toast.innerHTML = `<i data-lucide="check-circle" class="w-6 h-6 text-secondary"></i><span>${msg}</span>`;
    }
    document.body.appendChild(toast);
    lucide.createIcons();
    setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(function () {
            toast.remove();
        }, 500);
    }, 3000);
}

function displayErrorMessage(msg) {
    const tableBody = document.getElementById('coin-table-body');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-20 text-center text-danger font-bold">${msg}</td></tr>`;
    }
}

function displayFavorites() {
    const favGrid = document.getElementById('favorites-grid');
    if (!favGrid) return;

    if (favoriteCoins.length === 0) {
        favGrid.innerHTML = `
            <div class="col-span-full glass p-12 rounded-[32px] text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                <i data-lucide="star" class="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-6"></i>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2 font-orbitron">No Favorites Yet</h3>
                <p class="text-slate-500 font-medium max-w-md mx-auto">Go to the Dashboard and click the star icon on any coin to build your personalized watchlist.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const favCoinsData = favoriteCoins.map(function (id) {
        return coinsList.find(function (c) {
            return c.id === id;
        });
    }).filter(Boolean);

    let htmlContent = '';
    for (let i = 0; i < favCoinsData.length; i++) {
        let coin = favCoinsData[i];
        const change = coin.price_change_percentage_24h || 0;
        const up = change >= 0;
        htmlContent += `
            <div class="glass p-6 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 hover:scale-[1.03] transition-all group relative overflow-hidden flex flex-col h-full bg-white/40 dark:bg-[#1E2329]/40 backdrop-blur-xl">
                <div class="absolute -right-10 -top-10 w-32 h-32 bg-slate-300/20 dark:bg-white/5 rounded-full blur-[40px] group-hover:bg-white/20 dark:group-hover:bg-white/10 transition-all z-0"></div>
                <button onclick="handleFavoriteClick('${coin.id}')" class="absolute top-4 right-4 z-10 p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-yellow-500 shadow-sm glass">
                    <i data-lucide="star" class="w-5 h-5 fill-yellow-500"></i>
                </button>
                <div class="flex items-center gap-4 mb-6 relative z-10">
                    <img src="${coin.image}" alt="${coin.name}" class="w-14 h-14 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 group-hover:scale-110 transition-transform">
                    <div>
                        <h3 class="font-black text-slate-900 dark:text-white text-xl leading-tight">${coin.name}</h3>
                        <p class="text-xs uppercase font-black text-slate-500 tracking-[0.2em] mt-1">${coin.symbol}</p>
                    </div>
                </div>
                <div class="space-y-2 relative z-10 flex-grow">
                    <p class="text-[28px] font-black text-slate-900 dark:text-white font-mono leading-none">$${getPriceString(coin.current_price)}</p>
                    <div class="flex items-center justify-between pt-2">
                        <div class="flex items-center gap-1.5 text-slate-500">
                            <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                            <p class="text-xs font-bold font-mono">$${(coin.market_cap / 1e9).toFixed(1)}B</p>
                        </div>
                        <span class="inline-flex items-center font-black ${up ? 'text-secondary bg-secondary/10' : 'text-danger bg-danger/10'} text-xs font-mono px-2 py-1 rounded-lg">
                            <i data-lucide="${up ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 mr-0.5"></i>
                            ${Math.abs(change).toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div class="w-full h-14 mt-6 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                    ${getSparklineSvg(coin.sparkline_in_7d.price, up)}
                </div>
            </div>
        `;
    }
    favGrid.innerHTML = htmlContent;
    lucide.createIcons();
}
