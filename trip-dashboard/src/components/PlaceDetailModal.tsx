import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Star, Lightbulb, Sun, Tag } from 'lucide-react'

interface PlaceDetailModalProps {
    place: {
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
        is_forest_circuit?: boolean
    } | null
    isOpen: boolean
    onClose: () => void
}

export function PlaceDetailModal({ place, isOpen, onClose }: PlaceDetailModalProps) {
    if (!place) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal - Bottom Sheet on Mobile, Centered on Desktop */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed z-50 bg-white overflow-hidden flex flex-col
                            inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]
                            md:inset-x-4 md:bottom-auto md:top-[10%] md:max-w-2xl md:mx-auto md:rounded-2xl md:max-h-[80vh] md:shadow-2xl
                        ">
                        {/* Drag Handle (Mobile) */}
                        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
                            <div className="w-10 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* Hero Image */}
                        <div className="relative h-40 md:h-56 bg-slate-900 shrink-0">
                            {place.image_url && (
                                <img
                                    src={place.image_url}
                                    alt={place.name}
                                    className="w-full h-full object-cover opacity-80"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Title Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-indigo-500/80 backdrop-blur-md text-white text-xs font-semibold rounded">
                                        {place.cluster}
                                    </span>
                                    {place.is_forest_circuit && (
                                        <span className="px-2 py-0.5 bg-emerald-500/80 backdrop-blur-md text-white text-xs font-semibold rounded">
                                            One-way Route
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold text-white">{place.name}</h2>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 safe-bottom">
                            {/* Quick Stats */}
                            <div className="flex items-center gap-6 text-sm">
                                {place.rating && (
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <Star size={16} fill="currentColor" />
                                        <span className="font-semibold">{place.rating}</span>
                                        {place.review_count && (
                                            <span className="text-slate-400">({place.review_count.toLocaleString()})</span>
                                        )}
                                    </div>
                                )}
                                {place.avg_time_minutes && (
                                    <div className="flex items-center gap-1 text-slate-600">
                                        <Clock size={16} />
                                        <span>~{place.avg_time_minutes} min</span>
                                    </div>
                                )}
                                {place.difficulty && (
                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${place.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                                        place.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {place.difficulty}
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            {place.short_summary && (
                                <div>
                                    <p className="text-slate-700 leading-relaxed">{place.short_summary}</p>
                                </div>
                            )}

                            {/* Best Time */}
                            {place.best_time_text && (
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <Sun className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h4 className="text-sm font-semibold text-amber-800 mb-1">Best Time to Visit</h4>
                                        <p className="text-sm text-amber-700">{place.best_time_text}</p>
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            {place.tips && place.tips.length > 0 && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Lightbulb className="text-indigo-500" size={18} />
                                        <h4 className="text-sm font-semibold text-indigo-800">Tips</h4>
                                    </div>
                                    <ul className="space-y-2">
                                        {place.tips.map((tip, i) => (
                                            <li key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                                                <span className="text-indigo-400 mt-1">•</span>
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Tags */}
                            {place.tags && place.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {place.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm"
                                        >
                                            <Tag size={12} />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
