// static/client.js
const scrapeBtn = document.getElementById('scrape');
const urlInput = document.getElementById('url');
const statusSpan = document.getElementById('status');
const statusDetail = document.getElementById('status-detail');
const spinner = document.getElementById('spinner');
const sectionsContainer = document.getElementById('sections');
const errorsDiv = document.getElementById('errors');
const downloadBtn = document.getElementById('download');
const copyJsonBtn = document.getElementById('copy-json');
const emptyState = document.getElementById('empty-state');

const metaCard = document.getElementById('meta-card');
const metaTitle = document.getElementById('meta-title');
const metaDesc = document.getElementById('meta-desc');
const metaLangBadge = document.getElementById('meta-lang-badge');
const metaCanonical = document.getElementById('meta-canonical');
const metaStrategy = document.getElementById('meta-strategy');
const scrapedTime = document.getElementById('scraped-time');

const pagesCount = document.getElementById('pages-count');
const clicksCount = document.getElementById('clicks-count');
const clicksList = document.getElementById('clicks-list');
const scrollsCount = document.getElementById('scrolls-count');
const scrapedAt = document.getElementById('scraped-at');
const scrapeDuration = document.getElementById('scrape-duration');

const statSections = document.getElementById('stat-sections');
const statLinks = document.getElementById('stat-links');
const statImages = document.getElementById('stat-images');
const statTime = document.getElementById('stat-time');

let lastResult = null;
let scrapingStartTime = 0;

