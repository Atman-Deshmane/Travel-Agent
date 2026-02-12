import { motion } from 'framer-motion'
import { AlertTriangle, Check, Plus } from 'lucide-react'

interface PlaceCardProps {
    id: string
    name: string
    cluster: string
    image_url?: string
    tags: string[]
    rating?: number
    review_count?: number
    scores: {
        pop: number
        sim: number
    }
    final_score: number
    flags: string[]
    popularity_rank?: number
    isSelected?: boolean
    onToggleSelect?: (id: string) => void
    onKeepFlagged?: (id: string) => void
    showScore: 'pop' | 'sim' | 'final'
    actionType?: 'button' | 'checkbox'
    onClick?: () => void
}

export function PlaceCard({
    id,
    name,
    cluster,
    image_url,
    tags = [],
    rating,
    review_count,
    scores,
    final_score,
    flags = [],
    popularity_rank,
    isSelected = false,
    onToggleSelect,
    onKeepFlagged,
    showScore,
    actionType = 'button',
    onClick
}: PlaceCardProps) {
    const hasWarning = flags.length > 0
    const scoreValue = showScore === 'pop' ? scores.pop : showScore === 'sim' ? scores.sim : final_score

    // Format numbers
    const formattedReviews = review_count ? new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(review_count) : ''

    return (
        <motion.div
            layout // Enable layout animations
            initial={{ opacity: 0, y: 10 }}
            animate={{
                opacity: hasWarning && !isSelected ? 0.7 : 1,
                y: 0,
                // Greyscale if warned and not selected? Maybe just opacity
                filter: hasWarning && !isSelected ? 'grayscale(0.5)' : 'none'
            }}
            whileHover={{ y: -4 }}
            onClick={onClick}
            className={`group flex flex-col bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 h-full ${onClick ? 'cursor-pointer' : ''} ${isSelected
                ? 'border-indigo-500 ring-1 ring-indigo-500'
                : hasWarning
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
        >
            {/* Image Section - Responsive Height */}
            <div className="relative h-32 md:h-40 bg-slate-100 overflow-hidden shrink-0">
                {image_url ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url('${image_url}')` }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-60" />

                {/* Rank Badge */}
                {popularity_rank && (
                    <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-900 shadow-sm border border-slate-200">
                        #{popularity_rank}
                    </div>
                )}

                {/* Score Badge (Top Right) */}
                <div className="absolute top-2 right-2 flex flex-col items-end">
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md border shadow-sm ${showScore === 'pop' ? 'bg-blue-50/90 text-blue-700 border-blue-200' :
                        showScore === 'sim' ? 'bg-purple-50/90 text-purple-700 border-purple-200' :
                            'bg-emerald-50/90 text-emerald-700 border-emerald-200'
                        }`}>
                        {scoreValue.toFixed(0)} <span className="text-[8px] uppercase opacity-70 ml-0.5">{showScore}</span>
                    </div>
                </div>

                {/* Checkbox Action (If checkbox mode) */}
                {actionType === 'checkbox' && onToggleSelect && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleSelect(id)
                        }}
                        className={`absolute bottom-2 right-2 w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-400 hover:text-indigo-600'
                            }`}
                    >
                        {isSelected ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                )}
            </div>

            {/* Content Section */}
            <div className="p-3 flex flex-col flex-1 gap-2">
                {/* Title & Warning */}
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1" title={name}>
                        {name}
                    </h3>

                    {/* Meta Row: Cluster | Rating | Reviews */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="truncate max-w-[80px] text-slate-400">{cluster}</span>
                        {rating && (
                            <div className="flex items-center gap-1 font-medium text-slate-700">
                                <span className="text-amber-400">★</span>
                                {rating}
                                {review_count && <span className="text-slate-400 font-normal">({formattedReviews})</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tags */}
                <div className="flex gap-1.5 mt-auto pt-2 overflow-x-auto mobile-scroll">
                    {tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold tracking-wide border border-indigo-100 whitespace-nowrap">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Warning Banner */}
                {hasWarning && (
                    <div className="mt-1 flex items-start gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                        <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-amber-800 leading-tight">
                                {flags[0]}
                            </p>
                            {/* Keep Button */}
                            {onKeepFlagged && !isSelected && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onKeepFlagged(id)
                                    }}
                                    className="mt-1 text-[10px] font-semibold text-amber-600 underline decoration-amber-300 hover:text-amber-800"
                                >
                                    Keep this place
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Button Action (If button mode) */}
                {actionType === 'button' && onToggleSelect && (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onToggleSelect(id)}
                        className={`w-full mt-2 py-2.5 md:py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[44px] md:min-h-0 ${isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                    >
                        {isSelected ? (
                            <>
                                <Check size={14} strokeWidth={2.5} />
                                <span>Added</span>
                            </>
                        ) : (
                            <>
                                <Plus size={14} strokeWidth={2.5} />
                                <span>Add to Itinerary</span>
                            </>
                        )}
                    </motion.button>
                )}
            </div>
        </motion.div>
    )
}
