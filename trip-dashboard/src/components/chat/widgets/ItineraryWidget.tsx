import { motion } from 'framer-motion'
import { MapPin, Clock, Car, Check, Sparkles } from 'lucide-react'

interface ItineraryDay {
    day: number
    cluster: string
    places: Array<{
        name: string
        scheduled_time?: string
        departure_time?: string
        avg_time_minutes?: number
        travel_to_next_min?: number
        has_lunch_before?: boolean
    }>
    start_time?: string
    end_time?: string
    total_drive_min?: number
}

interface ItineraryWidgetProps {
    itinerary: {
        days?: ItineraryDay[]
        suggestions?: any[]
    }
    onConfirm: () => void
}

export function ItineraryWidget({ itinerary, onConfirm }: ItineraryWidgetProps) {
    const days = itinerary?.days || []

    if (days.length === 0) {
        return (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">No itinerary data available.</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm max-w-2xl"
        >
            <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-indigo-500" />
                <span className="text-sm font-medium text-slate-600">Your Itinerary</span>
            </div>

            <div className="space-y-4">
                {days.map((day) => (
                    <div key={day.day} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                    {day.day}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">Day {day.day}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <MapPin size={10} />
                                        {day.cluster}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                                <div className="flex items-center gap-1 justify-end">
                                    <Clock size={10} />
                                    {day.start_time} - {day.end_time}
                                </div>
                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                    <Car size={10} />
                                    {day.total_drive_min || 0} min driving
                                </div>
                            </div>
                        </div>

                        {/* Places Timeline */}
                        <div className="space-y-2 ml-4 border-l-2 border-slate-200 pl-4">
                            {day.places.map((place, idx) => (
                                <div key={idx} className="relative">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-500" />

                                    {/* Lunch indicator */}
                                    {place.has_lunch_before && (
                                        <div className="text-xs text-amber-500 mb-1 flex items-center gap-1 font-medium bg-amber-50 inline-block px-1.5 py-0.5 rounded ml-[-2px]">
                                            🍽️ Lunch Break
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-sm text-slate-800 font-medium">{place.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {place.scheduled_time && (
                                                    <span>{place.scheduled_time} - {place.departure_time}</span>
                                                )}
                                                {place.avg_time_minutes && (
                                                    <span className="ml-2">({place.avg_time_minutes} min)</span>
                                                )}
                                            </div>
                                        </div>
                                        {(place.travel_to_next_min ?? 0) > 0 && (
                                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                                <Car size={10} />
                                                {place.travel_to_next_min}m
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirm Button */}
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onConfirm}
                className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md shadow-indigo-200"
            >
                <Check size={18} />
                Save this Itinerary
            </motion.button>
        </motion.div>
    )
}
