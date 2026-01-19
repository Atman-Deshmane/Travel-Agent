import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Calendar, Users, User, Heart, Users2, ChevronDown } from 'lucide-react'

interface LogisticsSectionProps {
    trip: TripContext
}

export function LogisticsSection({ trip }: LogisticsSectionProps) {
    const updateTrip = useUserStore(state => state.updateTrip)

    const dates = trip.dates || { from: null, to: null }

    const handleDateChange = (field: 'from' | 'to', value: string) => {
        const newDates = { ...dates }
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

    const formatDateForInput = (date: Date | string | null) => {
        if (!date) return ''
        const d = new Date(date)
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
    }

    const groupOptions: { type: TripContext['group_type']; icon: React.ReactNode; label: string }[] = [
        { type: 'solo', icon: <User size={20} />, label: 'Solo' },
        { type: 'couple', icon: <Heart size={20} />, label: 'Couple' },
        { type: 'family', icon: <Users size={20} />, label: 'Family' },
        { type: 'friends', icon: <Users2 size={20} />, label: 'Friends' },
    ]

    const timeOptions = [
        { value: 'morning', label: 'Morning', time: '6am - 12pm' },
        { value: 'noon', label: 'Noon', time: '12pm - 4pm' },
        { value: 'evening', label: 'Evening', time: '4pm - 9pm' },
    ]

    return (
        <motion.section
            className="card-premium p-8"
            whileHover={{ y: -2 }}
        >
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                        <Calendar className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">The When & Who</h3>
                        <p className="text-label text-slate-500 mt-1">Dates & Travel Group</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <span className="text-xs font-medium text-slate-500">Step 1 of 3</span>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Left Col: Dates (Width 7) */}
                <div className="col-span-7 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-label mb-2 text-slate-500">Arrival Date</label>
                            <div className="relative group">
                                <input
                                    type="date"
                                    value={formatDateForInput(dates.from)}
                                    onChange={(e) => handleDateChange('from', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer relative z-10"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-label mb-2 text-slate-500">Departure Date</label>
                            <div className="relative group">
                                <input
                                    type="date"
                                    value={formatDateForInput(dates.to)}
                                    onChange={(e) => handleDateChange('to', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer relative z-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-label mb-2 text-slate-500">Arrival Time</label>
                            <div className="relative">
                                <select
                                    value={trip.arrival_time}
                                    onChange={(e) => updateTrip(trip.id, { arrival_time: e.target.value as TripContext['arrival_time'] })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                                >
                                    {timeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.time})</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-label mb-2 text-slate-500">Departure Time</label>
                            <div className="relative">
                                <select
                                    value={trip.departure_time}
                                    onChange={(e) => updateTrip(trip.id, { departure_time: e.target.value as TripContext['departure_time'] })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                                >
                                    {timeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.time})</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Group (Width 5) */}
                <div className="col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <label className="block text-label mb-4 text-slate-500">Who is traveling?</label>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {groupOptions.map(opt => (
                            <motion.button
                                key={opt.type}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleGroupChange(opt.type)}
                                className={`
                  relative flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all duration-200
                  ${trip.group_type === opt.type
                                        ? 'border-indigo-500 bg-white text-indigo-600 shadow-md shadow-indigo-100'
                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-500'
                                    }
                `}
                            >
                                {trip.group_type === opt.type && (
                                    <motion.div
                                        layoutId="group-indicator"
                                        className="absolute inset-0 border-2 border-indigo-500 rounded-xl"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                {opt.icon}
                                <span className="text-sm font-semibold">{opt.label}</span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Smart Logic: Family */}
                    <AnimatePresence>
                        {trip.group_type === 'family' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                            >
                                <p className="text-label text-slate-400 mb-3">Composition</p>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`
                      w-5 h-5 rounded border flex items-center justify-center transition-colors
                      ${trip.family_composition.has_kids ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}
                    `}>
                                            {trip.family_composition.has_kids && <Users size={12} className="text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={trip.family_composition.has_kids}
                                            onChange={(e) => handleFamilyCompositionChange('has_kids', e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-slate-700">Include Children</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`
                      w-5 h-5 rounded border flex items-center justify-center transition-colors
                      ${trip.family_composition.has_elders ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}
                    `}>
                                            {trip.family_composition.has_elders && <Users size={12} className="text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={trip.family_composition.has_elders}
                                            onChange={(e) => handleFamilyCompositionChange('has_elders', e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-slate-700">Include Elders</span>
                                    </label>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.section>
    )
}