// Initialize simple particles
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 10 + 5;
        const left = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}%`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        particlesContainer.appendChild(particle);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initParticles();
    
    // Remove problematic UI functions that don't have backend support
    // Keep only assignment-required functionality
    
    // Focus on URL input
    urlInput.focus();
});

// Simple toast notification
function showToast(message, type = 'info') {
    // Create simple alert instead of complex toast
    console.log(`${type}: ${message}`);
}

// Show/hide spinner
function showSpinner(text = 'Scraping...', detail = 'Fetching page content') {
    spinner.classList.remove('hidden');
    statusSpan.textContent = text;
    if (statusDetail) statusDetail.textContent = detail;
    scrapingStartTime = Date.now();
    
    // Update time display
    const timeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - scrapingStartTime) / 1000);
        if (statTime) statTime.textContent = `${elapsed}s`;
        if (statusDetail) statusDetail.textContent = `Elapsed: ${elapsed}s`;
    }, 1000);
    
    // Store interval ID
    spinner.dataset.intervalId = timeInterval;
}

function hideSpinner() {
    spinner.classList.add('hidden');
    const intervalId = spinner.dataset.intervalId;
    if (intervalId) clearInterval(intervalId);
}

// Validate URL
function validUrl(u) {
    try {
        const url = new URL(u);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// Event Listeners
scrapeBtn.onclick = doScrape;
urlInput.addEventListener('keyup', (e) => { 
    if (e.key === 'Enter') doScrape();
});

// Main Scraping Function - KEEP THIS SIMPLE AND WORKING
async function doScrape() {
    const url = urlInput.value.trim();
    
    // Clear previous results
    if (errorsDiv) {
        errorsDiv.classList.add('hidden');
        errorsDiv.innerHTML = '';
    }
    sectionsContainer.innerHTML = '';
    if (metaCard) metaCard.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    
    // Validate URL
    if (!url || !validUrl(url)) {
        if (errorsDiv) {
            errorsDiv.classList.remove('hidden');
            errorsDiv.textContent = 'Please enter a valid URL (include https://)';
        }
        urlInput.classList.add('border-red-500');
        return;
    }
    
    urlInput.classList.remove('border-red-500');
    showSpinner('Scraping website', 'Please wait...');
    
    try {
        const res = await fetch('/scrape', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({detail: 'Unknown error'}));
            throw new Error(err.detail || JSON.stringify(err));
        }

        const data = await res.json();
        lastResult = data.result;
        
        // Render results
        renderResult(lastResult);
        
        hideSpinner();
        
    } catch (e) {
        if (errorsDiv) {
            errorsDiv.classList.remove('hidden');
            errorsDiv.textContent = 'Error: ' + e.toString();
        }
        hideSpinner();
    }
}

// Render results - SIMPLIFIED BUT KEEPING GOOD UI
function renderResult(result) {
    if (!result) return;
    
    // Show errors if any
    if (result.errors && result.errors.length && errorsDiv) {
        errorsDiv.classList.remove('hidden');
        errorsDiv.innerHTML = `
            <div class="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <div class="flex items-center gap-2 text-yellow-300">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${result.errors.length} warning(s) during scraping</span>
                </div>
                <div class="mt-2 text-sm">${result.errors.map(x => x.message).join(' • ')}</div>
            </div>
        `;
    }

    // Update meta information
    if (metaTitle) metaTitle.textContent = result.meta.title || 'Untitled';
    if (metaDesc) metaDesc.textContent = result.meta.description || 'No description available';
    
    if (metaLangBadge) {
        metaLangBadge.textContent = result.meta.language?.toUpperCase() || '??';
        metaLangBadge.className = result.meta.language ? 
            'badge bg-blue-500/20 text-blue-300' : 
            'badge bg-gray-500/20 text-gray-300';
    }
    
    if (metaCanonical) {
        metaCanonical.innerHTML = result.meta.canonical ? 
            `<a href="${result.meta.canonical}" class="text-blue-300 hover:text-white underline" target="_blank">
                ${new URL(result.meta.canonical).hostname}
            </a>` : 
            'No canonical URL';
    }
    
    // Show meta card
    if (metaCard) {
        metaCard.classList.remove('hidden');
    }
    
    // Update interactions
    const pages = result.interactions?.pages || [];
    const clicks = result.interactions?.clicks || [];
    const scrolls = result.interactions?.scrolls || 0;
    
    if (pagesCount) pagesCount.textContent = pages.length;
    if (clicksCount) clicksCount.textContent = clicks.length;
    if (scrollsCount) scrollsCount.textContent = scrolls;
    
    // Render clicks
    if (clicksList) {
        clicksList.innerHTML = '';
        clicks.forEach(click => {
            const div = document.createElement('div');
            div.className = 'text-sm py-1 flex items-center gap-2';
            div.innerHTML = `<i class="fas fa-mouse-pointer text-purple-300"></i> ${click}`;
            clicksList.appendChild(div);
        });
    }
    
    // Update time
    if (result.scrapedAt && scrapedAt) {
        const date = new Date(result.scrapedAt);
        scrapedAt.textContent = date.toLocaleTimeString();
    }
    
    // Update stats
    if (statSections) statSections.textContent = result.sections?.length || 0;
    
    let totalLinks = 0;
    let totalImages = 0;
    if (result.sections) {
        result.sections.forEach(s => {
            totalLinks += s.content?.links?.length || 0;
            totalImages += s.content?.images?.length || 0;
        });
    }
    if (statLinks) statLinks.textContent = totalLinks;
    if (statImages) statImages.textContent = totalImages;

    // Render sections - SIMPLIFIED BUT FUNCTIONAL
    sectionsContainer.innerHTML = '';
    const secs = result.sections || [];
    
    if (!secs.length) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    secs.forEach((s, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'glass-card p-0 overflow-hidden mb-6 section-card';
        
        // Section header
        const header = document.createElement('div');
        header.className = 'p-6 border-b border-white/10';
        header.innerHTML = `
            <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="badge badge-${s.type || 'unknown'}">
                            ${s.type || 'unknown'}
                        </div>
                        <span class="text-xs px-2 py-1 bg-white/10 rounded">#${s.id}</span>
                    </div>
                    <h3 class="text-lg font-semibold mb-1">${escapeHtml(s.label || 'Section')}</h3>
                    <div class="text-sm text-gray-300">
                        ${s.sourceUrl ? new URL(s.sourceUrl).hostname : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="toggle-btn neumorphic-btn px-3 py-2 rounded-lg text-sm" data-index="${idx}">
                        <i class="fas fa-eye mr-1"></i> Show
                    </button>
                    <button class="copy-btn neumorphic-btn px-3 py-2 rounded-lg text-sm" data-index="${idx}">
                        <i class="fas fa-copy mr-1"></i> Copy
                    </button>
                </div>
            </div>
        `;
        
        // Content area (initially hidden)
        const contentArea = document.createElement('div');
        contentArea.className = 'section-content p-6 pt-0 hidden';
        contentArea.id = `section-content-${idx}`;
        
        // Content
        let contentHTML = '';
        
        // Headings
        if (s.content?.headings?.length) {
            contentHTML += `
                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">Headings</h4>
                    <div class="space-y-1">
                        ${s.content.headings.map(h => `
                            <div class="px-3 py-2 bg-white/5 rounded-lg">${escapeHtml(h)}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Text
        if (s.content?.text) {
            contentHTML += `
                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">Text Content</h4>
                    <div class="p-3 bg-white/5 rounded-lg text-gray-200 max-h-60 overflow-y-auto">
                        ${escapeHtml(s.content.text)}
                    </div>
                </div>
            `;
        }
        
        // Lists
        if (s.content?.lists?.length) {
            contentHTML += `
                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">Lists</h4>
                    <div class="space-y-3">
                        ${s.content.lists.map((list, listIdx) => `
                            <div class="p-3 bg-white/5 rounded-lg">
                                <ul class="list-disc list-inside space-y-1">
                                    ${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Links
        if (s.content?.links?.length) {
            const displayLinks = s.content.links.slice(0, 5);
            contentHTML += `
                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">Links (${s.content.links.length})</h4>
                    <div class="flex flex-wrap gap-2">
                        ${displayLinks.map(l => `
                            <a href="${l.href}" target="_blank" 
                               class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm">
                                ${l.text || new URL(l.href).hostname || 'Link'}
                            </a>
                        `).join('')}
                        ${s.content.links.length > 5 ? `
                            <div class="px-3 py-1 bg-gray-500/20 rounded-lg text-sm">
                                +${s.content.links.length - 5} more
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Images
        if (s.content?.images?.length) {
            const displayImages = s.content.images.slice(0, 3);
            contentHTML += `
                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">Images (${s.content.images.length})</h4>
                    <div class="grid grid-cols-3 gap-3">
                        ${displayImages.map(img => `
                            <div class="bg-white/5 rounded-lg overflow-hidden">
                                <img src="${img.src}" alt="${img.alt}" 
                                     class="w-full h-20 object-cover"
                                     onerror="this.onerror=null;this.src='https://via.placeholder.com/150/667eea/ffffff?text=Image+Error'">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Raw HTML
        contentHTML += `
            <div class="mt-4">
                <h4 class="text-sm font-semibold text-gray-300 mb-2">Raw HTML ${s.truncated ? '(Truncated)' : ''}</h4>
                <pre class="bg-gray-900 p-4 rounded-lg text-xs text-gray-300 overflow-auto max-h-60">
${escapeHtml(s.rawHtml || 'No HTML available')}</pre>
            </div>
        `;
        
        contentArea.innerHTML = contentHTML;
        
        wrapper.appendChild(header);
        wrapper.appendChild(contentArea);
        sectionsContainer.appendChild(wrapper);
        
        // Add event listeners
        const toggleBtn = wrapper.querySelector('.toggle-btn');
        const copyBtn = wrapper.querySelector('.copy-btn');
        
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = this.getAttribute('data-index');
            toggleSection(index);
        });
        
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = this.getAttribute('data-index');
            copySectionText(index);
        });
        
        // Click on header to toggle
        header.addEventListener('click', function(e) {
            if (!e.target.closest('button')) {
                const index = this.querySelector('.toggle-btn').getAttribute('data-index');
                toggleSection(index);
            }
        });
    });
    
    // Hide empty state
    if (emptyState) emptyState.classList.add('hidden');
}

// Toggle section visibility
function toggleSection(index) {
    const content = document.getElementById(`section-content-${index}`);
    const btn = document.querySelector(`.toggle-btn[data-index="${index}"]`);
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerHTML = '<i class="fas fa-eye-slash mr-1"></i> Hide';
    } else {
        content.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-eye mr-1"></i> Show';
    }
}

// Copy section text
async function copySectionText(index) {
    if (!lastResult?.sections?.[index]) return;
    const text = lastResult.sections[index].content?.text || '';
    try {
        await navigator.clipboard.writeText(text);
        const btn = document.querySelector(`.copy-btn[data-index="${index}"]`);
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check mr-1"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    } catch (e) {
        console.error('Copy failed:', e);
    }
}

// HTML escaping
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Download JSON
downloadBtn.onclick = () => {
    if (!lastResult) {
        alert('No data to download. Please scrape a website first.');
        return;
    }
    const blob = new Blob([JSON.stringify(lastResult, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrape-result-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Copy JSON
copyJsonBtn.onclick = async () => {
    if (!lastResult) {
        alert('No data to copy. Please scrape a website first.');
        return;
    }
    try {
        await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
        const originalHTML = copyJsonBtn.innerHTML;
        copyJsonBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Copied!';
        setTimeout(() => {
            copyJsonBtn.innerHTML = originalHTML;
        }, 2000);
    } catch(e) {
        alert('Failed to copy JSON: ' + e.message);
    }
};

// Remove problematic functions from HTML
// These will be handled by removing the onclick attributes

// Keep only working UI functions
function toggleAllSections() {
    document.querySelectorAll('.section-content').forEach((content, index) => {
        content.classList.remove('hidden');
        const btn = document.querySelector(`.toggle-btn[data-index="${index}"]`);
        if (btn) btn.innerHTML = '<i class="fas fa-eye-slash mr-1"></i> Hide';
    });
}

function collapseAllSections() {
    document.querySelectorAll('.section-content').forEach((content, index) => {
        content.classList.add('hidden');
        const btn = document.querySelector(`.toggle-btn[data-index="${index}"]`);
        if (btn) btn.innerHTML = '<i class="fas fa-eye mr-1"></i> Show';
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Remove non-functional buttons by cleaning up HTML
document.addEventListener('DOMContentLoaded', function() {
    // Remove problematic buttons that don't work
    const nonFunctionalButtons = [
        'exportAsCSV',
        'clearResults',
        'showRecentUrls',
        'loadExample',
        'copyMeta',
        'refreshPage'
    ];
    
    // Remove onclick attributes for buttons that don't have backend support
    const buttonsToClean = document.querySelectorAll('[onclick]');
    buttonsToClean.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        nonFunctionalButtons.forEach(func => {
            if (onclick && onclick.includes(func)) {
                btn.removeAttribute('onclick');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Feature not implemented';
            }
        });
    });
});