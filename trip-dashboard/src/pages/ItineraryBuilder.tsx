import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, MapPin, Star, ArrowLeft, Save, Loader2, Check, Route, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, List, GripVertical, X, Utensils, Hotel, ExternalLink, Map as MapIcon, Share2 } from 'lucide-react'
import { PlaceDetailModal } from '../components/PlaceDetailModal'
import { AllPlacesSidebar } from '../components/AllPlacesSidebar'
import { MobileDrawer } from '../components/layout/MobileDrawer'
import { API_ENDPOINTS } from '../config/api'
import { useIsMobile } from '../lib/useMediaQuery'

// DnD Kit — used for lunch break repositioning
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ========== TYPES ==========

interface ItineraryPlace {
    id: string
    name: string
    cluster: string
    lat?: number
    lng?: number
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

type ItineraryItem =
    | { type: 'place'; data: ItineraryPlace }
    | { type: 'lunch'; id: string; selectedEatery?: Eatery }

interface ItineraryDay {
    day: number
    cluster: string
    places: ItineraryPlace[]
    total_drive_min: number
    place_count: number
    start_time?: string
    end_time?: string
    target_end_time?: string
    hotel_to_first_min?: number
    last_to_hotel_min?: number
    hotel_departure_time?: string
    hotel_name?: string
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

interface Eatery {
    name: string
    type: string
    rating: number
    review_count?: number
    vicinity: string
    is_veg_friendly?: boolean
    is_forest_stall?: boolean
    place_id?: string
    price_level?: number
    price_label?: string
    price_range?: string
}

interface ItineraryBuilderProps {
    selectedPlaceIds: string[]
    userConfig: {
        num_days: number
        pace: string
        hotel_cluster: string
        hotel_location?: { lat: number; lng: number; name: string }
        food_preference?: string
        start_date?: string
    }
    onBack: () => void
    allPlaces?: any[]
    userName?: string
    tripName?: string
}

// ========== PACE CONFIG ==========

const PACE_START_HOURS: Record<string, number> = {
    slow: 10, chill: 10, medium: 9, balanced: 9, fast: 7, packed: 7
}

const LUNCH_BREAK_DURATION_MIN = 90

// ========== HELPERS ==========

function recalculateTimes(items: ItineraryItem[], startHour: number): ItineraryItem[] {
    let currentTime = startHour * 60
    return items.map(item => {
        if (item.type === 'lunch') {
            currentTime += LUNCH_BREAK_DURATION_MIN
            return item
        }
        const place = { ...item.data }
        const timeAtPlace = place.avg_time_minutes ?? 60
        const travelAfter = place.travel_to_next_min ?? 0
        const hours = Math.floor(currentTime / 60)
        const minutes = Math.floor(currentTime % 60)
        place.scheduled_time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        const depTime = currentTime + timeAtPlace
        const depH = Math.floor(depTime / 60)
        const depM = Math.floor(depTime % 60)
        place.departure_time = `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`
        currentTime = depTime + travelAfter
        return { type: 'place' as const, data: place }
    })
}

function placesToItems(places: ItineraryPlace[]): ItineraryItem[] {
    const items: ItineraryItem[] = []
    places.forEach((place, idx) => {
        if (place.has_lunch_before) {
            items.push({ type: 'lunch', id: `lunch-${idx}` })
        }
        items.push({ type: 'place', data: place })
    })
    return items
}

function itemsToPlaces(items: ItineraryItem[]): ItineraryPlace[] {
    const places: ItineraryPlace[] = []
    let lunchNext = false
    for (const item of items) {
        if (item.type === 'lunch') { lunchNext = true }
        else {
            places.push({ ...item.data, has_lunch_before: lunchNext })
            lunchNext = false
        }
    }
    return places
}

function getItemId(item: ItineraryItem): string {
    return item.type === 'lunch' ? item.id : item.data.id
}

function getGoogleMapsUrl(eatery: Eatery): string {
    if (eatery.place_id) return `https://www.google.com/maps/place/?q=place_id:${eatery.place_id}`
    return `https://www.google.com/maps/search/${encodeURIComponent(eatery.name + ' Kodaikanal')}`
}

function formatTimeFromMinutes(totalMin: number): string {
    const h = Math.floor(totalMin / 60)
    const m = Math.floor(totalMin % 60)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// ========== PLACE CARD (no drag) ==========

function PlaceCard({ item, idx, onDelete, onClick, isLast }: {
    item: ItineraryPlace; idx: number; onDelete: (id: string) => void
    onClick: (place: ItineraryPlace) => void; isLast: boolean
}) {
    return (
        <div className="relative">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-4 pl-4">
                <div className="relative z-10 flex-shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center shadow-md">
                        <span className="text-[10px] font-bold text-indigo-600">{item.scheduled_time || `${idx + 1}`}</span>
                    </div>
                </div>
                <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-lg mb-4 group relative">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                        className="absolute top-2 right-2 z-20 p-1 rounded-full bg-red-50 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} className="text-red-500" />
                    </button>
                    <div onClick={() => onClick(item)} className="cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all">
                        <div className="flex">
                            {item.image_url && (
                                <div className="w-24 h-24 bg-slate-100 flex-shrink-0">
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                </div>
                            )}
                            <div className="flex-1 p-4">
                                <h4 className="font-bold text-slate-900">{item.name}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-indigo-600 font-medium">{item.cluster}</span>
                                    {item.rating && <span className="flex items-center gap-1 text-xs text-amber-600"><Star size={10} fill="currentColor" />{item.rating}</span>}
                                    {item.avg_time_minutes && <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={10} />~{item.avg_time_minutes} min</span>}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {item.warning === 'late_schedule' && (
                                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1" title={item.warning_message}>
                                            <AlertTriangle size={10} />Late Schedule
                                        </span>
                                    )}
                                    {item.is_forest_circuit && <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">One-way Route</span>}
                                    {item.tags.slice(0, 2).map(tag => <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{tag}</span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
            {!isLast && item.travel_to_next_min > 0 && (
                <div className="flex items-center gap-2 pl-16 pb-2 text-slate-400">
                    <Route size={12} /><span className="text-xs font-medium">{item.travel_to_next_min} min drive</span>
                </div>
            )}
        </div>
    )
}

// ========== SORTABLE LUNCH BREAK ==========

function SortableLunchBreak({ id, selectedEatery, onDelete, onFindEateries, onSelectEatery, eateries, eateriesLoading, showEateries }: {
    id: string; selectedEatery?: Eatery; onDelete: (id: string) => void
    onFindEateries: () => void; onSelectEatery: (lunchId: string, eatery: Eatery) => void
    eateries: Eatery[]; eateriesLoading: boolean; showEateries: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' as any }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 pl-4 mb-3 group relative">
            {/* Drag handle — ALWAYS visible */}
            <div {...attributes} {...listeners}
                className="w-10 h-10 rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-amber-200 transition-colors"
                title="Drag to reposition lunch">
                <GripVertical size={16} className="text-amber-600" />
            </div>

            <div className="flex-1">
                <div className={`rounded-xl p-3 border relative ${selectedEatery ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <button onClick={() => onDelete(id)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-50 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} className="text-red-500" />
                    </button>

                    {selectedEatery ? (
                        <div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-green-800">{selectedEatery.name}</p>
                                    <p className="text-xs text-green-600">{selectedEatery.type} • {selectedEatery.vicinity}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {selectedEatery.rating > 0 && (
                                            <span className="flex items-center gap-1 text-xs text-amber-600">
                                                <Star size={10} fill="currentColor" />{selectedEatery.rating}
                                                {selectedEatery.review_count ? ` (${selectedEatery.review_count})` : ''}
                                            </span>
                                        )}
                                        {selectedEatery.price_range && <span className="text-xs text-emerald-600 font-medium">{selectedEatery.price_range}</span>}
                                        <span className="text-xs text-green-500">✓ Selected</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <a href={getGoogleMapsUrl(selectedEatery)} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors">
                                        <ExternalLink size={10} />More Details
                                    </a>
                                    <button onClick={onFindEateries} className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">Change</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-800">🍽️ Lunch Break</p>
                                <p className="text-xs text-amber-600">~90 min • ↕ Drag handle to reposition</p>
                            </div>
                            <button onClick={onFindEateries} disabled={eateriesLoading}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-lg transition-colors font-medium">
                                {eateriesLoading ? <Loader2 size={12} className="animate-spin" /> : <Utensils size={12} />}
                                {eateriesLoading ? 'Searching...' : 'Find Eateries'}
                            </button>
                        </div>
                    )}

                    {/* Eatery Suggestions */}
                    {showEateries && eateries.length > 0 && !selectedEatery && (
                        <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                            <p className="text-xs font-semibold text-amber-700 mb-1">🍴 On-route Eateries</p>
                            {eateries.map((eatery, i) => (
                                <div key={i} className="bg-white rounded-lg p-2.5 border border-amber-100 flex items-start gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm text-slate-800">{eatery.name}</span>
                                            <div className="flex items-center gap-2">
                                                {eatery.price_range && <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">{eatery.price_range}</span>}
                                                {eatery.rating > 0 && (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                                        <Star size={10} fill="currentColor" />{eatery.rating}
                                                        {eatery.review_count ? <span className="text-slate-400">({eatery.review_count})</span> : null}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">{eatery.type}</p>
                                        <p className="text-xs text-slate-400">{eatery.vicinity}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                            {eatery.is_veg_friendly && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">🌿 Veg Friendly</span>}
                                            {eatery.is_forest_stall && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">🏔️ Forest Stall</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 flex-shrink-0">
                                        <button onClick={() => onSelectEatery(id, eatery)}
                                            className="text-xs px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium">Select</button>
                                        <a href={getGoogleMapsUrl(eatery)} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors">
                                            <ExternalLink size={10} />More Details
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ========== MAIN COMPONENT ==========

export function ItineraryBuilder({ selectedPlaceIds, userConfig, onBack, allPlaces = [], userName = 'Guest', tripName = 'Trip' }: ItineraryBuilderProps) {
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState<ItineraryDay[]>([])
    const [dayItems, setDayItems] = useState<Record<number, ItineraryItem[]>>({})
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [activeDay, setActiveDay] = useState(1)
    const [error, setError] = useState<string | null>(null)
    const [selectedPlace, setSelectedPlace] = useState<ItineraryPlace | null>(null)
    const [itineraryPlaceIds, setItineraryPlaceIds] = useState<Set<string>>(new Set(selectedPlaceIds))
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'copied'>('idle')
    const [removedPlaces, setRemovedPlaces] = useState<RemovedPlace[]>([])
    const [allPlacesState, setAllPlacesState] = useState(allPlaces)
    const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false)
    const isMobile = useIsMobile()

    // View mode: list or map
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

    // Start hour per day
    const defaultStartHour = PACE_START_HOURS[userConfig.pace.toLowerCase()] ?? 9
    const [dayStartHours, setDayStartHours] = useState<Record<number, number>>({})

    // Eatery state
    const [eateries, setEateries] = useState<Record<string, Eatery[]>>({})
    const [eateriesLoading, setEateriesLoading] = useState<Record<string, boolean>>({})
    const [showEateries, setShowEateries] = useState<Record<string, boolean>>({})

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const hotelDisplayName = userConfig.hotel_location?.name || `Hotel Area (${userConfig.hotel_cluster})`

    useEffect(() => {
        const buildItinerary = async () => {
            setLoading(true); setError(null)
            try {
                const response = await fetch(API_ENDPOINTS.buildItinerary, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selected_place_ids: selectedPlaceIds, user_config: userConfig })
                })
                if (!response.ok) throw new Error('Failed to build itinerary')
                const data = await response.json()
                setDays(data.days); setSuggestions(data.suggestions || []); setRemovedPlaces(data.removed_places || [])
                const itemsMap: Record<number, ItineraryItem[]> = {}
                const startHours: Record<number, number> = {}
                data.days.forEach((day: ItineraryDay) => {
                    itemsMap[day.day] = placesToItems(day.places)
                    startHours[day.day] = defaultStartHour
                })
                setDayItems(itemsMap); setDayStartHours(startHours)
                if (activeDay > data.days.length) setActiveDay(1)
            } catch (err) {
                console.error('Error building itinerary:', err); setError('Failed to build itinerary. Please try again.')
            } finally { setLoading(false) }
        }
        buildItinerary()
    }, [selectedPlaceIds, userConfig])

    // Build Google Maps directions URL for the current day
    const googleMapsRouteUrl = useMemo(() => {
        const items = dayItems[activeDay] || []
        const places = items.filter(i => i.type === 'place').map(i => (i as { type: 'place'; data: ItineraryPlace }).data)
        const waypoints = places.filter(p => p.lat && p.lng)

        const hotelLat = userConfig.hotel_location?.lat
        const hotelLng = userConfig.hotel_location?.lng
        const originLat = hotelLat || (waypoints[0]?.lat)
        const originLng = hotelLng || (waypoints[0]?.lng)

        if (!originLat || !originLng || waypoints.length === 0) return null

        const origin = `${originLat},${originLng}`
        const destination = origin // Return to hotel
        const wpStr = waypoints.map(p => `${p.lat},${p.lng}`).join('|')
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(wpStr)}&travelmode=driving`
    }, [activeDay, dayItems, userConfig])

    const dayClusterMap = useMemo(() => {
        const map: { [day: number]: string } = {}
        days.forEach(day => { map[day.day] = day.cluster })
        return map
    }, [days])

    const currentDay = days.find(d => d.day === activeDay)
    const currentItems = dayItems[activeDay] || []
    const currentStartHour = dayStartHours[activeDay] ?? defaultStartHour

    // ========== HANDLERS ==========

    const adjustStartHour = useCallback((delta: number) => {
        setDayStartHours(prev => {
            const current = prev[activeDay] ?? defaultStartHour
            const newHour = Math.max(7, Math.min(11, current + delta))
            if (newHour === current) return prev
            setDayItems(prevItems => {
                const items = prevItems[activeDay] || []
                return { ...prevItems, [activeDay]: recalculateTimes(items, newHour) }
            })
            return { ...prev, [activeDay]: newHour }
        })
    }, [activeDay, defaultStartHour])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const items = dayItems[activeDay] || []
        const activeItem = items.find(item => getItemId(item) === active.id)
        if (!activeItem || activeItem.type !== 'lunch') return
        const oldIndex = items.findIndex(item => getItemId(item) === active.id)
        const newIndex = items.findIndex(item => getItemId(item) === over.id)
        if (oldIndex === -1 || newIndex === -1) return
        const newItems = arrayMove(items, oldIndex, newIndex)
        const recalculated = recalculateTimes(newItems, currentStartHour)
        const lunchId = getItemId(activeItem)
        // Reset eateries since position changed
        setEateries(prev => { const next = { ...prev }; delete next[lunchId]; return next })
        setShowEateries(prev => { const next = { ...prev }; delete next[lunchId]; return next })
        const updatedItems = recalculated.map(item => {
            if (item.type === 'lunch' && item.id === lunchId) return { ...item, selectedEatery: undefined }
            return item
        })
        setDayItems(prev => ({ ...prev, [activeDay]: updatedItems }))
    }, [activeDay, dayItems, currentStartHour])

    const handleDeleteItem = useCallback((id: string) => {
        setDayItems(prev => {
            const items = prev[activeDay] || []
            const filtered = items.filter(item => getItemId(item) !== id)
            const recalculated = recalculateTimes(filtered, currentStartHour)
            const deleted = items.find(item => item.type === 'place' && item.data.id === id)
            if (deleted && deleted.type === 'place') {
                setRemovedPlaces(prev => [...prev, {
                    id: deleted.data.id, name: deleted.data.name, cluster: deleted.data.cluster,
                    reason: 'user_removed', reason_text: 'Removed by user',
                    image_url: deleted.data.image_url, avg_time_minutes: deleted.data.avg_time_minutes
                }])
                setItineraryPlaceIds(prev => { const next = new Set(prev); next.delete(deleted.data.id); return next })
            }
            return { ...prev, [activeDay]: recalculated }
        })
        setDays(prev => prev.map(day => {
            if (day.day === activeDay) {
                const items = dayItems[activeDay] || []
                const remaining = items.filter(item => getItemId(item) !== id)
                const places = itemsToPlaces(remaining)
                return { ...day, places, place_count: places.length }
            }
            return day
        }))
    }, [activeDay, currentStartHour, dayItems])

    const handleFindEateries = useCallback(async (lunchId: string) => {
        if (showEateries[lunchId] && eateries[lunchId]?.length) { setShowEateries(prev => ({ ...prev, [lunchId]: false })); return }
        if (eateries[lunchId]?.length) { setShowEateries(prev => ({ ...prev, [lunchId]: true })); return }
        setEateriesLoading(prev => ({ ...prev, [lunchId]: true }))
        try {
            const items = dayItems[activeDay] || []
            const lunchIdx = items.findIndex(item => item.type === 'lunch' && item.id === lunchId)
            const placesBefore = items.slice(0, lunchIdx).filter(i => i.type === 'place') as { type: 'place'; data: ItineraryPlace }[]
            const placesAfter = items.slice(lunchIdx + 1).filter(i => i.type === 'place') as { type: 'place'; data: ItineraryPlace }[]

            const nearbyPlaceNames = [
                ...placesBefore.slice(-1).map(p => p.data.name),
                ...placesAfter.slice(0, 1).map(p => p.data.name)
            ]

            const beforePlace = placesBefore.length > 0 ? placesBefore[placesBefore.length - 1].data : null
            const afterPlace = placesAfter.length > 0 ? placesAfter[0].data : null

            const cluster = currentDay?.cluster || ''
            const response = await fetch(API_ENDPOINTS.nearbyEateries, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin_lat: beforePlace?.lat, origin_lng: beforePlace?.lng,
                    dest_lat: afterPlace?.lat, dest_lng: afterPlace?.lng,
                    food_preference: userConfig.food_preference || 'flexible',
                    cluster, place_names: nearbyPlaceNames
                })
            })
            const data = await response.json()
            setEateries(prev => ({ ...prev, [lunchId]: data.eateries || [] }))
            setShowEateries(prev => ({ ...prev, [lunchId]: true }))
        } catch (err) { console.error('Failed to find eateries:', err) }
        finally { setEateriesLoading(prev => ({ ...prev, [lunchId]: false })) }
    }, [activeDay, dayItems, currentDay, userConfig])

