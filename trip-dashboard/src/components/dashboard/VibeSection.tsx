import { motion } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Sparkles, Footprints, Mountain, Accessibility } from 'lucide-react'
import { INTEREST_OPTIONS } from '../../data/mock_users'

interface VibeSectionProps {
    trip: TripContext
}

export function VibeSection({ trip }: VibeSectionProps) {
    const { updateTrip, updateProfile, getCurrentUser } = useUserStore()
    const currentUser = getCurrentUser()

    const paceOptions: { value: TripContext['pace']; label: string; description: string; emoji: string }[] = [
        { value: 'chill', label: 'Chill', description: '2-3 spots/day', emoji: '🧘' },
        { value: 'balanced', label: 'Balanced', description: '4-5 spots/day', emoji: '⚖️' },
        { value: 'packed', label: 'Packed', description: '6+ spots/day', emoji: '🚀' },
    ]

    const mobilityOptions: { value: TripContext['mobility']; icon: React.ReactNode; label: string; description: string }[] = [
        { value: 'high', icon: <Mountain size={24} />, label: 'Trekker', description: 'Long hikes, steep trails' },
        { value: 'medium', icon: <Footprints size={24} />, label: 'Moderate', description: 'Short walks ok' },
        { value: 'low', icon: <Accessibility size={24} />, label: 'Easy Access', description: 'Vehicle-friendly' },
    ]

    const foodOptions: { value: TripContext['food_preference']; label: string; emoji: string }[] = [
        { value: 'veg', label: 'Vegetarian', emoji: '🥬' },
        { value: 'non_veg', label: 'Non-Veg', emoji: '🍗' },
        { value: 'flexible', label: 'Flexible', emoji: '🍽️' },
    ]

    const handleInterestToggle = (interest: string) => {
        const current = trip.interests || []
        const updated = current.includes(interest)
            ? current.filter(i => i !== interest)
            : [...current, interest]

        updateTrip(trip.id, { interests: updated })
        if (currentUser) {
            updateProfile(currentUser.id, { interests: updated })
        }
    }

    const handleSavePaceToProfile = () => {
        if (currentUser) {
            updateProfile(currentUser.id, { pace: trip.pace })
        }
    }

    return (
        <motion.section
            className="card-premium p-8"
            whileHover={{ y: -2 }}
        >
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                    <Sparkles className="text-violet-600" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">The Vibe</h3>
                    <p className="text-label text-slate-500 mt-1">Preferences & Interests</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Left Column: Pace & Mobility (Width 6) */}
                <div className="col-span-6 space-y-8">
                    {/* Pace */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-label text-slate-500">Trip Pace</label>
                            <button
                                onClick={handleSavePaceToProfile}
                                className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                            >
                                Save Default
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {paceOptions.map(opt => (
                                <motion.button
                                    key={opt.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => updateTrip(trip.id, { pace: opt.value })}
                                    className={`
                    relative p-4 rounded-xl border transition-all duration-200 text-center
                    ${trip.pace === opt.value
                                            ? 'bg-violet-50 border-violet-500 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }
                  `}
                                >
                                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                                    <p className={`font-bold ${trip.pace === opt.value ? 'text-violet-700' : 'text-slate-900'}`}>{opt.label}</p>
                                    <p className="text-xs text-slate-500 mt-1">{opt.description}</p>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Mobility */}
                    <div>
                        <label className="block text-label mb-3 text-slate-500">Mobility Level</label>
                        <div className="grid grid-cols-3 gap-3">
                            {mobilityOptions.map(opt => (
                                <motion.button
                                    key={opt.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => updateTrip(trip.id, { mobility: opt.value })}
                                    className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200
                    ${trip.mobility === opt.value
                                            ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }
                  `}
                                >
                                    {opt.icon}
                                    <span className="text-sm font-semibold">{opt.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Interests & Food (Width 6) */}
                <div className="col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-100 h-fit">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <label className="text-label text-slate-500">Interests</label>
                            <span className="bg-violet-100 text-violet-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Auto-saved</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {INTEREST_OPTIONS.map(interest => (
                                <motion.button
                                    key={interest}
                                    layout
                                    onClick={() => handleInterestToggle(interest)}
                                    className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${(trip.interests || []).includes(interest)
                                            ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                        }
                  `}
                                >
                                    {interest}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-label mb-3 text-slate-500">Food Preference</label>
                        <div className="flex gap-3">
                            {foodOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => updateTrip(trip.id, { food_preference: opt.value })}
                                    className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all
                    ${trip.food_preference === opt.value
                                            ? 'bg-white border-violet-500 text-violet-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }
                  `}
                                >
                                    <span>{opt.emoji}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.section>
    )
}
