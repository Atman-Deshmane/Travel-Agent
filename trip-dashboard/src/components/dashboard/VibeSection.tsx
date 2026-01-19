import { motion } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Sparkles, Footprints, Mountain, Accessibility, Zap, Save } from 'lucide-react'
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
        { value: 'high', icon: <Mountain size={22} />, label: 'Trekker', description: 'Long hikes, steep trails' },
        { value: 'medium', icon: <Footprints size={22} />, label: 'Moderate', description: 'Short walks ok' },
        { value: 'low', icon: <Accessibility size={22} />, label: 'Easy Access', description: 'Vehicle-friendly' },
    ]

    const foodOptions: { value: TripContext['food_preference']; label: string; emoji: string }[] = [
        { value: 'veg', label: 'Vegetarian', emoji: '🥬' },
        { value: 'non_veg', label: 'Non-Veg', emoji: '🍗' },
        { value: 'flexible', label: 'Flexible', emoji: '🍽️' },
    ]

    const handleInterestToggle = (interest: string) => {
        const current = trip.interests
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

    const handleSaveMobilityToProfile = () => {
        if (currentUser) {
            updateProfile(currentUser.id, { mobility: trip.mobility })
        }
    }

    return (
        <motion.section
            className="card p-6"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400 }}
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Sparkles className="text-violet-600" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">The Vibe</h3>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Preferences & Interests</p>
                </div>
            </div>

            {/* Pace */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Trip Pace</label>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSavePaceToProfile}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-violet-600 transition-colors"
                    >
                        <Save size={12} />
                        Save as default
                    </motion.button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {paceOptions.map(opt => (
                        <motion.button
                            key={opt.value}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateTrip(trip.id, { pace: opt.value })}
                            className={`
                relative p-5 rounded-xl border-2 text-center transition-all duration-200
                ${trip.pace === opt.value
                                    ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg shadow-violet-500/10'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }
              `}
                        >
                            <span className="text-2xl mb-2 block">{opt.emoji}</span>
                            <p className={`font-semibold ${trip.pace === opt.value ? 'text-violet-700' : 'text-slate-900'}`}>
                                {opt.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{opt.description}</p>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Mobility */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Mobility Level</label>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSaveMobilityToProfile}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400 hover:text-violet-600 transition-colors"
                    >
                        <Save size={12} />
                        Save as default
                    </motion.button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {mobilityOptions.map(opt => (
                        <motion.button
                            key={opt.value}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateTrip(trip.id, { mobility: opt.value })}
                            className={`
                flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200
                ${trip.mobility === opt.value
                                    ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 text-violet-600 shadow-lg shadow-violet-500/10'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                }
              `}
                        >
                            {opt.icon}
                            <p className="font-semibold text-sm">{opt.label}</p>
                            <p className="text-xs text-slate-500">{opt.description}</p>
                        </motion.button>
                    ))}
                </div>
                {trip.family_composition.has_elders && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-xs text-amber-600 mt-3 bg-amber-50 px-4 py-2 rounded-lg"
                    >
                        <Zap size={14} />
                        Auto-set to Easy Access because elders are traveling
                    </motion.p>
                )}
            </div>

            {/* Interests */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Interests</label>
                    <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">Auto-saved</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map(interest => (
                        <motion.button
                            key={interest}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleInterestToggle(interest)}
                            className={`
                px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                ${trip.interests.includes(interest)
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }
              `}
                        >
                            {interest}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Food Preference */}
            <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
                    Food Preference
                </label>
                <div className="flex gap-3">
                    {foodOptions.map(opt => (
                        <motion.button
                            key={opt.value}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => updateTrip(trip.id, { food_preference: opt.value })}
                            className={`
                flex items-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200
                ${trip.food_preference === opt.value
                                    ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 text-violet-700 shadow-lg shadow-violet-500/10'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }
              `}
                        >
                            <span>{opt.emoji}</span>
                            {opt.label}
                        </motion.button>
                    ))}
                </div>
            </div>
        </motion.section>
    )
}