    const handleSelectEatery = useCallback((lunchId: string, eatery: Eatery) => {
        setDayItems(prev => {
            const items = prev[activeDay] || []
            const updated = items.map(item => {
                if (item.type === 'lunch' && item.id === lunchId) return { ...item, selectedEatery: eatery }
                return item
            })
            return { ...prev, [activeDay]: updated }
        })
        setShowEateries(prev => ({ ...prev, [lunchId]: false }))
    }, [activeDay])

    // Sidebar handlers
    const handleAddPlace = async (placeId: string, _targetDay: number) => {
        if (itineraryPlaceIds.has(placeId)) return
        try {
            const newIds = [...itineraryPlaceIds, placeId]
            setItineraryPlaceIds(new Set(newIds))
            const response = await fetch(API_ENDPOINTS.buildItinerary, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selected_place_ids: newIds, user_config: userConfig })
            })
            if (!response.ok) throw new Error('Failed to rebuild itinerary')
            const data = await response.json()
            setDays(data.days); setSuggestions(data.suggestions || []); setRemovedPlaces(data.removed_places || [])
            const itemsMap: Record<number, ItineraryItem[]> = {}
            data.days.forEach((day: ItineraryDay) => { itemsMap[day.day] = placesToItems(day.places) })
            setDayItems(itemsMap)
            setRemovedPlaces(prev => prev.filter(p => p.id !== placeId))
        } catch (err) {
            console.error('Failed to add place:', err)
            setItineraryPlaceIds(prev => { const next = new Set(prev); next.delete(placeId); return next })
        }
    }

    const handleOpenSidebarDetail = (place: any) => { setSelectedPlace(place as ItineraryPlace) }

    const handleAddNewPlace = async (placeName: string, _placeId: string) => {
        try {
            const fetchResponse = await fetch(API_ENDPOINTS.fetch, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ place_name: placeName, place_id: _placeId })
            })
            if (!fetchResponse.ok) { const errorData = await fetchResponse.json(); throw new Error(errorData.error || 'Failed to add place') }
            const fetchData = await fetchResponse.json()
            const newPlaceId = fetchData.place?.id
            if (newPlaceId) {
                const placesRes = await fetch(API_ENDPOINTS.places)
                if (placesRes.ok) { const placesData = await placesRes.json(); setAllPlacesState(placesData.places || []) }
                await handleAddPlace(newPlaceId, activeDay)
            }
        } catch (err: any) { console.error('Failed to add new place:', err); alert(err.message || 'Failed to add place to database') }
    }

    const handleBuildWithStaged = async (stagedIds: string[]) => {
        const combined = [...new Set([...itineraryPlaceIds, ...stagedIds])]
        setItineraryPlaceIds(new Set(combined))
        try {
            const response = await fetch(API_ENDPOINTS.buildItinerary, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selected_place_ids: combined, user_config: userConfig })
            })
            if (!response.ok) throw new Error('Failed to rebuild itinerary')
            const data = await response.json()
            setDays(data.days); setSuggestions(data.suggestions || []); setRemovedPlaces(data.removed_places || [])
            const itemsMap: Record<number, ItineraryItem[]> = {}
            data.days.forEach((day: ItineraryDay) => { itemsMap[day.day] = placesToItems(day.places) })
            setDayItems(itemsMap)
        } catch (err) { console.error('Failed to rebuild itinerary:', err) }
    }

    const handleSave = async (): Promise<boolean> => {
        setSaveStatus('saving')
        try {
            const saveDays = days.map(day => ({ ...day, places: itemsToPlaces(dayItems[day.day] || []) }))
            const response = await fetch(API_ENDPOINTS.saveItinerary, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itinerary: { days: saveDays }, user_name: userName, trip_name: tripName })
            })
            if (!response.ok) throw new Error('Failed to save')
            setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000)
            return true
        } catch (err) { console.error('Failed to save itinerary:', err); setSaveStatus('idle'); return false }
    }

    const handleShare = async () => {
        setShareStatus('sharing')
        const saved = await handleSave()
        if (!saved) { setShareStatus('idle'); return }
        // Build permalink
        const safeName = tripName.replace(/\s+/g, '_').replace(/\//g, '-')
        const safeUser = userName.replace(/\s+/g, '_')
        const base = window.location.origin + (import.meta.env.BASE_URL || '/')
        const permalink = `${base}trip/${safeUser}/${safeName}`
        try {
            await navigator.clipboard.writeText(permalink)
            setShareStatus('copied'); setTimeout(() => setShareStatus('idle'), 3000)
        } catch {
            // Fallback
            prompt('Copy this link:', permalink)
            setShareStatus('idle')
        }
    }

    // ========== RENDER ==========

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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
                    <button onClick={onBack} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium">Go Back</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950" style={{ overscrollBehavior: 'contain' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-lg border-b border-slate-800 px-4 md:px-8 py-3 md:py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white">
                        <ArrowLeft size={18} /><span className="hidden md:inline text-sm font-medium">Edit Selection</span>
                    </button>
                    <div className="flex items-center gap-2 md:gap-4">
                        <span className="text-xs md:text-sm text-slate-400">{days.length} Days • {itineraryPlaceIds.size} Places</span>
                        <button onClick={handleSave} disabled={saveStatus === 'saving'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saveStatus === 'saved' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                            {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}
                            <span className="hidden md:inline">{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}</span>
                        </button>
                        <button onClick={handleShare} disabled={shareStatus === 'sharing'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${shareStatus === 'copied' ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                            {shareStatus === 'sharing' ? <Loader2 size={16} className="animate-spin" /> : shareStatus === 'copied' ? <Check size={16} /> : <Share2 size={16} />}
                            <span className="hidden md:inline">{shareStatus === 'sharing' ? 'Sharing...' : shareStatus === 'copied' ? 'Link Copied!' : 'Share'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-8">
                {/* Day Selector */}
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-6 md:mb-8">
                    <button onClick={() => setActiveDay(Math.max(1, activeDay - 1))} disabled={activeDay === 1}
                        className="hidden md:block p-2 rounded-full bg-slate-800 text-white disabled:opacity-30"><ChevronLeft size={24} /></button>
                    <div className="flex gap-2 overflow-x-auto mobile-scroll snap-x snap-mandatory pb-1 max-w-full">
                        {days.map((day) => (
                            <button key={day.day} onClick={() => setActiveDay(day.day)}
                                className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all snap-center shrink-0 ${activeDay === day.day ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                <div className="flex items-center gap-1.5 md:gap-2"><Calendar size={14} className="md:w-4 md:h-4" />Day {day.day}</div>
                                <div className="text-[10px] md:text-xs mt-1 opacity-70">{day.cluster}</div>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setActiveDay(Math.min(days.length, activeDay + 1))} disabled={activeDay === days.length}
                        className="hidden md:block p-2 rounded-full bg-slate-800 text-white disabled:opacity-30"><ChevronRight size={24} /></button>
                </div>

                {/* Day Summary */}
                {currentDay && (
                    <div className="text-center mb-6 md:mb-8">
                        <h2 className="text-xl md:text-3xl font-bold text-white mb-2">{currentDay.cluster}</h2>
                        <div className="flex items-center justify-center gap-4 md:gap-6 text-slate-400 text-sm">
                            <span className="flex items-center gap-1.5 md:gap-2"><MapPin size={14} />{currentDay.place_count} stops</span>
                            <span className="flex items-center gap-1.5 md:gap-2"><Clock size={14} />~{currentDay.total_drive_min} min driving</span>
                        </div>
                    </div>
                )}

                {/* View Mode Toggle: List / Map */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            <List size={14} />List View
                        </button>
                        <button onClick={() => setViewMode('map')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            <MapIcon size={14} />Map View
                        </button>
                    </div>
                </div>

                {/* Map View */}
                {viewMode === 'map' && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                            {/* Route summary */}
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border-2 border-indigo-500 flex items-center justify-center">
                                        <Route size={18} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">Day {activeDay} Route</h3>
                                        <p className="text-xs text-slate-400">{hotelDisplayName} → {currentDay?.place_count} stops → {hotelDisplayName}</p>
                                    </div>
                                </div>

                                {/* Route stops */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                                            <Hotel size={12} className="text-white" />
                                        </div>
                                        <span className="text-sm text-green-300 font-medium">{hotelDisplayName}</span>
                                        <span className="text-xs text-slate-500 ml-auto">Start</span>
                                    </div>
                                    {(dayItems[activeDay] || []).filter(i => i.type === 'place').map((item, idx) => {
                                        const place = (item as { type: 'place'; data: ItineraryPlace }).data
                                        return (
                                            <div key={place.id} className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm text-slate-200">{place.name}</span>
                                                {place.scheduled_time && <span className="text-xs text-slate-500 ml-auto">{place.scheduled_time}</span>}
                                            </div>
                                        )
                                    })}
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                                            <Hotel size={12} className="text-white" />
                                        </div>
                                        <span className="text-sm text-red-300 font-medium">{hotelDisplayName}</span>
                                        <span className="text-xs text-slate-500 ml-auto">End</span>
                                    </div>
                                </div>
                            </div>

                            {/* Open in Google Maps button */}
                            {googleMapsRouteUrl ? (
                                <div className="border-t border-slate-700 px-6 py-4">
                                    <a href={googleMapsRouteUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20">
                                        <MapIcon size={18} />
                                        Open Full Route in Google Maps
                                        <ExternalLink size={14} />
                                    </a>
                                    <p className="text-center text-[10px] text-slate-500 mt-2">Opens interactive directions with turn-by-turn navigation</p>
                                </div>
                            ) : (
                                <div className="border-t border-slate-700 px-6 py-4">
                                    <p className="text-center text-sm text-slate-400">Place coordinates not available for map view.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <AnimatePresence mode="wait">
                        {currentDay && (
                            <motion.div key={activeDay} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                className="relative max-w-2xl mx-auto">
                                {/* Vertical Line */}
                                <div className="absolute left-8 top-8 bottom-8 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full" />

                                {/* Hotel Start + Time Adjust Arrows */}
                                <div className="flex items-center gap-4 pl-4 mb-4">
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <button onClick={() => adjustStartHour(-0.5)}
                                            disabled={currentStartHour <= 7}
                                            title="Start earlier (−30 min)"
                                            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:scale-110">
                                            <ChevronUp size={16} />
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 border-4 border-indigo-400 flex items-center justify-center shadow-md">
                                            <Hotel size={14} className="text-indigo-600" />
                                        </div>
                                        <button onClick={() => adjustStartHour(0.5)}
                                            disabled={currentStartHour >= 11}
                                            title="Start later (+30 min)"
                                            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:scale-110">
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                    <div className="flex-1 bg-indigo-50 rounded-xl p-3 border border-indigo-200">
                                        <p className="text-sm font-medium text-indigo-800">{hotelDisplayName}</p>
                                        <p className="text-xs text-indigo-600">
                                            Depart at {formatTimeFromMinutes(currentStartHour * 60)}
                                            {currentDay.hotel_to_first_min ? ` • ${currentDay.hotel_to_first_min} min to first stop` : ''}
                                        </p>
                                        <p className="text-xs font-semibold text-indigo-500 mt-1">▲▼ Use arrows to adjust start time</p>
                                    </div>
                                </div>
                                {currentDay.hotel_to_first_min && (
                                    <div className="flex items-center gap-2 pl-16 pb-2 text-slate-400">
                                        <Route size={12} /><span className="text-xs font-medium">{currentDay.hotel_to_first_min} min drive</span>
                                    </div>
                                )}

                                {/* DnD: Places + Lunch */}
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={currentItems.map(getItemId)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-0">
                                            {currentItems.map((item, idx) => {
                                                if (item.type === 'lunch') {
                                                    return <SortableLunchBreak key={item.id} id={item.id} selectedEatery={item.selectedEatery}
                                                        onDelete={handleDeleteItem} onFindEateries={() => handleFindEateries(item.id)}
                                                        onSelectEatery={handleSelectEatery} eateries={eateries[item.id] || []}
                                                        eateriesLoading={eateriesLoading[item.id] || false} showEateries={showEateries[item.id] || false} />
                                                }
                                                const placeItems = currentItems.filter(i => i.type === 'place')
                                                const placeIdx = placeItems.findIndex(i => i.type === 'place' && i.data.id === item.data.id)
                                                const isLast = placeIdx === placeItems.length - 1
                                                return <PlaceCard key={item.data.id} item={item.data} idx={idx} onDelete={handleDeleteItem}
                                                    onClick={setSelectedPlace} isLast={isLast} />
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                {/* Travel to hotel + Hotel End */}
                                {currentDay.last_to_hotel_min && (
                                    <div className="flex items-center gap-2 pl-16 pt-2 text-slate-400">
                                        <Route size={12} /><span className="text-xs font-medium">{currentDay.last_to_hotel_min} min drive</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 pl-4 pt-4">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 border-4 border-indigo-400 flex items-center justify-center">
                                        <Hotel size={12} className="text-indigo-600" />
                                    </div>
                                    <span className="text-indigo-300 text-sm font-medium">
                                        Return to {hotelDisplayName}
                                        {currentDay.last_to_hotel_min && <span className="text-slate-500 ml-2">• {currentDay.last_to_hotel_min} min</span>}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Removed Places */}
            {removedPlaces.length > 0 && (
                <div className="max-w-2xl mx-auto mt-8 px-8">
                    <details className="bg-amber-900/30 rounded-xl border border-amber-700/50 overflow-hidden">
                        <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-amber-900/40 transition-colors">
                            <AlertTriangle className="text-amber-500" size={20} />
                            <span className="font-semibold text-amber-100">{removedPlaces.length} place{removedPlaces.length > 1 ? 's' : ''} removed</span>
                            <ChevronDown className="ml-auto text-amber-400" size={18} />
                        </summary>
                        <div className="p-4 pt-0 space-y-3">
                            <p className="text-sm text-amber-200/70 mb-4">These places were removed. Click to add them back.</p>
                            {removedPlaces.map(place => (
                                <div key={place.id} className="bg-slate-900/50 rounded-lg p-3 flex gap-3 items-center">
                                    {place.image_url && <img src={place.image_url} alt={place.name} className="w-12 h-12 rounded-lg object-cover bg-slate-800" />}
                                    <div className="flex-1">
                                        <div className="font-medium text-white text-sm">{place.name}</div>
                                        <div className="text-xs text-amber-300 mt-1 flex items-center gap-1"><AlertTriangle size={10} />{place.reason_text}</div>
                                    </div>
                                    {place.avg_time_minutes && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} />{place.avg_time_minutes}min</span>}
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}

            {/* On-the-way Suggestions */}
            {suggestions.length > 0 && (
                <div className="max-w-2xl mx-auto mt-12 mb-20 px-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><MapPin className="text-emerald-500" />On-the-way Suggestions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestions.map(place => (
                            <div key={place.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex gap-4 items-center">
                                <img src={place.image_url || '/placeholder.jpg'} alt={place.name} className="w-16 h-16 rounded-lg object-cover bg-slate-800" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-white text-sm mb-1 truncate">{place.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                        <Star size={12} className="text-yellow-500 fill-yellow-500" />{place.rating} ({place.review_count})
                                    </div>
                                    <button onClick={() => handleAddPlace(place.id, activeDay)}
                                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors w-full">
                                        + Add to Day {activeDay}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <PlaceDetailModal place={selectedPlace} isOpen={selectedPlace !== null} onClose={() => setSelectedPlace(null)} />

            {isMobile ? (
                <>
                    <button onClick={() => setSidebarDrawerOpen(true)}
                        className="fixed bottom-6 right-4 z-40 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center hover:bg-indigo-500 transition-colors safe-bottom">
                        <List size={22} />
                    </button>
                    <MobileDrawer isOpen={sidebarDrawerOpen} onClose={() => setSidebarDrawerOpen(false)} position="bottom" title="All Places" height="85vh">
                        <AllPlacesSidebar places={allPlacesState} selectedIds={itineraryPlaceIds} dayClusterMap={dayClusterMap}
                            onAddPlace={handleAddPlace} onBuildWithStaged={handleBuildWithStaged} onOpenDetail={handleOpenSidebarDetail} onAddNewPlace={handleAddNewPlace} embedded />
                    </MobileDrawer>
                </>
            ) : (
                <AllPlacesSidebar places={allPlacesState} selectedIds={itineraryPlaceIds} dayClusterMap={dayClusterMap}
                    onAddPlace={handleAddPlace} onBuildWithStaged={handleBuildWithStaged} onOpenDetail={handleOpenSidebarDetail} onAddNewPlace={handleAddNewPlace} />
            )}
        </div>
    )
}
