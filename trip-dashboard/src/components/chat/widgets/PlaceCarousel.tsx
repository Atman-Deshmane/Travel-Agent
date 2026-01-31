import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, MapPin, Star, Clock, Sparkles } from 'lucide-react'

interface Place {
    id: string
    name: string
    cluster?: string
    tags?: string[]
    rating?: number
    difficulty?: string
    avg_time_minutes?: number
    rank?: number
}

interface PlaceCarouselProps {
    places: Place[]
    selectedIds?: string[]
    onConfirm: (placeIds: string[]) => void
}

export function PlaceCarousel({ places, selectedIds = [], onConfirm }: PlaceCarouselProps) {
    // Initialize with all places pre-selected if selectedIds matches places count
    const initialSelected = selectedIds.length > 0
        ? new Set(selectedIds)
        : new Set(places.map(p => p.id))  // Auto-select all if no selection provided
    const [selected, setSelected] = useState<Set<string>>(initialSelected)
    const scrollRef = useRef<HTMLDivElement>(null)

    const togglePlace = (id: string) => {
        const newSelected = new Set(selected)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelected(newSelected)
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 300
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    const handleConfirm = () => {
        if (selected.size > 0) {
            onConfirm(Array.from(selected))
        }
    }

    const selectAll = () => {
        setSelected(new Set(places.map(p => p.id)))
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium text-slate-300">
                        Recommended Places ({places.length})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={selectAll}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                        Select All
                    </button>
                    <span className="text-xs text-slate-500">|</span>
                    <span className="text-xs text-slate-400">
                        {selected.size} selected
                    </span>
                </div>
            </div>

            {/* Carousel */}
            <div className="relative">
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-slate-900/80 backdrop-blur rounded-full flex items-center justify-center text-slate-300 hover:text-white"
                >
                    <ChevronLeft size={18} />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide px-6 py-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {places.map((place, index) => (
                        <motion.button
                            key={place.id}
                            onClick={() => togglePlace(place.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex-shrink-0 w-48 p-3 rounded-xl border transition-all text-left ${selected.has(place.id)
                                ? 'bg-emerald-500/20 border-emerald-500'
                                : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-bold text-emerald-400">#{index + 1}</span>
                                {selected.has(place.id) && (
                                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <Check size={12} className="text-white" />
                                    </div>
                                )}
                            </div>

                            <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                                {place.name}
                            </h4>

                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                                <MapPin size={10} />
                                <span>{place.cluster || 'Unknown'}</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                                {place.rating && (
                                    <div className="flex items-center gap-1 text-amber-400">
                                        <Star size={10} fill="currentColor" />
                                        <span>{place.rating}</span>
                                    </div>
                                )}
                                {place.avg_time_minutes && (
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Clock size={10} />
                                        <span>{place.avg_time_minutes}m</span>
                                    </div>
                                )}
                            </div>

                            {place.tags && place.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {place.tags.slice(0, 2).map((tag, i) => (
                                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-600 text-slate-300 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.button>
                    ))}
                </div>

                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-slate-900/80 backdrop-blur rounded-full flex items-center justify-center text-slate-300 hover:text-white"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Confirm Button */}
            {selected.size > 0 && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleConfirm}
                    className="w-full mt-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
                >
                    Build Itinerary with {selected.size} places
                </motion.button>
            )}
        </motion.div>
    )
}
