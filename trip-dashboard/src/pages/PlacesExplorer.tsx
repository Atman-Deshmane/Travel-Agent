import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Tag, Plus, X, Sparkles } from 'lucide-react'
import { PlaceCard } from '../components/PlaceCard'
import { WeightSlider } from '../components/WeightSlider'
import { PlaceDetailModal } from '../components/PlaceDetailModal'
import { API_ENDPOINTS } from '../config/api'

interface ScoredPlace {
    id: string
    name: string
    cluster: string
    nearest_cluster?: string
    image_url?: string
    tags: string[]
    rating?: number
    review_count?: number
    difficulty?: string
    avg_time_minutes?: number
    scores: { pop: number; sim: number }
    final_score: number
    popularity_rank?: number
    flags: string[]
    // Detail fields from place_data
    tips?: string[]
    short_summary?: string
    best_time_text?: string
    is_forest_circuit?: boolean
    place_data?: any
}

interface PlacesExplorerProps {
    userProfile: {
        interests: string[]
        difficulty: string
    }
    tripConfig: {
        numDays: number
        pace: string // 'slow' | 'medium' | 'fast' | 'balanced'(maps to medium) | 'chill'(maps to slow)
    }
    onBack: () => void
    onBuildItinerary: (selectedIds: string[], keptFlaggedIds: string[], allPlaces: any[]) => void
}

