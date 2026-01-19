/**
 * Kodaikanal Explorer - Frontend App
 * Google Places Autocomplete + Pipeline Integration
 */

let autocomplete;
let selectedPlace = null;
let placesMap = {}; // Store places by ID for safe click handling
let currentPlaces = []; // Store list of places for filtering

// Initialize Google Places Autocomplete
function initAutocomplete() {
    const input = document.getElementById('place-input');

    // Configure autocomplete
    autocomplete = new google.maps.places.Autocomplete(input, {
        // Bias results to Kodaikanal region
        bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(10.15, 77.35),  // SW corner
            new google.maps.LatLng(10.35, 77.55)   // NE corner
        ),
        componentRestrictions: { country: 'in' },
        fields: ['name', 'place_id', 'formatted_address', 'geometry'],
        strictBounds: false
    });

    // Handle place selection
    autocomplete.addListener('place_changed', onPlaceSelected);

    // Enable button when input has value
    input.addEventListener('input', () => {
        document.getElementById('fetch-btn').disabled = input.value.trim() === '';
    });

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !document.getElementById('fetch-btn').disabled) {
            e.preventDefault();
            fetchPlace();
        }
    });

    // Setup filters
    setupFilters();

    // Load existing places
    loadPlaces();
}

const CATEGORY_TAGS = {
    nature: ['park', 'garden', 'lake', 'waterfall', 'forest', 'flora', 'nature', 'botanical'],
    viewpoints: ['viewpoint', 'scenic', 'mountain view', 'valley view', 'panoramic'],
    adventure: ['trekking', 'hiking', 'adventure', 'off-roading', 'boating', 'camping', 'cave'],
    culture: ['museum', 'temple', 'church', 'history', 'art', 'religious', 'science'],
    family: ['family', 'picnic', 'relaxing', 'shopping', 'chocolate', 'entertainment']
};

function setupFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter places
            const category = btn.dataset.category;
            filterPlaces(category);
        });
    });
}

function filterPlaces(category) {
    const grid = document.getElementById('places-grid');
    const emptyState = document.getElementById('empty-state');

    let filtered = currentPlaces;

    if (category !== 'all') {
        const targetTags = CATEGORY_TAGS[category] || [];
        filtered = currentPlaces.filter(place => {
            const placeTags = (place.content?.tags || []).map(t => t.toLowerCase());
            // Check if place has any of the target tags OR if the place name contains category keywords
            return placeTags.some(tag => targetTags.some(target => tag.includes(target))) ||
                targetTags.some(target => place.name.toLowerCase().includes(target));
        });
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        document.getElementById('total-places').textContent = '0';
    } else {
        emptyState.classList.add('hidden');
        grid.innerHTML = filtered.map(place => createPlaceCard(place)).join('');
        document.getElementById('total-places').textContent = filtered.length;
    }
}

// Called when user selects a place from autocomplete
function onPlaceSelected() {
    selectedPlace = autocomplete.getPlace();

    if (selectedPlace && selectedPlace.name) {
        document.getElementById('fetch-btn').disabled = false;
    }
}

