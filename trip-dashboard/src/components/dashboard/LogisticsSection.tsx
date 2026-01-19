import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Calendar, Clock, Users, User, Heart, Users2, ChevronDown } from 'lucide-react'

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
        { type: 'solo', icon: <User size={22} />, label: 'Solo' },
        { type: 'couple', icon: <Heart size={22} />, label: 'Couple' },
        { type: 'family', icon: <Users size={22} />, label: 'Family' },
        { type: 'friends', icon: <Users2 size={22} />, label: 'Friends' },
    ]

    const timeOptions = [
        { value: 'morning', label: 'Morning', time: '6am - 12pm' },
        { value: 'noon', label: 'Noon', time: '12pm - 4pm' },
        { value: 'evening', label: 'Evening', time: '4pm - 9pm' },
    ]

    return (
        <motion.section
            className="card p-6"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400 }}
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Calendar className="text-indigo-600" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">The When & Who</h3>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Dates & Travel Group</p>
                </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                        Arrival Date
                    </label>
                    <input
                        type="date"
                        value={formatDateForInput(trip.dates.from)}
                        onChange={(e) => handleDateChange('from', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                        Departure Date
                    </label>
                    <input
                        type="date"
                        value={formatDateForInput(trip.dates.to)}
                        onChange={(e) => handleDateChange('to', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                        <Clock size={12} />
                        Arrival Time
                    </label>
                    <div className="relative">
                        <select
                            value={trip.arrival_time}
                            onChange={(e) => updateTrip(trip.id, { arrival_time: e.target.value as TripContext['arrival_time'] })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                            {timeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label} ({opt.time})</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                        <Clock size={12} />
                        Departure Time
                    </label>
                    <div className="relative">
                        <select
                            value={trip.departure_time}
                            onChange={(e) => updateTrip(trip.id, { departure_time: e.target.value as TripContext['departure_time'] })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                            {timeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label} ({opt.time})</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Group Type */}
            <div className="mb-4">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
                    Travel Group
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {groupOptions.map(opt => (
                        <motion.button
                            key={opt.type}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleGroupChange(opt.type)}
                            className={`
                relative flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all duration-200
                ${trip.group_type === opt.type
                                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 shadow-lg shadow-indigo-500/10'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-600'
                                }
              `}
                        >
                            {trip.group_type === opt.type && (
                                <motion.div
                                    layoutId="group-active"
                                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/5 to-violet-500/5"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{opt.icon}</span>
                            <span className="relative z-10 text-sm font-medium">{opt.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Family Composition */}
            {trip.group_type === 'family' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200"
                >
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 mb-4">Family Includes</p>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                ${trip.family_composition.has_kids
                                    ? 'bg-amber-500 border-amber-500'
                                    : 'border-amber-300 group-hover:border-amber-400'
                                }
              `}>
                                {trip.family_composition.has_kids && (
                                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </motion.svg>
                                )}
                            </div>
                            <input
                                type="checkbox"
                                checked={trip.family_composition.has_kids}
                                onChange={(e) => handleFamilyCompositionChange('has_kids', e.target.checked)}
                                className="hidden"
                            />
                            <span className="text-sm font-medium text-amber-900">Children</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                ${trip.family_composition.has_elders
                                    ? 'bg-amber-500 border-amber-500'
                                    : 'border-amber-300 group-hover:border-amber-400'
                                }
              `}>
                                {trip.family_composition.has_elders && (
                                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </motion.svg>
                                )}
                            </div>
                            <input
                                type="checkbox"
                                checked={trip.family_composition.has_elders}
                                onChange={(e) => handleFamilyCompositionChange('has_elders', e.target.checked)}
                                className="hidden"
                            />
                            <span className="text-sm font-medium text-amber-900">Elders</span>
                            {trip.family_composition.has_elders && (
                                <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                    Mobility → Low
                                </span>
                            )}
                        </label>
                    </div>
                </motion.div>
            )}
        </motion.section>
    )
}