// Loading Terminal Animation
function LoadingTerminal({ stage }: { stage: number }) {
    const stages = [
        "Analyzing your preferences...",
        "Fetching the list of places...",
        "Building your super amazing list..."
    ]

    return (
        <div className="flex flex-col items-center justify-center h-96 bg-slate-950 text-emerald-500 font-mono p-8 rounded-2xl">
            <div className="w-full max-w-md space-y-4">
                {stages.slice(0, stage + 1).map((text, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        {i < stage ? (
                            <span className="text-emerald-400">✓</span>
                        ) : (
                            <Loader2 size={14} className="animate-spin" />
                        )}
                        <span className={i < stage ? 'text-slate-500' : ''}>{text}</span>
                    </motion.div>
                ))}
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-6">
                    <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${((stage + 1) / stages.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>
        </div>
    )
}

const PACE_MAPPING: Record<string, number> = {
    'slow': 3,
    'chill': 3,
    'medium': 5,
    'balanced': 5,
    'fast': 8,
    'packed': 8
}

export function PlacesExplorer({ userProfile, tripConfig, onBack, onBuildItinerary }: PlacesExplorerProps) {
    const [loading, setLoading] = useState(true)
    const [loadingStage, setLoadingStage] = useState(0)
    const [places, setPlaces] = useState<ScoredPlace[]>([])
    const [byPopularity, setByPopularity] = useState<ScoredPlace[]>([])
    const [bySimilarity, setBySimilarity] = useState<ScoredPlace[]>([])
    const [sliderValue, setSliderValue] = useState(60) // Default 40% pop, 60% sim
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [keptFlaggedIds, setKeptFlaggedIds] = useState<Set<string>>(new Set())
    const [interests, setInterests] = useState<string[]>(userProfile.interests)
    const [newTag, setNewTag] = useState('')
    const [showTagInput, setShowTagInput] = useState(false)
    const [selectedPlace, setSelectedPlace] = useState<ScoredPlace | null>(null)
    const hasAutoSelected = useRef(false)

    // Calculate target places count
    const dailyLimit = PACE_MAPPING[tripConfig.pace.toLowerCase()] || 5
    const targetCount = dailyLimit * tripConfig.numDays

    // Fetch scored places from API
    const fetchPlaces = useCallback(async () => {
        setLoading(true)
        setLoadingStage(0)

        try {
            // Stage 1: Analyzing
            await new Promise(r => setTimeout(r, 800))
            setLoadingStage(1)

            // Stage 2: Fetching
            const response = await fetch(API_ENDPOINTS.fetchScoredPlaces, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_profile: {
                        interests,
                        difficulty: userProfile.difficulty
                    },
                    weight: {
                        popularity: (100 - sliderValue) / 100,
                        similarity: sliderValue / 100
                    }
                })
            })

            setLoadingStage(2)
            await new Promise(r => setTimeout(r, 600))

            if (!response.ok) throw new Error('Failed to fetch places')

            const data = await response.json()
            const fetchedPlaces = data.places || []
            setPlaces(fetchedPlaces)
            setByPopularity(data.by_popularity || [])
            setBySimilarity(data.by_similarity || [])

            // Initial Auto Selection
            if (!hasAutoSelected.current && fetchedPlaces.length > 0) {
                const autoSelected = new Set<string>()
                let count = 0
                for (const place of fetchedPlaces) {
                    if (count >= targetCount) break
                    // Skip flagged items (Outskirts, High Effort etc) unless explictly kept? 
                    // User said "by default we'll remove places in outskirts"
                    if (place.flags && place.flags.length > 0) continue

                    autoSelected.add(place.id)
                    count++
                }
                setSelectedIds(autoSelected)
                hasAutoSelected.current = true
            }

        } catch (error) {
            console.error('Error fetching places:', error)
        } finally {
            setLoading(false)
        }
    }, [interests, userProfile.difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

    // Enrich a scored place with detail fields from place_data for the modal
    const enrichAndSelectPlace = (place: ScoredPlace) => {
        const pd = place.place_data
        const enriched: ScoredPlace = {
            ...place,
            tips: pd?.content?.tips || [],
            short_summary: pd?.content?.short_summary || '',
            best_time_text: pd?.content?.best_time_text || '',
            is_forest_circuit: pd?.logic?.is_forest_circuit || false,
        }
        setSelectedPlace(enriched)
    }

    // Initial fetch
    useEffect(() => {
        fetchPlaces()
    }, []) // Only on mount

    // Re-score when slider changes (debounced)
    useEffect(() => {
        if (loading) return

        const timeout = setTimeout(() => {
            // Recalculate final scores locally
            const popWeight = (100 - sliderValue) / 100
            const simWeight = sliderValue / 100

            const rescored = places.map(p => ({
                ...p,
                final_score: p.scores.pop * popWeight + p.scores.sim * simWeight
            }))

            rescored.sort((a, b) => b.final_score - a.final_score)
            setPlaces(rescored)
        }, 150)

        return () => clearTimeout(timeout)
    }, [sliderValue])

    // Re-fetch when interests change
    const handleAddTag = () => {
        if (newTag.trim() && !interests.includes(newTag.trim())) {
            setInterests([...interests, newTag.trim()])
            setNewTag('')
            setShowTagInput(false)
            // Trigger re-fetch
            hasAutoSelected.current = false // Allow re-select? Maybe not, keep user selection.
            // Actually re-fetching might completely change list.
            setTimeout(fetchPlaces, 100)
        }
    }

    const handleRemoveTag = (tag: string) => {
        setInterests(interests.filter(t => t !== tag))
        setTimeout(fetchPlaces, 100)
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const handleKeepFlagged = (id: string) => {
        setKeptFlaggedIds(new Set([...keptFlaggedIds, id]))
        setSelectedIds(new Set([...selectedIds, id]))
    }

    const handleBuildItinerary = () => {
        onBuildItinerary(Array.from(selectedIds), Array.from(keptFlaggedIds), places)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
                <LoadingTerminal stage={loadingStage} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-slate-200 px-8 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium">Back to Preferences</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                {selectedIds.size} / {targetCount} selected
                            </span>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleBuildItinerary}
                                disabled={selectedIds.size === 0}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles size={16} />
                                Build Itinerary
                                <ArrowRight size={16} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Interest Tags */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                            Your Interests:
                        </span>
                        {interests.map(tag => (
                            <span
                                key={tag}
                                className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                            >
                                <Tag size={12} />
                                {tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1 hover:text-indigo-900"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                        {showTagInput ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                    placeholder="Add interest..."
                                    className="px-3 py-1 text-sm border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAddTag}
                                    className="p-1 text-indigo-600 hover:text-indigo-800"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowTagInput(true)}
                                className="flex items-center gap-1 px-3 py-1 border border-dashed border-slate-300 text-slate-500 rounded-full text-sm hover:border-indigo-400 hover:text-indigo-600"
                            >
                                <Plus size={14} />
                                Add Tag
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Slider Section */}
            <div className="max-w-7xl mx-auto px-8 py-6">
                <WeightSlider value={sliderValue} onChange={setSliderValue} />
            </div>

            {/* Three Column Layout */}
            <div className="max-w-7xl mx-auto px-8 pb-32">
                <div className="grid grid-cols-3 gap-6">
                    {/* Column 1: Popularity (Checkbox Mode) */}
                    <div>
                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Popularity Rank
                        </h3>
                        <div className="space-y-4">
                            {byPopularity.slice(0, targetCount + 5).map((place) => (
                                <PlaceCard
                                    key={`pop-${place.id}`}
                                    {...place}
                                    showScore="pop"
                                    actionType="checkbox"
                                    isSelected={selectedIds.has(place.id)}
                                    onToggleSelect={toggleSelect}
                                    onKeepFlagged={handleKeepFlagged}
                                    onClick={() => enrichAndSelectPlace(place)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Similarity (Checkbox Mode) */}
                    <div>
                        <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Personalization Rank
                        </h3>
                        <div className="space-y-4">
                            {bySimilarity.slice(0, targetCount + 5).map((place) => (
                                <PlaceCard
                                    key={`sim-${place.id}`}
                                    {...place}
                                    showScore="sim"
                                    actionType="checkbox"
                                    isSelected={selectedIds.has(place.id)}
                                    onToggleSelect={toggleSelect}
                                    onKeepFlagged={handleKeepFlagged}
                                    onClick={() => enrichAndSelectPlace(place)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Column 3: Final (Button Mode - Prominent) */}
                    <div>
                        <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Final Ranking
                        </h3>
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {places.slice(0, targetCount + 5).map((place) => (
                                    <PlaceCard
                                        key={`final-${place.id}`}
                                        {...place}
                                        showScore="final"
                                        actionType="button" // Keep button for final ranking
                                        isSelected={selectedIds.has(place.id)}
                                        onToggleSelect={toggleSelect}
                                        onKeepFlagged={handleKeepFlagged}
                                        onClick={() => enrichAndSelectPlace(place)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        <span className="font-semibold text-slate-900">{selectedIds.size}</span> places selected out of <span className="font-semibold text-slate-900">{targetCount}</span> recommended
                        {keptFlaggedIds.size > 0 && (
                            <span className="ml-2 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200">
                                {keptFlaggedIds.size} warnings ignored
                            </span>
                        )}
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleBuildItinerary}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-2xl hover:bg-slate-800 disabled:opacity-50"
                    >
                        <Sparkles size={18} className="text-indigo-400" />
                        Build {tripConfig.numDays}-Day Itinerary
                        <ArrowRight size={18} />
                    </motion.button>
                </div>
            </div>

            {/* Place Detail Modal */}
            <PlaceDetailModal
                place={selectedPlace}
                isOpen={selectedPlace !== null}
                onClose={() => setSelectedPlace(null)}
            />
        </div>
    )
}
