import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, Star, Hotel, Route, Loader2, ArrowLeft, Utensils } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

interface ItineraryPlace {
    name: string
    cluster: string
    image_url?: string
    tags: string[]
    rating?: number
    avg_time_minutes?: number
    scheduled_time?: string
    departure_time?: string
    travel_to_next_min: number
    is_forest_circuit?: boolean
    has_lunch_before?: boolean
}

interface ItineraryDay {
    day: number
    cluster: string
    places: ItineraryPlace[]
    total_drive_min: number
    place_count: number
    hotel_to_first_min?: number
    last_to_hotel_min?: number
    hotel_name?: string
}

export function SharedItineraryView() {
    const { userName, tripName } = useParams<{ userName: string; tripName: string }>()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [days, setDays] = useState<ItineraryDay[]>([])
    const [activeDay, setActiveDay] = useState(1)
    const [displayTripName, setDisplayTripName] = useState('')
    const [savedAt, setSavedAt] = useState('')
    const [displayUserName, setDisplayUserName] = useState('')

    useEffect(() => {
        if (!userName || !tripName) return
        const loadItinerary = async () => {
            setLoading(true); setError(null)
            try {
                const response = await fetch(API_ENDPOINTS.loadItinerary(userName, tripName))
                if (!response.ok) {
                    if (response.status === 404) throw new Error('Itinerary not found. It may not have been saved yet.')
                    throw new Error('Failed to load itinerary')
                }
                const data = await response.json()
                setDays(data.itinerary?.days || [])
                setDisplayTripName(data.trip_name || tripName.replace(/_/g, ' '))
                setDisplayUserName(data.user_name || userName.replace(/_/g, ' '))
                setSavedAt(data.saved_at || '')
            } catch (err: any) {
                setError(err.message || 'Failed to load itinerary')
            } finally { setLoading(false) }
        }
        loadItinerary()
    }, [userName, tripName])

    const currentDay = days.find(d => d.day === activeDay)

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="text-indigo-400 animate-spin mx-auto mb-4" />
                    <p className="text-indigo-300 font-mono text-sm">Loading itinerary...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <p className="text-red-400 text-lg mb-4">{error}</p>
                    <Link to="/" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-500 transition-colors inline-flex items-center gap-2">
                        <ArrowLeft size={16} />Go to Planner
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-lg border-b border-slate-800 px-4 md:px-8 py-3 md:py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={18} /><span className="text-sm font-medium">Kodai Planner</span>
                    </Link>
                    <div className="text-right">
                        <p className="text-sm text-white font-semibold">{displayUserName}'s Trip</p>
                        <p className="text-xs text-slate-400">{displayTripName}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
                {/* Trip Title */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {displayTripName}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {days.length} day trip • {days.reduce((sum, d) => sum + d.place_count, 0)} places
                    </p>
                    {savedAt && <p className="text-slate-500 text-xs mt-1">Saved {new Date(savedAt).toLocaleDateString()}</p>}
                </div>

                {/* Day Tabs */}
                <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-1">
                    {days.map(day => (
                        <button key={day.day} onClick={() => setActiveDay(day.day)}
                            className={`px-5 py-2.5 rounded-xl font-semibold transition-all shrink-0 ${activeDay === day.day ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            <div className="flex items-center gap-2"><Calendar size={14} />Day {day.day}</div>
                            <div className="text-[10px] mt-1 opacity-70">{day.cluster}</div>
                        </button>
                    ))}
                </div>

                {/* Day Content */}
                {currentDay && (
                    <div className="relative max-w-2xl mx-auto">
                        {/* Day info */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-white mb-1">{currentDay.cluster}</h2>
                            <div className="flex items-center justify-center gap-4 text-slate-400 text-sm">
                                <span className="flex items-center gap-1.5"><MapPin size={14} />{currentDay.place_count} stops</span>
                                <span className="flex items-center gap-1.5"><Clock size={14} />~{currentDay.total_drive_min} min driving</span>
                            </div>
                        </div>

                        {/* Vertical Line */}
                        <div className="absolute left-8 top-32 bottom-8 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full" />

                        {/* Hotel Start */}
                        {currentDay.hotel_name && (
                            <div className="flex items-center gap-4 pl-4 mb-4">
                                <div className="relative z-10 w-10 h-10 rounded-full bg-indigo-100 border-4 border-indigo-400 flex items-center justify-center shadow-md">
                                    <Hotel size={14} className="text-indigo-600" />
                                </div>
                                <div className="flex-1 bg-indigo-50 rounded-xl p-3 border border-indigo-200">
                                    <p className="text-sm font-medium text-indigo-800">{currentDay.hotel_name}</p>
                                </div>
                            </div>
                        )}

                        {/* Places */}
                        {currentDay.places.map((place, idx) => (
                            <div key={idx}>
                                {place.has_lunch_before && (
                                    <div className="flex items-center gap-4 pl-4 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center">
                                            <Utensils size={14} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1 bg-amber-50 rounded-xl p-3 border border-amber-200">
                                            <p className="text-sm font-medium text-amber-800">🍽️ Lunch Break</p>
                                            <p className="text-xs text-amber-600">~90 min</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-4 pl-4 mb-1">
                                    <div className="relative z-10 flex-shrink-0 flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center shadow-md">
                                            <span className="text-[10px] font-bold text-indigo-600">{place.scheduled_time || `${idx + 1}`}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-lg mb-4">
                                        <div className="flex">
                                            {place.image_url && (
                                                <div className="w-24 h-24 bg-slate-100 flex-shrink-0">
                                                    <img src={place.image_url} alt={place.name} className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                                </div>
                                            )}
                                            <div className="flex-1 p-4">
                                                <h4 className="font-bold text-slate-900">{place.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-indigo-600 font-medium">{place.cluster}</span>
                                                    {place.rating && <span className="flex items-center gap-1 text-xs text-amber-600"><Star size={10} fill="currentColor" />{place.rating}</span>}
                                                    {place.avg_time_minutes && <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={10} />~{place.avg_time_minutes} min</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {place.tags?.slice(0, 2).map(tag => <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{tag}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {place.travel_to_next_min > 0 && idx < currentDay.places.length - 1 && (
                                    <div className="flex items-center gap-2 pl-16 pb-2 text-slate-400">
                                        <Route size={12} /><span className="text-xs font-medium">{place.travel_to_next_min} min drive</span>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Hotel End */}
                        {currentDay.hotel_name && (
                            <div className="flex items-center gap-4 pl-4 pt-4">
                                <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 border-4 border-indigo-400 flex items-center justify-center">
                                    <Hotel size={12} className="text-indigo-600" />
                                </div>
                                <span className="text-indigo-300 text-sm font-medium">Return to {currentDay.hotel_name}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-12 mb-8">
                    <p className="text-slate-500 text-xs mb-4">Built with Kodai Planner</p>
                    <Link to="/" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-500 transition-colors inline-flex items-center gap-2">
                        Plan Your Own Trip
                    </Link>
                </div>
            </div>
        </div>
    )
}
