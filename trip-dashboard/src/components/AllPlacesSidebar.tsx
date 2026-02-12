import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Plus, AlertTriangle, Star, Clock, Search, X, MapPin, Loader2, Check, Sparkles } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

interface AutocompleteSuggestion {
    id?: string
    name: string
    cluster?: string
    place_id: string
    in_database: boolean
}

interface SidebarPlace {
    id: string
    name: string
    cluster: string
    image_url?: string
    tags: string[]
    rating?: number
    avg_time_minutes?: number
    flags?: string[]
    final_score?: number
}

interface AllPlacesSidebarProps {
    places: SidebarPlace[]
    selectedIds: Set<string>
    dayClusterMap: { [day: number]: string }
    onAddPlace: (placeId: string, targetDay: number) => void
    onBuildWithStaged?: (stagedIds: string[]) => void
    onOpenDetail: (place: SidebarPlace) => void
    onAddNewPlace?: (placeName: string, placeId: string) => Promise<void>
}

export function AllPlacesSidebar({
    places,
    selectedIds,
    dayClusterMap: _dayClusterMap,
    onAddPlace,
    onBuildWithStaged,
    onOpenDetail,
    onAddNewPlace
}: AllPlacesSidebarProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [stagedIds, setStagedIds] = useState<Set<string>>(new Set())

    // Autocomplete state
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([])
    const [autocompleteLoading, setAutocompleteLoading] = useState(false)
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [addingPlace, setAddingPlace] = useState<string | null>(null)
    const searchContainerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Debounced autocomplete search
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value)

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (value.length < 2) {
            setAutocompleteSuggestions([])
            setShowAutocomplete(false)
            return
        }

        // Debounce the API call
        debounceRef.current = setTimeout(async () => {
            setAutocompleteLoading(true)
            try {
                const response = await fetch(`${API_ENDPOINTS.autocomplete}?q=${encodeURIComponent(value)}`)
                const data = await response.json()
                setAutocompleteSuggestions(data.suggestions || [])
                setShowAutocomplete(true)
            } catch (error) {
                console.error('Autocomplete error:', error)
                setAutocompleteSuggestions([])
            } finally {
                setAutocompleteLoading(false)
            }
        }, 300)
    }, [])

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowAutocomplete(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle suggestion selection
    const handleSelectSuggestion = async (suggestion: AutocompleteSuggestion) => {
        if (suggestion.in_database) {
            // Already in DB - just set search term to filter
            setSearchQuery(suggestion.name)
            setShowAutocomplete(false)
        } else if (onAddNewPlace) {
            // New place - add via pipeline
            setAddingPlace(suggestion.place_id)
            setShowAutocomplete(false)
            try {
                await onAddNewPlace(suggestion.name, suggestion.place_id)
                setSearchQuery('')
            } catch (error) {
                console.error('Error adding place:', error)
            } finally {
                setAddingPlace(null)
            }
        }
    }

    // Filter already-selected places and apply search
    const availablePlaces = places.filter(p => {
        if (selectedIds.has(p.id)) return false
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
    })

    // Sort: non-flagged first, then by score
    const sortedPlaces = [...availablePlaces].sort((a, b) => {
        const aFlagged = (a.flags?.length || 0) > 0
        const bFlagged = (b.flags?.length || 0) > 0
        if (aFlagged && !bFlagged) return 1
        if (!aFlagged && bFlagged) return -1
        return (b.final_score || 0) - (a.final_score || 0)
    })

    // Stage a place for addition (no immediate rebuild)
    const stagePlace = (placeId: string) => {
        setStagedIds(prev => {
            const next = new Set(prev)
            if (next.has(placeId)) {
                next.delete(placeId)
            } else {
                next.add(placeId)
            }
            return next
        })
    }

    // Build with all staged places
    const handleBuildWithStaged = () => {
        if (stagedIds.size === 0) return
        if (onBuildWithStaged) {
            onBuildWithStaged(Array.from(stagedIds))
        } else {
            // Fallback: add one by one
            stagedIds.forEach(id => onAddPlace(id, 1))
        }
        setStagedIds(new Set())
    }

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 p-3 bg-slate-800 text-white rounded-l-xl shadow-lg hover:bg-slate-700 transition-all ${isExpanded ? 'right-80' : ''}`}
            >
                {isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                {!isExpanded && (
                    <span className="absolute -top-2 -left-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {availablePlaces.length}
                    </span>
                )}
            </button>

            {/* Sidebar */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25 }}
                        className="fixed right-0 top-0 h-full w-80 bg-slate-900 shadow-2xl z-30 flex flex-col pt-16"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-3">All Places</h3>

                            {/* Adding place indicator */}
                            {addingPlace && (
                                <div className="flex items-center gap-2 mb-3 p-2 bg-indigo-900/50 rounded-lg border border-indigo-700">
                                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                                    <span className="text-xs text-indigo-300">Adding new place...</span>
                                </div>
                            )}

                            {/* Autocomplete Search */}
                            <div ref={searchContainerRef} className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Search or add places..."
                                    className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {autocompleteLoading && (
                                    <Loader2 size={14} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                                )}
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('')
                                            setAutocompleteSuggestions([])
                                            setShowAutocomplete(false)
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white z-10"
                                    >
                                        <X size={14} />
                                    </button>
                                )}

                                {/* Autocomplete Dropdown */}
                                {showAutocomplete && autocompleteSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                                        {/* Local DB Matches */}
                                        {autocompleteSuggestions.filter(s => s.in_database).length > 0 && (
                                            <div>
                                                <div className="px-3 py-1.5 bg-slate-700/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-600">
                                                    In Database
                                                </div>
                                                {autocompleteSuggestions.filter(s => s.in_database).map((suggestion) => (
                                                    <button
                                                        key={suggestion.place_id}
                                                        onClick={() => handleSelectSuggestion(suggestion)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
                                                    >
                                                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-white truncate">{suggestion.name}</div>
                                                            {suggestion.cluster && (
                                                                <div className="text-[10px] text-slate-400">{suggestion.cluster}</div>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Google Maps Suggestions */}
                                        {autocompleteSuggestions.filter(s => !s.in_database).length > 0 && (
                                            <div>
                                                <div className="px-3 py-1.5 bg-slate-700/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-t border-slate-600">
                                                    Add from Google Maps
                                                </div>
                                                {autocompleteSuggestions.filter(s => !s.in_database).map((suggestion) => (
                                                    <button
                                                        key={suggestion.place_id}
                                                        onClick={() => handleSelectSuggestion(suggestion)}
                                                        disabled={!onAddNewPlace}
                                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-white truncate">{suggestion.name}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                {availablePlaces.length} places available to add
                            </p>
                        </div>

                        {/* Places List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {sortedPlaces.map((place, idx) => {
                                const isFlagged = (place.flags?.length || 0) > 0

                                return (
                                    <motion.div
                                        key={place.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className={`group rounded-lg overflow-hidden border transition-all ${isFlagged
                                            ? 'bg-slate-800/50 border-slate-700 opacity-60 hover:opacity-100'
                                            : 'bg-slate-800 border-slate-700 hover:border-indigo-500'
                                            }`}
                                    >
                                        <div
                                            className="flex cursor-pointer"
                                            onClick={() => onOpenDetail(place)}
                                        >
                                            {/* Mini Image */}
                                            {place.image_url && (
                                                <div className="w-16 h-16 bg-slate-700 flex-shrink-0">
                                                    <img
                                                        src={place.image_url}
                                                        alt={place.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none'
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="flex-1 p-2 min-w-0">
                                                <h4 className="text-sm font-medium text-white truncate">
                                                    {place.name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400">
                                                        {place.cluster}
                                                    </span>
                                                    {place.rating && (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                                                            <Star size={8} fill="currentColor" />
                                                            {place.rating}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {place.avg_time_minutes && (
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            <Clock size={8} />
                                                            {place.avg_time_minutes} min
                                                        </span>
                                                    )}
                                                    {isFlagged && (
                                                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                                            <AlertTriangle size={8} />
                                                            {place.flags?.[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Add Button */}
                                        <div className="px-2 pb-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    stagePlace(place.id)
                                                }}
                                                className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${stagedIds.has(place.id)
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                                    }`}
                                            >
                                                {stagedIds.has(place.id) ? (
                                                    <><Check size={12} /> Added to build</>
                                                ) : (
                                                    <><Plus size={12} /> Add to Itinerary</>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )
                            })}

                            {sortedPlaces.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    <MapPin size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No places found</p>
                                </div>
                            )}
                        </div>

                        {/* Build Final Itinerary Button */}
                        {stagedIds.size > 0 && (
                            <div className="p-3 border-t border-slate-700">
                                <button
                                    onClick={handleBuildWithStaged}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors shadow-lg"
                                >
                                    <Sparkles size={16} />
                                    Build Itinerary ({stagedIds.size} new)
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
