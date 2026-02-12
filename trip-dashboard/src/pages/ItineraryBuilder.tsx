import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, MapPin, Clock, Star, Loader2, Calendar, Route, Save, Check, AlertTriangle, ChevronDown } from 'lucide-react'
import { PlaceDetailModal } from '../components/PlaceDetailModal'
import { AllPlacesSidebar } from '../components/AllPlacesSidebar'
import { API_ENDPOINTS } from '../config/api'

interface ItineraryPlace {
    id: string
    name: string
    cluster: string
    image_url?: string
    tags: string[]
    rating?: number
    review_count?: number
    avg_time_minutes?: number
    tips?: string[]
    short_summary?: string
    best_time_text?: string
    difficulty?: string
    travel_to_next_min: number
    is_forest_circuit?: boolean
    scheduled_time?: string
    departure_time?: string
    has_lunch_before?: boolean
    warning?: 'late_schedule'
    warning_message?: string
}

interface ItineraryDay {
    day: number
    cluster: string
    places: ItineraryPlace[]
    total_drive_min: number
    place_count: number
    start_time?: string
    end_time?: string
    target_end_time?: string
}

interface RemovedPlace {
    id: string
    name: string
    cluster: string
    reason: string
    reason_text: string
    image_url?: string
    avg_time_minutes?: number
}

interface ItineraryBuilderProps {
    selectedPlaceIds: string[]
    userConfig: {
        num_days: number
        pace: string
        hotel_cluster: string
    }
    onBack: () => void
    allPlaces?: any[]  // All places for sidebar
    userName?: string // For saving itinerary
    tripName?: string // For saving itinerary
}

