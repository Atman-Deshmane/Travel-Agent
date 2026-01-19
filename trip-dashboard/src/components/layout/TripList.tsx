import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import { Plus, Trash2, MapPin, Calendar } from 'lucide-react'

export function TripList() {
    const { getUserTrips, activeTripId, setActiveTrip, createTrip, deleteTrip } = useUserStore()
    const trips = getUserTrips()

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">My Trips</h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createTrip}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
                >
                    <Plus size={14} />
                    New Trip
                </motion.button>
            </div>

            {/* Trip List */}
            <div className="flex-1 overflow-y-auto px-3">
                {trips.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-40 text-slate-400"
                    >
                        <MapPin size={28} className="mb-3 opacity-50" />
                        <p className="text-sm font-medium text-slate-300">No trips yet</p>
                        <button
                            onClick={createTrip}
                            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            Create your first trip
                        </button>
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        {trips.map((trip, index) => (
                            <motion.div
                                key={trip.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                                onClick={() => setActiveTrip(trip.id)}
                                className={`
                  group relative flex items-center gap-3 px-4 py-3 mb-2 rounded-xl cursor-pointer transition-all duration-200
                  ${activeTripId === trip.id
                                        ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/30'
                                        : 'hover:bg-white/5 border border-transparent'
                                    }
                `}
                            >
                                {/* Active Indicator */}
                                {activeTripId === trip.id && (
                                    <motion.div
                                        layoutId="active-trip-indicator"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}

                                <div className={`
                  w-9 h-9 rounded-lg flex items-center justify-center
                  ${activeTripId === trip.id
                                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500'
                                        : 'bg-slate-700/50'
                                    }
                `}>
                                    <Calendar size={16} className="text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${activeTripId === trip.id ? 'text-white' : 'text-slate-200'}`}>
                                        {trip.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 capitalize">
                                        {trip.group_type} • {trip.accommodation.status}
                                    </p>
                                </div>

                                <motion.button
                                    initial={{ opacity: 0 }}
                                    whileHover={{ scale: 1.1 }}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteTrip(trip.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                                >
                                    <Trash2 size={14} />
                                </motion.button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
