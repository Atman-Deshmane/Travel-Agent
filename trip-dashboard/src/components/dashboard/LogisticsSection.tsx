import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Calendar, Clock, Users, User, Heart, Users2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface LogisticsSectionProps {
    trip: TripContext
}

export function LogisticsSection({ trip }: LogisticsSectionProps) {
    const updateTrip = useUserStore(state => state.updateTrip)

    const handleDateChange = (field: 'from' | 'to', value: string) => {
        const newDates = { ...trip.dates }
        newDates[field] = value ? new Date(value) : null
        updateTrip(trip.id, { dates: newDates })
    }

    const handleGroupChange = (groupType: TripContext['group_type']) => {
        updateTrip(trip.id, {
            group_type: groupType,
            // Reset family composition if not family
            family_composition: groupType === 'family' ? trip.family_composition : { has_kids: false, has_elders: false }
        })
    }

    const handleFamilyCompositionChange = (field: 'has_kids' | 'has_elders', value: boolean) => {
        updateTrip(trip.id, {
            family_composition: { ...trip.family_composition, [field]: value }
        })
    }

    const formatDateForInput = (date: Date | null) => {
        if (!date) return ''
        return date.toISOString().split('T')[0]
    }

    const groupOptions: { type: TripContext['group_type']; icon: React.ReactNode; label: string }[] = [
        { type: 'solo', icon: <User size={20} />, label: 'Solo' },
        { type: 'couple', icon: <Heart size={20} />, label: 'Couple' },
        { type: 'family', icon: <Users size={20} />, label: 'Family' },
        { type: 'friends', icon: <Users2 size={20} />, label: 'Friends' },
    ]

    const timeOptions = [
        { value: 'morning', label: 'Morning (6am-12pm)' },
        { value: 'noon', label: 'Noon (12pm-4pm)' },
        { value: 'evening', label: 'Evening (4pm-9pm)' },
    ]

    return (
        <section className="bg-surface rounded-xl p-6 border border-border">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-6">
                <Calendar className="text-accent" size={20} />
                The When & Who
            </h3>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm text-text-secondary mb-2">Arrival Date</label>
                    <input
                        type="date"
                        value={formatDateForInput(trip.dates.from)}
                        onChange={(e) => handleDateChange('from', e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                    />
                </div>
                <div>
                    <label className="block text-sm text-text-secondary mb-2">Departure Date</label>
                    <input
                        type="date"
                        value={formatDateForInput(trip.dates.to)}
                        onChange={(e) => handleDateChange('to', e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                    />
                </div>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                        <Clock size={14} />
                        Arrival Time
                    </label>
                    <select
                        value={trip.arrival_time}
                        onChange={(e) => updateTrip(trip.id, { arrival_time: e.target.value as TripContext['arrival_time'] })}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                    >
                        {timeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                        <Clock size={14} />
                        Departure Time
                    </label>
                    <select
                        value={trip.departure_time}
                        onChange={(e) => updateTrip(trip.id, { departure_time: e.target.value as TripContext['departure_time'] })}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                    >
                        {timeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Group Type */}
            <div className="mb-4">
                <label className="block text-sm text-text-secondary mb-3">Travel Group</label>
                <div className="grid grid-cols-4 gap-3">
                    {groupOptions.map(opt => (
                        <button
                            key={opt.type}
                            onClick={() => handleGroupChange(opt.type)}
                            className={cn(
                                "flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-all",
                                trip.group_type === opt.type
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border bg-background text-text-secondary hover:border-text-secondary"
                            )}
                        >
                            {opt.icon}
                            <span className="text-sm font-medium">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Family Composition (Conditional) */}
            {trip.group_type === 'family' && (
                <div className="mt-4 p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm text-text-secondary mb-3">Family includes:</p>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={trip.family_composition.has_kids}
                                onChange={(e) => handleFamilyCompositionChange('has_kids', e.target.checked)}
                                className="w-4 h-4 accent-accent"
                            />
                            <span className="text-text-primary">Children</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={trip.family_composition.has_elders}
                                onChange={(e) => handleFamilyCompositionChange('has_elders', e.target.checked)}
                                className="w-4 h-4 accent-accent"
                            />
                            <span className="text-text-primary">Elders</span>
                            {trip.family_composition.has_elders && (
                                <span className="text-xs text-warning ml-1">(Mobility set to low)</span>
                            )}
                        </label>
                    </div>
                </div>
            )}
        </section>
    )
}
