import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, MapPin, Link as LinkIcon, ExternalLink, X, ChevronDown, Grid3X3, Map, Loader2, Check, Plus, MapPinned } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

interface Place {
    id: string;
    name: string;
    location: {
        lat: number;
        lng: number;
        cluster_zone: string;
        google_maps_link?: string;
    };
    stats: {
        rating: number;
        review_count: number;
        popularity_rank: number;
    };
    logic: {
        avg_time_spent_minutes: number;
        difficulty: string;
    };
    content: {
        short_summary: string;
        tags: string[];
        tips: string[];
        best_time_text: string;
        photo_reference?: string;
        hero_image_url?: string;
    };
    sources: string[];
}

const CATEGORY_TAGS: Record<string, string[]> = {
    nature: ['park', 'garden', 'lake', 'waterfall', 'forest', 'flora', 'nature', 'botanical'],
    viewpoints: ['viewpoint', 'scenic', 'mountain view', 'valley view', 'panoramic'],
    adventure: ['trekking', 'hiking', 'adventure', 'off-roading', 'boating', 'camping', 'cave'],
    culture: ['museum', 'temple', 'church', 'history', 'art', 'religious', 'science'],
    family: ['family', 'picnic', 'relaxing', 'shopping', 'chocolate', 'entertainment']
};

interface AutocompleteSuggestion {
    id?: string;
    name: string;
    cluster?: string;
    place_id: string;
    in_database: boolean;
}

