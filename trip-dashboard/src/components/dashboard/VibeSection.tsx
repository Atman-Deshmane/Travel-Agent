import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Sparkles, Footprints, Mountain, Accessibility } from 'lucide-react'
import { cn } from '../../lib/utils'
import { INTEREST_OPTIONS } from '../../data/mock_users'

interface VibeSectionProps {
    trip: TripContext
}

export function VibeSection({ trip }: VibeSectionProps) {
    const { updateTrip, updateProfile, getCurrentUser } = useUserStore()
    const currentUser = getCurrentUser()

    const paceOptions: { value: TripContext['pace']; label: string; description: string }[] = [
        { value: 'chill', label: 'Chill', description: '2-3 activities/day' },
        { value: 'balanced', label: 'Balanced', description: '4-5 activities/day' },
        { value: 'packed', label: 'Packed', description: '6+ activities/day' },
    ]

    const mobilityOptions: { value: TripContext['mobility']; icon: React.ReactNode; label: string; description: string }[] = [
        { value: 'high', icon: <Mountain size={20} />, label: 'Trekker', description: 'Long hikes, steep trails' },
        { value: 'medium', icon: <Footprints size={20} />, label: 'Moderate', description: 'Short walks ok' },
        { value: 'low', icon: <Accessibility size={20} />, label: 'Easy Access', description: 'Vehicle-friendly spots' },
    ]

    const foodOptions: TripContext['food_preference'][] = ['veg', 'non_veg', 'flexible']

    const handleInterestToggle = (interest: string) => {
        const current = trip.interests
        const updated = current.includes(interest)
            ? current.filter(i => i !== interest)
            : [...current, interest]

        updateTrip(trip.id, { interests: updated })
        // Auto-save interests to profile
        if (currentUser) {
            updateProfile(currentUser.id, { interests: updated })
        }
    }

    const handlePaceChange = (pace: TripContext['pace'], saveToProfile: boolean) => {
        updateTrip(trip.id, { pace })
        if (saveToProfile && currentUser) {
            updateProfile(currentUser.id, { pace })
        }
    }

    const handleMobilityChange = (mobility: TripContext['mobility'], saveToProfile: boolean) => {
        updateTrip(trip.id, { mobility })
        if (saveToProfile && currentUser) {
            updateProfile(currentUser.id, { mobility })
        }
    }

    return (
        <section className="bg-surface rounded-xl p-6 border border-border">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-6">
                <Sparkles className="text-accent" size={20} />
                The Vibe
            </h3>

            {/* Pace */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-text-secondary">Trip Pace</label>
                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-3 h-3 accent-accent"
                            onChange={(e) => {
                                if (e.target.checked && currentUser) {
                                    updateProfile(currentUser.id, { pace: trip.pace })
                                }
                            }}
                        />
                        Save as default
                    </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {paceOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => handlePaceChange(opt.value, false)}
                            className={cn(
                                "p-4 rounded-lg border-2 text-center transition-all",
                                trip.pace === opt.value
                                    ? "border-accent bg-accent/10"
                                    : "border-border bg-background hover:border-text-secondary"
                            )}
                        >
                            <p className={cn(
                                "font-medium",
                                trip.pace === opt.value ? "text-accent" : "text-text-primary"
                            )}>
                                {opt.label}
                            </p>
                            <p className="text-xs text-text-secondary mt-1">{opt.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobility */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-text-secondary">Mobility Level</label>
                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-3 h-3 accent-accent"
                            onChange={(e) => {
                                if (e.target.checked && currentUser) {
                                    updateProfile(currentUser.id, { mobility: trip.mobility })
                                }
                            }}
                        />
                        Save as default
                    </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {mobilityOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => handleMobilityChange(opt.value, false)}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                trip.mobility === opt.value
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border bg-background text-text-secondary hover:border-text-secondary"
                            )}
                        >
                            {opt.icon}
                            <p className="font-medium text-sm">{opt.label}</p>
                            <p className="text-xs opacity-70">{opt.description}</p>
                        </button>
                    ))}
                </div>
                {trip.family_composition.has_elders && (
                    <p className="text-xs text-warning mt-2">
                        ⚠️ Mobility auto-set to Easy Access because elders are included
                    </p>
                )}
            </div>

            {/* Interests */}
            <div className="mb-6">
                <label className="block text-sm text-text-secondary mb-3">
                    Interests
                    <span className="text-xs text-accent ml-2">(auto-saved to profile)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map(interest => (
                        <button
                            key={interest}
                            onClick={() => handleInterestToggle(interest)}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                trip.interests.includes(interest)
                                    ? "bg-accent text-white"
                                    : "bg-background border border-border text-text-secondary hover:border-accent"
                            )}
                        >
                            {interest}
                        </button>
                    ))}
                </div>
            </div>

            {/* Food Preference */}
            <div>
                <label className="block text-sm text-text-secondary mb-3">Food Preference</label>
                <div className="flex gap-2">
                    {foodOptions.map(opt => (
                        <button
                            key={opt}
                            onClick={() => updateTrip(trip.id, { food_preference: opt })}
                            className={cn(
                                "px-5 py-2.5 rounded-full text-sm font-medium capitalize transition-all",
                                trip.food_preference === opt
                                    ? "bg-accent text-white"
                                    : "bg-background border border-border text-text-secondary hover:border-accent"
                            )}
                        >
                            {opt === 'non_veg' ? 'Non-Veg' : opt}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    )
}
