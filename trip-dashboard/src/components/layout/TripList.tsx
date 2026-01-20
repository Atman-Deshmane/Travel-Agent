import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import { Plus, Trash2 } from 'lucide-react'

export function TripList() {
    const { getUserTrips, activeTripId, setActiveTrip, createTrip, deleteTrip } = useUserStore()
    const trips = getUserTrips()

    return (
        <div className="flex flex-col h-full py-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 mb-4">
                <h2 className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Workspace</h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createTrip}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <Plus size={16} />
                </motion.button>
            </div>

            {/* Trip List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-1">
                {trips.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-slate-500">No trips found</p>
                        <button
                            onClick={createTrip}
                            className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 font-medium"
                        >
                            Create New
                        </button>
                    </div>
                ) : (
                    <AnimatePresence>
                        {trips.map((trip, index) => (
                            <motion.div
                                key={trip.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => setActiveTrip(trip.id)}
                                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200
                  ${activeTripId === trip.id
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                    }
                `}
                            >
                                <div className={`
                  w-1.5 h-1.5 rounded-full
                  ${activeTripId === trip.id ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-slate-600'}
                `} />

                                <span className="flex-1 text-sm font-medium truncate">{trip.name}</span>

                                <motion.button
                                    initial={{ opacity: 0 }}
                                    whileHover={{ opacity: 1, scale: 1.1 }}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteTrip(trip.id)
                                    }}
                                    className={`
                    p-1.5 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-rose-400 transition-colors
                    ${activeTripId === trip.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}
                                >
                                    <Trash2 size={12} />
                                </motion.button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
