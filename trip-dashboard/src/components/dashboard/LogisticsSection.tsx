import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { Calendar, Users, User, Heart, Users2, Sun, Sunset } from 'lucide-react'

interface LogisticsSectionProps {
    trip: TripContext
    errors?: {
        group?: boolean
        times?: boolean
    }
}

export function LogisticsSection({ trip, errors = {} }: LogisticsSectionProps) {
    const updateTrip = useUserStore(state => state.updateTrip)

    const dates = trip.dates || { from: null, to: null }
    const today = new Date().toISOString().split('T')[0]

    const handleDateChange = (field: 'from' | 'to', value: string) => {
        const newDates = { ...dates }
        newDates[field] = value ? new Date(value) : null
        // If arrival date moved past departure, auto-clear departure
        if (field === 'from' && newDates.to && newDates.from && new Date(newDates.from) > new Date(newDates.to)) {
            newDates.to = null
        }
        updateTrip(trip.id, { dates: newDates })
    }

    const handleGroupChange = (groupType: NonNullable<TripContext['group_type']>) => {
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

    const groupOptions: { type: NonNullable<TripContext['group_type']>; icon: React.ReactNode; label: string }[] = [
        { type: 'solo', icon: <User size={20} />, label: 'Solo' },
        { type: 'couple', icon: <Heart size={20} />, label: 'Couple' },
        { type: 'family', icon: <Users size={20} />, label: 'Family' },
        { type: 'friends', icon: <Users2 size={20} />, label: 'Friends' },
    ]

    const timeOptions: { value: NonNullable<TripContext['arrival_time']>; label: string; time: string; icon: React.ReactNode }[] = [
        { value: 'morning', label: 'Morning', time: '6am - 12pm', icon: <Sun size={16} /> },
        { value: 'noon', label: 'Noon', time: '12pm - 4pm', icon: <Sun size={16} className="text-amber-500" /> },
        { value: 'evening', label: 'Evening', time: '4pm - 9pm', icon: <Sunset size={16} /> },
    ]

    return (
        <motion.section
            id="logistics-section"
            className="card-premium p-4 md:p-8"
            whileHover={{ y: -2 }}
        >
            <div className="flex items-start justify-between mb-4 md:mb-8">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                        <Calendar className="text-indigo-600" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900">The When & Who</h3>
                        <p className="text-label text-slate-500 mt-0.5 md:mt-1">Dates & Travel Group</p>
                    </div>
                </div>
                <div className="hidden md:block px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <span className="text-xs font-medium text-slate-500">Step 1 of 3</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
                {/* Left Col: Dates */}
                <div className="md:col-span-7 space-y-4 md:space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div>
                            <label className="block text-label mb-2 text-slate-500">Arrival Date</label>
                            <div className="relative group">
                                <input
                                    type="date"
                                    value={formatDateForInput(dates.from)}
                                    min={today}
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
                                    min={formatDateForInput(dates.from) || today}
                                    onChange={(e) => handleDateChange('to', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer relative z-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time Selection - Button Groups (Single Click) */}
                    <div className={`grid grid-cols-2 gap-3 md:gap-4 ${errors.times ? 'ring-2 ring-red-200 rounded-2xl p-2 -m-2' : ''}`}>
                        <div>
                            <label className={`block text-label mb-2 ${errors.times ? 'text-red-500' : 'text-slate-500'}`}>
                                Arrival Time {errors.times && <span className="text-red-400">*</span>}
                            </label>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                {timeOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateTrip(trip.id, { arrival_time: opt.value })}
                                        className={`
                                            flex-1 flex flex-col items-center gap-0.5 md:gap-1 py-2 md:py-2.5 px-1 md:px-2 rounded-lg text-[10px] md:text-xs font-semibold transition-all
                                            ${trip.arrival_time === opt.value
                                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                            }
                                        `}
                                    >
                                        {opt.icon}
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={`block text-label mb-2 ${errors.times ? 'text-red-500' : 'text-slate-500'}`}>
                                Departure Time {errors.times && <span className="text-red-400">*</span>}
                            </label>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                {timeOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateTrip(trip.id, { departure_time: opt.value })}
                                        className={`
                                            flex-1 flex flex-col items-center gap-0.5 md:gap-1 py-2 md:py-2.5 px-1 md:px-2 rounded-lg text-[10px] md:text-xs font-semibold transition-all
                                            ${trip.departure_time === opt.value
                                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                            }
                                        `}
                                    >
                                        {opt.icon}
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {errors.times && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-red-500 font-medium -mt-4"
                        >
                            Please select both arrival and departure times
                        </motion.p>
                    )}
                </div>

                {/* Right Col: Group (Width 5) */}
                <div className={`md:col-span-5 bg-slate-50 rounded-2xl p-4 md:p-6 border ${errors.group ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-100'}`}>
                    <label className={`block text-label mb-4 ${errors.group ? 'text-red-500' : 'text-slate-500'}`}>
                        Who is traveling? {errors.group && <span className="text-red-400">*</span>}
                    </label>
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
                                        : trip.group_type === null && errors.group
                                            ? 'border-red-200 bg-white text-slate-400 hover:border-red-300'
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
                    {errors.group && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-red-500 font-medium mb-4"
                        >
                            Please select a travel group
                        </motion.p>
                    )}

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