export function PlacesDatabase() {
    const [places, setPlaces] = useState<Place[]>([]);
    const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [sourcesExpanded, setSourcesExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [hoveredPlace, setHoveredPlace] = useState<Place | null>(null);

    // Autocomplete state
    const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [addingPlace, setAddingPlace] = useState<string | null>(null); // place_id being added
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch places on mount
    useEffect(() => {
        fetchPlaces();
    }, []);

    // Filter places when category or search changes
    useEffect(() => {
        let filtered = places;

        // Category filter
        if (activeCategory !== 'all') {
            const targetTags = CATEGORY_TAGS[activeCategory] || [];
            filtered = places.filter(place => {
                const placeTags = (place.content?.tags || []).map(t => t.toLowerCase());
                return placeTags.some(tag => targetTags.some(target => tag.includes(target))) ||
                    targetTags.some(target => place.name.toLowerCase().includes(target));
            });
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(place =>
                place.name.toLowerCase().includes(term) ||
                place.content?.tags?.some(t => t.toLowerCase().includes(term)) ||
                place.location?.cluster_zone?.toLowerCase().includes(term)
            );
        }

        setFilteredPlaces(filtered);
    }, [places, activeCategory, searchTerm]);

    const fetchPlaces = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.places);
            const data = await response.json();
            setPlaces(data.places || []);
            setFilteredPlaces(data.places || []);
        } catch (error) {
            console.error('Failed to load places:', error);
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (place: Place) => {
        if (place.content?.photo_reference) {
            return API_ENDPOINTS.photo(place.content.photo_reference);
        }
        if (place.content?.hero_image_url) {
            return place.content.hero_image_url;
        }
        return null;
    };

    // Debounced autocomplete search
    const handleSearchChange = useCallback((value: string) => {
        setSearchTerm(value);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (value.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Debounce the API call
        debounceRef.current = setTimeout(async () => {
            setAutocompleteLoading(true);
            try {
                const response = await fetch(`${API_ENDPOINTS.autocomplete}?q=${encodeURIComponent(value)}`);
                const data = await response.json();
                setSuggestions(data.suggestions || []);
                setShowSuggestions(true);
            } catch (error) {
                console.error('Autocomplete error:', error);
                setSuggestions([]);
            } finally {
                setAutocompleteLoading(false);
            }
        }, 300);
    }, []);

    // Handle clicking outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle selecting a suggestion
    const handleSelectSuggestion = async (suggestion: AutocompleteSuggestion) => {
        if (suggestion.in_database) {
            // Already in DB - just filter to this place
            setSearchTerm(suggestion.name);
            setShowSuggestions(false);
        } else {
            // New place - need to fetch it via the pipeline
            setAddingPlace(suggestion.place_id);
            setShowSuggestions(false);

            try {
                const response = await fetch(API_ENDPOINTS.fetch, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ place_name: suggestion.name })
                });

                const data = await response.json();

                if (data.success) {
                    // Refresh the places list
                    await fetchPlaces();
                    setSearchTerm(data.place?.name || suggestion.name);
                } else {
                    console.error('Failed to add place:', data.error);
                    alert(`Failed to add place: ${data.error}`);
                }
            } catch (error) {
                console.error('Error adding place:', error);
                alert('Failed to add place. Please try again.');
            } finally {
                setAddingPlace(null);
            }
        }
    };

    const categories = [
        { id: 'all', label: 'All Places' },
        { id: 'nature', label: 'Nature' },
        { id: 'viewpoints', label: 'Viewpoints' },
        { id: 'adventure', label: 'Adventure' },
        { id: 'culture', label: 'Culture' },
        { id: 'family', label: 'Family' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-500">Loading places...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Explore Kodaikanal</h1>
                <p className="text-slate-500">
                    Discover {places.length} amazing places in and around Kodaikanal
                </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search with Autocomplete */}
                <div className="relative flex-1" ref={searchContainerRef}>
                    {autocompleteLoading ? (
                        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    )}
                    <input
                        type="text"
                        placeholder="Search places or add new..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />

                    {/* Adding place indicator */}
                    {addingPlace && (
                        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                            <span className="text-sm text-indigo-600 font-medium">Adding place to database...</span>
                        </div>
                    )}

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                            {/* Local DB Matches */}
                            {suggestions.filter(s => s.in_database).length > 0 && (
                                <div>
                                    <div className="px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                                        In Database
                                    </div>
                                    {suggestions.filter(s => s.in_database).map((suggestion) => (
                                        <button
                                            key={suggestion.place_id}
                                            onClick={() => handleSelectSuggestion(suggestion)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-900 truncate">{suggestion.name}</div>
                                                {suggestion.cluster && (
                                                    <div className="text-xs text-slate-500">{suggestion.cluster}</div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Google Maps Suggestions */}
                            {suggestions.filter(s => !s.in_database).length > 0 && (
                                <div>
                                    <div className="px-3 py-1.5 bg-indigo-50 text-xs font-semibold text-indigo-600 uppercase tracking-wide border-b border-indigo-100 flex items-center gap-1">
                                        <MapPinned className="w-3 h-3" />
                                        Add from Google Maps
                                    </div>
                                    {suggestions.filter(s => !s.in_database).map((suggestion) => (
                                        <button
                                            key={suggestion.place_id}
                                            onClick={() => handleSelectSuggestion(suggestion)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                                        >
                                            <Plus className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-900 truncate">{suggestion.name}</div>
                                                <div className="text-xs text-slate-500">Click to add to database</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Category Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Count + View Toggle */}
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">
                    Showing {filteredPlaces.length} of {places.length} places
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Grid3X3 size={16} />
                        Grid
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'map'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Map size={16} />
                        Map
                    </button>
                </div>
            </div>

            {/* Map View */}
            {viewMode === 'map' && filteredPlaces.length > 0 && (
                <div
                    className="relative h-[calc(100vh-280px)] rounded-xl overflow-hidden border border-slate-200 shadow-sm mb-4"
                    onMouseLeave={() => setHoveredPlace(null)}
                >
                    <MapContainer
                        center={[10.2287, 77.4878]}
                        zoom={12}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {filteredPlaces.map(place => (
                            place.location?.lat && place.location?.lng && (
                                <Marker
                                    key={place.id}
                                    position={[place.location.lat, place.location.lng]}
                                    icon={L.divIcon({
                                        className: 'simple-marker',
                                        html: `
                                            <div class="flex flex-col items-center cursor-pointer">
                                                <div class="w-8 h-8 rounded-full bg-indigo-600 border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                                                    ${place.stats?.popularity_rank || '?'}
                                                </div>
                                            </div>
                                        `,
                                        iconSize: [32, 32],
                                        iconAnchor: [16, 16],
                                    })}
                                    eventHandlers={{
                                        click: () => { setSourcesExpanded(false); setSelectedPlace(place); },
                                        mouseover: () => { setHoveredPlace(place); },
                                        mouseout: () => { setHoveredPlace(null); }
                                    }}
                                />
                            )
                        ))}
                    </MapContainer>

                    {/* Hover Card for Place Preview */}
                    {hoveredPlace && (
                        <div
                            className="absolute top-4 right-4 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[1000] pointer-events-none"
                        >
                            {/* Photo */}
                            <div className="relative h-28 bg-slate-100">
                                {getImageUrl(hoveredPlace) ? (
                                    <img
                                        src={getImageUrl(hoveredPlace)!}
                                        alt={hoveredPlace.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <MapPin size={32} />
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-md text-xs font-bold text-slate-900">
                                    #{hoveredPlace.stats?.popularity_rank || '-'}
                                </div>
                            </div>
                            {/* Info */}
                            <div className="p-3">
                                <h3 className="font-bold text-slate-900 text-sm mb-1">{hoveredPlace.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                    <MapPin size={10} />
                                    <span>{hoveredPlace.location.cluster_zone}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {(hoveredPlace.content?.tags || []).slice(0, 4).map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Places Grid */}
            {viewMode === 'grid' && filteredPlaces.length === 0 ? (
                <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No places found</h3>
                    <p className="text-slate-400">Try adjusting your search or filters</p>
                </div>
            ) : viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPlaces.map(place => (
                        <div
                            key={place.id}
                            onClick={() => { setSourcesExpanded(false); setSelectedPlace(place); }}
                            className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                            {/* Image */}
                            <div className="relative h-40 bg-slate-100">
                                {getImageUrl(place) ? (
                                    <img
                                        src={getImageUrl(place)!}
                                        alt={place.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <MapPin size={40} />
                                    </div>
                                )}

                                {/* Rank Badge */}
                                <div className="absolute top-2 left-2 bg-white/95 backdrop-blur px-2 py-0.5 rounded-md text-xs font-bold text-slate-900 shadow-sm border border-slate-200">
                                    #{place.stats?.popularity_rank || '-'}
                                </div>

                                {/* Cluster Zone Badge */}
                                {place.location?.cluster_zone && (
                                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded-md text-xs font-medium text-white shadow-sm">
                                        {place.location.cluster_zone}
                                    </div>
                                )}

                            </div>

                            {/* Content */}
                            <div className="p-3">
                                <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                    {place.name}
                                </h3>

                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        <span className="font-semibold text-slate-700">{place.stats?.rating || 'N/A'}</span>
                                        <span className="text-slate-400">({(place.stats?.review_count || 0).toLocaleString()})</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    {(place.content?.tags || []).slice(0, 3).map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedPlace && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedPlace(null)}>
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Hero */}
                        <div className="relative h-64 bg-slate-900">
                            {getImageUrl(selectedPlace) ? (
                                <>
                                    <img
                                        src={getImageUrl(selectedPlace)!}
                                        alt={selectedPlace.name}
                                        className="w-full h-full object-cover opacity-60"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                                </>
                            ) : null}

                            <button
                                onClick={() => setSelectedPlace(null)}
                                className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>

                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur text-white text-xs font-bold uppercase">
                                        Rank #{selectedPlace.stats?.popularity_rank || '-'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-xs font-bold flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" />
                                        {selectedPlace.stats?.rating || 'N/A'}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1">{selectedPlace.name}</h2>
                                <p className="text-slate-300 text-sm flex items-center gap-1">
                                    <MapPin size={14} />
                                    {selectedPlace.location?.cluster_zone || 'Kodaikanal'}
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-16rem)]">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Reviews</div>
                                    <div className="font-semibold text-slate-900">
                                        {(selectedPlace.stats?.review_count || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Duration</div>
                                    <div className="font-semibold text-slate-900">
                                        {selectedPlace.logic?.avg_time_spent_minutes || 60} min
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Difficulty</div>
                                    <div className="font-semibold text-slate-900">
                                        {selectedPlace.logic?.difficulty || 'Easy'}
                                    </div>
                                </div>
                            </div>

                            {/* About */}
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-slate-900 uppercase mb-2">About</h4>
                                <p className="text-slate-600 text-sm">{selectedPlace.content?.short_summary || 'No description available.'}</p>
                            </div>

                            {/* Best Time */}
                            {selectedPlace.content?.best_time_text && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-2">Best Time to Visit</h4>
                                    <p className="text-sm bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-indigo-900">
                                        {selectedPlace.content.best_time_text}
                                    </p>
                                </div>
                            )}

                            {/* Tips */}
                            {selectedPlace.content?.tips?.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-2">Pro Tips</h4>
                                    <ul className="space-y-2">
                                        {selectedPlace.content.tips.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                <span className="text-emerald-500 mt-0.5">✓</span>
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Tags */}
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-slate-900 uppercase mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(selectedPlace.content?.tags || []).map(tag => (
                                        <span key={tag} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Sources - Collapsible */}
                            {selectedPlace.sources?.length > 0 && (
                                <div className="mb-6">
                                    <button
                                        onClick={() => setSourcesExpanded(!sourcesExpanded)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                                    >
                                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            <LinkIcon size={14} />
                                            View Sources ({selectedPlace.sources.length})
                                        </span>
                                        <ChevronDown
                                            size={18}
                                            className={`text-slate-400 transition-transform duration-200 ${sourcesExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {sourcesExpanded && (
                                        <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto overscroll-contain">
                                            <div className="space-y-1">
                                                {selectedPlace.sources.map((source, i) => {
                                                    let hostname = source;
                                                    try { hostname = new URL(source).hostname; } catch { }
                                                    return (
                                                        <a
                                                            key={i}
                                                            href={source}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-white p-2 rounded-lg transition-colors"
                                                        >
                                                            <ExternalLink size={12} className="flex-shrink-0" />
                                                            <span className="truncate">{hostname}</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Google Maps Link */}
                            {selectedPlace.location?.google_maps_link && (
                                <a
                                    href={selectedPlace.location.google_maps_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                                >
                                    Open in Google Maps
                                    <ExternalLink size={16} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
