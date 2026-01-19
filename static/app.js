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

// Create HTML for a place card
function createPlaceCard(place) {
    const tags = (place.content?.tags || []).slice(0, 4);
    const rating = place.stats?.rating || 'N/A';
    const reviews = place.stats?.review_count || 0;
    const rank = place.stats?.popularity_rank || '-';
    const cluster = place.location?.cluster_zone || 'Unknown';
    const photoRef = place.content?.photo_reference;
    const photoUrl = photoRef ? `/api/photo/${photoRef}` : null;

    return `
        <div class="place-card" data-place-id="${place.id}" onclick="openPlaceModal('${place.id}')">`
        + (photoUrl ? `
            <div class="place-photo" style="background-image: url('${photoUrl}')"></div>
            ` : `
            <div class="place-photo place-photo-placeholder"></div>
            `) + `
            <div class="place-content">
                <div class="place-rank">#${rank}</div>
                <h3 class="place-name">${escapeHtml(place.name)}</h3>
                <div class="place-cluster">📍 ${escapeHtml(cluster)}</div>
                <div class="place-stats">
                    <span class="place-stat">
                        <span class="icon">⭐</span>
                        ${rating}
                    </span>
                    <span class="place-stat">
                        <span class="icon">💬</span>
                        ${reviews.toLocaleString()} reviews
                    </span>
                </div>
                <div class="place-tags">
                    ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
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

    body.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${escapeHtml(place.name)}</h2>
            <p class="modal-subtitle">📍 ${escapeHtml(place.location?.cluster_zone || 'Unknown')} • ${escapeHtml(place.location?.address || '')}</p>
        </div>
        
        <div class="modal-section">
            <p style="color: var(--text-secondary)">${escapeHtml(summary)}</p>
        </div>
        
        <div class="modal-section">
            <h4 class="modal-section-title">Stats</h4>
            <div class="modal-stats-grid">
                <div class="modal-stat">
                    <div class="modal-stat-value">#${place.stats?.popularity_rank || '-'}</div>
                    <div class="modal-stat-label">Popularity Rank</div>
                </div>
                <div class="modal-stat">
                    <div class="modal-stat-value">⭐ ${place.stats?.rating || 'N/A'}</div>
                    <div class="modal-stat-label">${(place.stats?.review_count || 0).toLocaleString()} reviews</div>
                </div>
                <div class="modal-stat">
                    <div class="modal-stat-value">${timeSpent} min</div>
                    <div class="modal-stat-label">Avg. Time Spent</div>
                </div>
                <div class="modal-stat">
                    <div class="modal-stat-value">${difficulty}</div>
                    <div class="modal-stat-label">Difficulty</div>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h4 class="modal-section-title">Best Time to Visit</h4>
            <p style="color: var(--text-secondary)">${escapeHtml(bestTime)}</p>
        </div>
        
        ${tips.length > 0 ? `
        <div class="modal-section">
            <h4 class="modal-section-title">Tips</h4>
            <ul class="modal-tips">
                ${tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div class="modal-section">
            <h4 class="modal-section-title">Tags</h4>
            <div class="place-tags">
                ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
        
        ${place.location?.google_maps_link ? `
        <div class="modal-section" style="margin-top: 24px">
            <a href="${place.location.google_maps_link}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 500;">
                🗺️ Open in Google Maps →
            </a>
        </div>
        ` : ''}
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