export function ItineraryBuilder({ selectedPlaceIds, userConfig, onBack, allPlaces = [], userName = 'Guest', tripName = 'Trip' }: ItineraryBuilderProps) {
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState<ItineraryDay[]>([])
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [activeDay, setActiveDay] = useState(1)
    const [error, setError] = useState<string | null>(null)
    const [selectedPlace, setSelectedPlace] = useState<ItineraryPlace | null>(null)
    const [itineraryPlaceIds, setItineraryPlaceIds] = useState<Set<string>>(new Set(selectedPlaceIds))
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [removedPlaces, setRemovedPlaces] = useState<RemovedPlace[]>([])
    const [allPlacesState, setAllPlacesState] = useState(allPlaces)

    useEffect(() => {
        const buildItinerary = async () => {
            setLoading(true)
            setError(null)

            try {
                const response = await fetch(API_ENDPOINTS.buildItinerary, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selected_place_ids: selectedPlaceIds,
                        user_config: userConfig
                    })
                })

                if (!response.ok) throw new Error('Failed to build itinerary')

                const data = await response.json()
                setDays(data.days)
                setSuggestions(data.suggestions || [])
                setRemovedPlaces(data.removed_places || [])

                // Set active day to 1 if not set
                if (activeDay > data.days.length) {
                    setActiveDay(1)
                }
            } catch (err) {
                console.error('Error building itinerary:', err)
                setError('Failed to build itinerary. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        buildItinerary()
    }, [selectedPlaceIds, userConfig])

    // Build day-cluster mapping for sidebar
    const dayClusterMap = useMemo(() => {
        const map: { [day: number]: string } = {}
        days.forEach(day => {
            map[day.day] = day.cluster
        })
        return map
    }, [days])

    // Handler for adding a place from sidebar
    const handleAddPlace = async (placeId: string, _targetDay: number) => {
        // Find the place in allPlaces
        const placeToAdd = allPlaces.find(p => p.id === placeId)
        if (!placeToAdd) return

        // Add to itineraryPlaceIds
        const newPlaceIds = new Set([...itineraryPlaceIds, placeId])
        setItineraryPlaceIds(newPlaceIds)

        // Rebuild itinerary with the new place
        setLoading(true)
        try {
            const response = await fetch(API_ENDPOINTS.buildItinerary, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selected_place_ids: Array.from(newPlaceIds),
                    user_config: userConfig
                })
            })

            if (!response.ok) throw new Error('Failed to rebuild itinerary')

            const data = await response.json()
            setDays(data.days || [])
            setSuggestions(data.suggestions || [])
            setRemovedPlaces(data.removed_places || [])
            console.log(`✅ Added ${placeToAdd.name} - itinerary rebuilt with ${newPlaceIds.size} places`)
        } catch (err) {
            console.error('Error rebuilding itinerary:', err)
            // Revert the place ID addition on error
            setItineraryPlaceIds(itineraryPlaceIds)
        } finally {
            setLoading(false)
        }
    }

    // Handler for opening detail from sidebar
    const handleOpenSidebarDetail = (place: any) => {
        setSelectedPlace(place as ItineraryPlace)
    }

    // Handler for adding a new place from Google Maps
    const handleAddNewPlace = async (placeName: string, _placeId: string) => {
        try {
            const response = await fetch(API_ENDPOINTS.fetch, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ place_name: placeName })
            })
            if (!response.ok) throw new Error('Failed to fetch place data')
            const data = await response.json()
            if (data.success && data.place) {
                // Add new place to allPlacesState so it shows in the sidebar
                const newPlace = {
                    id: data.place.id || data.place.place_id,
                    name: data.place.name,
                    cluster: data.place.location?.cluster_zone || 'Town Center',
                    image_url: data.place.content?.hero_image_url || '',
                    tags: data.place.content?.tags || [],
                    rating: data.place.stats?.rating,
                    avg_time_minutes: data.place.logic?.avg_time_spent_minutes || 60,
                    flags: [],
                    final_score: 50
                }
                setAllPlacesState(prev => [...prev, newPlace])
                console.log(`✅ Added new place: ${data.place.name}`)
            }
        } catch (err) {
            console.error('Error adding new place:', err)
        }
    }

    // Handler for building itinerary with staged places
    const handleBuildWithStaged = async (stagedIds: string[]) => {
        const newPlaceIds = new Set([...itineraryPlaceIds, ...stagedIds])
        setItineraryPlaceIds(newPlaceIds)

        setLoading(true)
        try {
            const response = await fetch(API_ENDPOINTS.buildItinerary, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selected_place_ids: Array.from(newPlaceIds),
                    user_config: userConfig
                })
            })
            if (!response.ok) throw new Error('Failed to rebuild itinerary')
            const data = await response.json()
            setDays(data.days || [])
            setSuggestions(data.suggestions || [])
            setRemovedPlaces(data.removed_places || [])
            console.log(`✅ Rebuilt itinerary with ${newPlaceIds.size} places (added ${stagedIds.length})`)
        } catch (err) {
            console.error('Error rebuilding itinerary:', err)
            setItineraryPlaceIds(itineraryPlaceIds)
        } finally {
            setLoading(false)
        }
    }

    // Handler for saving itinerary
    const handleSave = async () => {
        setSaveStatus('saving')
        try {
            const response = await fetch(API_ENDPOINTS.saveItinerary, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: userName,
                    trip_name: tripName,
                    itinerary: { days, userConfig }
                })
            })

            if (response.ok) {
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus('idle'), 3000)
            } else {
                throw new Error('Failed to save')
            }
        } catch (err) {
            console.error('Error saving itinerary:', err)
            setSaveStatus('idle')
        }
    }

    const currentDay = days.find(d => d.day === activeDay)

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-emerald-500 font-mono text-sm">Optimizing your routes...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-lg border-b border-slate-800 px-8 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Edit Selection</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">
                            {days.length} Days • {selectedPlaceIds.length} Places
                        </span>
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saveStatus === 'saved'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                        >
                            {saveStatus === 'saving' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : saveStatus === 'saved' ? (
                                <Check size={16} />
                            ) : (
                                <Save size={16} />
                            )}
                            {saveStatus === 'saved' ? 'Saved!' : 'Save Trip'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Day Selector */}
            <div className="max-w-5xl mx-auto px-8 py-8">
                <div className="flex items-center justify-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
                        disabled={activeDay === 1}
                        className="p-2 rounded-full bg-slate-800 text-white disabled:opacity-30"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="flex gap-2">
                        {days.map((day) => (
                            <button
                                key={day.day}
                                onClick={() => setActiveDay(day.day)}
                                className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeDay === day.day
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} />
                                    Day {day.day}
                                </div>
                                <div className="text-xs mt-1 opacity-70">{day.cluster}</div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setActiveDay(Math.min(days.length, activeDay + 1))}
                        disabled={activeDay === days.length}
                        className="p-2 rounded-full bg-slate-800 text-white disabled:opacity-30"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Day Summary */}
                {currentDay && (
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {currentDay.cluster}
                        </h2>
                        <div className="flex items-center justify-center gap-6 text-slate-400">
                            <span className="flex items-center gap-2">
                                <MapPin size={16} />
                                {currentDay.place_count} stops
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock size={16} />
                                ~{currentDay.total_drive_min} min driving
                            </span>
                        </div>
                    </div>
                )}

                {/* Metro Line Itinerary */}
                <AnimatePresence mode="wait">
                    {currentDay && (
                        <motion.div
                            key={activeDay}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="relative max-w-2xl mx-auto"
                        >
                            {/* Vertical Line */}
                            <div className="absolute left-8 top-8 bottom-8 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full" />

                            {/* Places */}
                            <div className="space-y-0">
                                {currentDay.places.map((place, idx) => (
                                    <div key={place.id} className="relative">
                                        {/* Lunch Break Indicator */}
                                        {place.has_lunch_before && (
                                            <div className="flex items-center gap-4 pl-4 mb-3">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center">
                                                    <span className="text-lg">🍽️</span>
                                                </div>
                                                <div className="flex-1 bg-amber-50 rounded-xl p-3 border border-amber-200">
                                                    <p className="text-sm font-medium text-amber-800">Lunch Break</p>
                                                    <p className="text-xs text-amber-600">~90 min at nearby restaurant</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Stop Card */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-start gap-4 pl-4"
                                        >
                                            {/* Time Node */}
                                            <div className="relative z-10 flex-shrink-0 flex flex-col items-center">
                                                <div className="w-10 h-10 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center shadow-md">
                                                    <span className="text-[10px] font-bold text-indigo-600">
                                                        {place.scheduled_time || `${idx + 1}`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card - Clickable */}
                                            <div
                                                onClick={() => setSelectedPlace(place)}
                                                className="flex-1 bg-white rounded-xl overflow-hidden shadow-lg mb-4 cursor-pointer hover:shadow-xl hover:ring-2 hover:ring-indigo-300 transition-all"
                                            >
                                                <div className="flex">
                                                    {/* Image */}
                                                    {place.image_url && (
                                                        <div className="w-24 h-24 bg-slate-100 flex-shrink-0">
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
                                                    <div className="flex-1 p-4">
                                                        <h4 className="font-bold text-slate-900">{place.name}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-xs text-indigo-600 font-medium">
                                                                {place.cluster}
                                                            </span>
                                                            {place.rating && (
                                                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                                                    <Star size={10} fill="currentColor" />
                                                                    {place.rating}
                                                                </span>
                                                            )}
                                                            {/* Time Spent */}
                                                            {place.avg_time_minutes && (
                                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                    <Clock size={10} />
                                                                    ~{place.avg_time_minutes} min
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {place.warning === 'late_schedule' && (
                                                                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1" title={place.warning_message}>
                                                                    <AlertTriangle size={10} />
                                                                    Late Schedule
                                                                </span>
                                                            )}
                                                            {place.is_forest_circuit && (
                                                                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                                                                    One-way Route
                                                                </span>
                                                            )}
                                                            {place.tags.slice(0, 2).map(tag => (
                                                                <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Travel Time Connector */}
                                        {idx < currentDay.places.length - 1 && place.travel_to_next_min > 0 && (
                                            <div className="flex items-center gap-2 pl-16 pb-2 text-slate-400">
                                                <Route size={12} />
                                                <span className="text-xs font-medium">{place.travel_to_next_min} min drive</span>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Return Indicator */}
                                <div className="flex items-center gap-4 pl-4 pt-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border-4 border-slate-600 flex items-center justify-center">
                                        <ArrowRight size={12} className="text-slate-400" />
                                    </div>
                                    <span className="text-slate-500 text-sm">Return to hotel</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Removed Places Section */}
            {removedPlaces.length > 0 && (
                <div className="max-w-2xl mx-auto mt-8 px-8">
                    <details className="bg-amber-900/30 rounded-xl border border-amber-700/50 overflow-hidden">
                        <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-amber-900/40 transition-colors">
                            <AlertTriangle className="text-amber-500" size={20} />
                            <span className="font-semibold text-amber-100">
                                {removedPlaces.length} place{removedPlaces.length > 1 ? 's' : ''} could not fit in schedule
                            </span>
                            <ChevronDown className="ml-auto text-amber-400" size={18} />
                        </summary>
                        <div className="p-4 pt-0 space-y-3">
                            <p className="text-sm text-amber-200/70 mb-4">
                                These places were removed because they exceeded the target end time for your pace setting.
                            </p>
                            {removedPlaces.map(place => (
                                <div key={place.id} className="bg-slate-900/50 rounded-lg p-3 flex gap-3 items-center">
                                    {place.image_url && (
                                        <img
                                            src={place.image_url}
                                            alt={place.name}
                                            className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-medium text-white text-sm">{place.name}</div>
                                        <div className="text-xs text-amber-300 mt-1 flex items-center gap-1">
                                            <AlertTriangle size={10} />
                                            {place.reason_text}
                                        </div>
                                    </div>
                                    {place.avg_time_minutes && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock size={10} />
                                            {place.avg_time_minutes}min
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}

            {/* On-the-way Suggestions */}
            {suggestions.length > 0 && (
                <div className="max-w-2xl mx-auto mt-12 mb-20 px-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <MapPin className="text-emerald-500" />
                        On-the-way Suggestions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestions.map(place => (
                            <div key={place.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex gap-4 items-center">
                                <img
                                    src={place.image_url || '/placeholder.jpg'}
                                    alt={place.name}
                                    className="w-16 h-16 rounded-lg object-cover bg-slate-800"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-white text-sm mb-1 truncate">{place.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                        {place.rating} ({place.review_count})
                                    </div>
                                    <button
                                        onClick={() => handleAddPlace(place.id, activeDay)}
                                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors w-full"
                                    >
                                        + Add to Day {activeDay}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Place Detail Modal */}
            <PlaceDetailModal
                place={selectedPlace}
                isOpen={selectedPlace !== null}
                onClose={() => setSelectedPlace(null)}
            />

            {/* All Places Sidebar */}
            <AllPlacesSidebar
                places={allPlacesState}
                selectedIds={itineraryPlaceIds}
                dayClusterMap={dayClusterMap}
                onAddPlace={handleAddPlace}
                onBuildWithStaged={handleBuildWithStaged}
                onOpenDetail={handleOpenSidebarDetail}
                onAddNewPlace={handleAddNewPlace}
            />
        </div>
    )
}
