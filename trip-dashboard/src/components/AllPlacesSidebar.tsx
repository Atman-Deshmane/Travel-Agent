import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Plus, AlertTriangle, Star, Clock, Search, X, MapPin } from 'lucide-react'

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
    dayClusterMap: { [day: number]: string } // Map of day number to cluster name
    onAddPlace: (placeId: string, targetDay: number) => void
    onOpenDetail: (place: SidebarPlace) => void
}

export function AllPlacesSidebar({
    places,
    selectedIds,
    dayClusterMap,
    onAddPlace,
    onOpenDetail
}: AllPlacesSidebarProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

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

    // Find best day for a place based on cluster
    const findBestDay = (place: SidebarPlace): number => {
        const cluster = place.cluster
        for (const [day, clusterName] of Object.entries(dayClusterMap)) {
            if (clusterName.includes(cluster) || cluster.includes(clusterName)) {
                return parseInt(day)
            }
        }
        // Default to day 1
        return 1
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
                        className="fixed right-0 top-0 h-full w-80 bg-slate-900 shadow-2xl z-30 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-3">All Places</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search places..."
                                    className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        <X size={14} />
                                    </button>
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
                                const bestDay = findBestDay(place)

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
                                                    onAddPlace(place.id, bestDay)
                                                }}
                                                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors"
                                            >
                                                <Plus size={12} />
                                                Add to Day {bestDay}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