// Fetch place data via API
async function fetchPlace() {
    const input = document.getElementById('place-input');
    const btn = document.getElementById('fetch-btn');
    const placeName = input.value.trim();

    if (!placeName) return;

    // Show loading state
    btn.classList.add('loading');
    btn.disabled = true;
    showStatus('loading', `Fetching data for "${placeName}"... This may take 10-15 seconds.`);

    try {
        const response = await fetch('/api/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_name: placeName })
        });

        const data = await response.json();

        if (data.success) {
            // Check for distance warning
            const distanceInfo = data.place.distance_info;
            if (distanceInfo && distanceInfo.warning) {
                showStatus('warning', `⚠️ ${distanceInfo.warning}`);
                // Show modal after a delay so user sees the warning
                setTimeout(() => showResultModal(data.place), 1500);
            } else {
                showStatus('success', `✅ Successfully added "${data.place.name}" (Rank #${data.place.stats.popularity_rank})`);
                showResultModal(data.place);
            }
            loadPlaces(); // Refresh the grid
            input.value = '';
            selectedPlace = null;
        } else {
            showStatus('error', `❌ Error: ${data.error}`);
        }
    } catch (error) {
        showStatus('error', `❌ Network error: ${error.message}`);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Load and display all places
async function loadPlaces() {
    try {
        const response = await fetch('/api/places');
        const data = await response.json();

        const grid = document.getElementById('places-grid');
        const emptyState = document.getElementById('empty-state');
        const totalPlaces = document.getElementById('total-places');

        if (!data.places || data.places.length === 0) {
            totalPlaces.textContent = 0;
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        // Store places in global map for safe click handling
        placesMap = {};
        currentPlaces = data.places; // Store in global list for filtering

        data.places.forEach(place => {
            placesMap[place.id] = place;
        });

        // Initial render with 'all' filter
        filterPlaces('all');

    } catch (error) {
        console.error('Failed to load places:', error);
    }
}

// Sidebar Toggle Logic
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('sidebar-icon');
    const texts = document.querySelectorAll('.sidebar-text');

    // Toggle width
    if (sidebar.classList.contains('w-64')) {
        // Collapse
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-20');
        icon.style.transform = 'rotate(180deg)';

        // Hide text with opacity first for smooth transition
        texts.forEach(el => el.classList.add('opacity-0', 'pointer-events-none'));
    } else {
        // Expand
        sidebar.classList.remove('w-20');
        sidebar.classList.add('w-64');
        icon.style.transform = 'rotate(0deg)';

        // Show text
        texts.forEach(el => el.classList.remove('opacity-0', 'pointer-events-none'));
    }
}

// Create HTML for a place card
function createPlaceCard(place) {
    const tags = (place.content?.tags || []).slice(0, 3);
    const rating = place.stats?.rating || 'N/A';
    const reviews = place.stats?.review_count || 0;
    const rank = place.stats?.popularity_rank || '-';
    // const cluster = place.location?.cluster_zone || 'Unknown';
    const photoRef = place.content?.photo_reference;
    const photoUrl = photoRef ? `/api/photo/${photoRef}` : null;

    return `
        <div class="group bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full" 
             data-place-id="${place.id}" 
             onclick="openPlaceModal('${place.id}')">
            
            <!-- Photo/Rank Container - COMPACT HEIGHT (h-40) -->
            <div class="relative h-40 mb-3 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                 ${photoUrl ? `
                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                     style="background-image: url('${photoUrl}')"></div>
                ` : `
                <div class="absolute inset-0 flex items-center justify-center text-slate-300">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                `}
                
                <!-- Rank Badge -->
                <div class="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-900 shadow-sm border border-slate-200">
                    #${rank}
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 flex flex-col">
                <h3 class="font-bold text-slate-900 text-base leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">${escapeHtml(place.name)}</h3>
                
                <div class="flex items-center gap-3 text-xs font-medium text-slate-500 mb-3">
                    <div class="flex items-center gap-1">
                        <svg class="text-amber-400 fill-amber-400" width="10" height="10" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span class="text-slate-700 font-semibold">${rating}</span>
                        <span class="text-slate-400">(${reviews.toLocaleString()})</span>
                    </div>
                </div>

                <div class="mt-auto flex flex-wrap gap-1.5">
                    ${tags.map(tag => `
                        <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold tracking-wide border border-indigo-100">
                            ${escapeHtml(tag)}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Open modal for a place by ID
function openPlaceModal(placeId) {
    const place = placesMap[placeId];
    if (place) {
        showResultModal(place);
    }
}

// Show result in modal
function showResultModal(place) {
    const modal = document.getElementById('result-modal');
    const body = document.getElementById('modal-body');

    const difficulty = place.logic?.difficulty || 'Easy';
    const timeSpent = place.logic?.avg_time_spent_minutes || 60;
    const bestTime = place.content?.best_time_text || 'Anytime';
    const summary = place.content?.short_summary || 'No description available.';
    const tips = place.content?.tips || [];
    const tags = place.content?.tags || [];
    const photoRef = place.content?.photo_reference;
    const photoUrl = photoRef ? `/api/photo/${photoRef}` : null;

    body.innerHTML = `
        <!-- Hero Header -->
        <div class="relative h-64 bg-slate-900">
            ${photoUrl ? `
            <div class="absolute inset-0 bg-cover bg-center opacity-60" style="background-image: url('${photoUrl}')"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
            ` : `
            <div class="absolute inset-0 flex items-center justify-center text-slate-700">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            `}
            
            <div class="absolute bottom-0 left-0 right-0 p-8">
                <div class="flex items-end justify-between">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="px-2 py-0.5 rounded bg-white/10 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                Rank #${place.stats?.popularity_rank || '-'}
                            </span>
                             <span class="px-2 py-0.5 rounded bg-amber-400/20 backdrop-blur text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-400/20 flex items-center gap-1">
                                ⭐ ${place.stats?.rating || 'N/A'}
                            </span>
                        </div>
                        <h2 class="text-3xl font-bold text-white mb-1">${escapeHtml(place.name)}</h2>
                        <p class="text-slate-300 flex items-center gap-1 text-sm">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${escapeHtml(place.location?.cluster_zone || 'Unknown Location')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="p-8">
            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-4 mb-8">
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reviews</div>
                    <div class="font-semibold text-slate-900">${(place.stats?.review_count || 0).toLocaleString()}</div>
                </div>
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</div>
                    <div class="font-semibold text-slate-900">${timeSpent} min</div>
                </div>
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Difficulty</div>
                    <div class="font-semibold text-slate-900">${difficulty}</div>
                </div>
            </div>

            <!-- Content -->
            <div class="space-y-8">
                <div>
                    <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">About</h4>
                    <p class="text-slate-600 leading-relaxed text-sm">${escapeHtml(summary)}</p>
                </div>
                
                <div>
                    <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Best Time to Visit</h4>
                    <p class="text-slate-600 text-sm bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-indigo-900">
                        ${escapeHtml(bestTime)}
                    </p>
                </div>

                ${tips.length > 0 ? `
                <div>
                    <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Pro Tips</h4>
                    <ul class="space-y-2">
                        ${tips.map(tip => `
                            <li class="flex items-start gap-3 text-sm text-slate-600">
                                <span class="text-emerald-500 mt-0.5">✓</span>
                                <span>${escapeHtml(tip)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div>
                    <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Tags</h4>
                    <div class="flex flex-wrap gap-2">
                        ${tags.map(tag => `
                            <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                ${escapeHtml(tag)}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>

             ${place.location?.google_maps_link ? `
            <div class="mt-8 pt-6 border-t border-slate-100">
                <a href="${place.location.google_maps_link}" target="_blank" 
                   class="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                    <span>Open in Google Maps</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
            </div>
            ` : ''}
        </div>
    `;

    modal.classList.remove('hidden');
}

// Close modal
function closeModal() {
    document.getElementById('result-modal').classList.add('hidden');
}

// Show status message
function showStatus(type, message) {
    const container = document.getElementById('status-container');
    const messageEl = document.getElementById('status-message');

    messageEl.className = `status-message ${type}`;
    messageEl.textContent = message;
    container.classList.remove('hidden');

    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Attach fetch button click handler
document.getElementById('fetch-btn')?.addEventListener('click', fetchPlace);
