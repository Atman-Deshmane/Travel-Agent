import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Sparkles, Footprints, Mountain, Accessibility, Plus } from 'lucide-react'
import { INTEREST_OPTIONS } from '../../data/mock_users'
import { SmartFieldWrapper } from '../ui/SmartFieldWrapper'

interface VibeSectionProps {
    trip: TripContext
    errors?: {
        interests?: boolean
    }
}

export function VibeSection({ trip, errors = {} }: VibeSectionProps) {
    const { updateTrip, updateProfile, getCurrentUser } = useUserStore()
    const currentUser = getCurrentUser()

    // Track which fields should be saved as defaults
    const [savePaceAsDefault, setSavePaceAsDefault] = useState(
        currentUser?.defaults.pace === trip.pace
    )
    const [saveMobilityAsDefault, setSaveMobilityAsDefault] = useState(
        currentUser?.defaults.mobility === trip.mobility
    )
    const [saveFoodAsDefault, setSaveFoodAsDefault] = useState(
        currentUser?.defaults.food_preference === trip.food_preference
    )
    // Interests: Save as Default is checked by default
    const [saveInterestsAsDefault, setSaveInterestsAsDefault] = useState(true)

    // Custom interest input
    const [customInterest, setCustomInterest] = useState('')

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

        // Save to profile if checkbox is checked
        if (saveInterestsAsDefault && currentUser) {
            updateProfile(currentUser.id, { interests: updated })
        }
    }

    const handleAddCustomInterest = () => {
        const trimmed = customInterest.trim()
        if (trimmed && !(trip.interests || []).includes(trimmed)) {
            const updated = [...(trip.interests || []), trimmed]
            updateTrip(trip.id, { interests: updated })

            if (saveInterestsAsDefault && currentUser) {
                updateProfile(currentUser.id, { interests: updated })
            }
            setCustomInterest('')
        }
    }

    const handleInterestsDefaultToggle = (checked: boolean) => {
        setSaveInterestsAsDefault(checked)
        if (checked && currentUser) {
            updateProfile(currentUser.id, { interests: trip.interests || [] })
        }
    }

    const handlePaceChange = (value: TripContext['pace']) => {
        updateTrip(trip.id, { pace: value })
        if (savePaceAsDefault && currentUser) {
            updateProfile(currentUser.id, { pace: value })
        }
    }

    const handlePaceDefaultToggle = (checked: boolean) => {
        setSavePaceAsDefault(checked)
        if (checked && currentUser) {
            updateProfile(currentUser.id, { pace: trip.pace })
        }
    }

    const handleMobilityChange = (value: TripContext['mobility']) => {
        updateTrip(trip.id, { mobility: value })
        if (saveMobilityAsDefault && currentUser) {
            updateProfile(currentUser.id, { mobility: value })
        }
    }

    const handleMobilityDefaultToggle = (checked: boolean) => {
        setSaveMobilityAsDefault(checked)
        if (checked && currentUser) {
            updateProfile(currentUser.id, { mobility: trip.mobility })
        }
    }

    const handleFoodChange = (value: TripContext['food_preference']) => {
        updateTrip(trip.id, { food_preference: value })
        if (saveFoodAsDefault && currentUser) {
            updateProfile(currentUser.id, { food_preference: value })
        }
    }

    const handleFoodDefaultToggle = (checked: boolean) => {
        setSaveFoodAsDefault(checked)
        if (checked && currentUser) {
            updateProfile(currentUser.id, { food_preference: trip.food_preference })
        }
    }

    return (
        <motion.section
            id="vibe-section"
            className="card-premium p-4 md:p-8"
            whileHover={{ y: -2 }}
        >
            <div className="flex items-center gap-4 mb-4 md:mb-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                    <Sparkles className="text-violet-600" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">The Vibe</h3>
                    <p className="text-label text-slate-500 mt-1">Preferences & Interests</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
                {/* Left Column: Pace & Mobility */}
                <div className="md:col-span-6 space-y-4 md:space-y-8">
                    {/* Pace */}
                    <SmartFieldWrapper
                        label="Trip Pace"
                        showDefaultCheckbox={true}
                        isDefault={savePaceAsDefault}
                        onDefaultChange={handlePaceDefaultToggle}
                    >
                        <div className="grid grid-cols-3 gap-3">
                            {paceOptions.map(opt => (
                                <motion.button
                                    key={opt.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handlePaceChange(opt.value)}
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
                    </SmartFieldWrapper>

                    {/* Mobility */}
                    <SmartFieldWrapper
                        label="Mobility Level"
                        showDefaultCheckbox={true}
                        isDefault={saveMobilityAsDefault}
                        onDefaultChange={handleMobilityDefaultToggle}
                    >
                        <div className="grid grid-cols-3 gap-3">
                            {mobilityOptions.map(opt => (
                                <motion.button
                                    key={opt.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleMobilityChange(opt.value)}
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
                    </SmartFieldWrapper>
                </div>

                {/* Right Column: Interests & Food (Width 6) */}
                <div className={`md:col-span-6 bg-slate-50 rounded-2xl p-4 md:p-6 border ${errors.interests ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-100'} h-fit`}>
                    {/* Interests with Save as Default */}
                    <SmartFieldWrapper
                        label="Interests"
                        showDefaultCheckbox={true}
                        isDefault={saveInterestsAsDefault}
                        onDefaultChange={handleInterestsDefaultToggle}
                        error={errors.interests}
                        errorMessage="Please select at least one interest"
                    >
                        <div className="space-y-4">
                            {/* Interest chips */}
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
                                                : errors.interests
                                                    ? 'bg-white border border-red-200 text-slate-600 hover:border-red-300'
                                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                            }
                                        `}
                                    >
                                        {interest}
                                    </motion.button>
                                ))}
                                {/* Show custom interests that aren't in the default list */}
                                {(trip.interests || [])
                                    .filter(i => !INTEREST_OPTIONS.includes(i))
                                    .map(interest => (
                                        <motion.button
                                            key={interest}
                                            layout
                                            onClick={() => handleInterestToggle(interest)}
                                            className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white shadow-md shadow-violet-200"
                                        >
                                            {interest}
                                        </motion.button>
                                    ))
                                }
                            </div>

                            {/* Custom interest input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customInterest}
                                    onChange={(e) => setCustomInterest(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomInterest()}
                                    placeholder="Add custom interest..."
                                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                />
                                <button
                                    onClick={handleAddCustomInterest}
                                    disabled={!customInterest.trim()}
                                    className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>
                        </div>
                    </SmartFieldWrapper>

                    <div className="mt-6">
                        <SmartFieldWrapper
                            label="Food Preference"
                            showDefaultCheckbox={true}
                            isDefault={saveFoodAsDefault}
                            onDefaultChange={handleFoodDefaultToggle}
                        >
                            <div className="flex gap-3">
                                {foodOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleFoodChange(opt.value)}
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
                        </SmartFieldWrapper>
                    </div>
                </div>
            </div>
        </motion.section>
    )
}
