import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { MapPin, Car, Bus, Train, Plane, Sparkles, Building2 } from 'lucide-react'
import { CLUSTER_OPTIONS } from '../../data/mock_users'
import { SmartFieldWrapper } from '../ui/SmartFieldWrapper'

interface JourneyStaySectionProps {
    trip: TripContext
}

export function JourneyStaySection({ trip }: JourneyStaySectionProps) {
    const { updateTrip, updateProfile, getCurrentUser } = useUserStore()
    const currentUser = getCurrentUser()
    const accommodation = trip.accommodation || { status: 'undecided', undecided_cluster: 'Town Center' }

    // Track which fields should be saved as defaults
    const [saveOriginAsDefault, setSaveOriginAsDefault] = useState(
        Boolean(currentUser?.defaults.origin_city && currentUser.defaults.origin_city === trip.origin_city)
    )
    const [saveTransportAsDefault, setSaveTransportAsDefault] = useState(
        currentUser?.defaults.transport_mode_preference === trip.transport_in_city
    )

    const modeToKodaiOptions = [
        { value: 'own_vehicle', icon: <Car size={24} />, label: 'Own Vehicle' },
        { value: 'bus', icon: <Bus size={24} />, label: 'Bus' },
        { value: 'train', icon: <Train size={24} />, label: 'Train' },
        { value: 'flight', icon: <Plane size={24} />, label: 'Flight' },
    ]

    const transportInCityOptions = [
        { value: 'own_vehicle', label: 'Own Vehicle' },
        { value: 'taxi', label: 'Taxi/Cab' },
        { value: 'public', label: 'Public' },
        { value: 'flexible', label: 'Flexible' },
    ]

    // Sync origin to profile when checkbox is checked and value changes
    const handleOriginChange = (value: string) => {
        updateTrip(trip.id, { origin_city: value })
        if (saveOriginAsDefault && currentUser) {
            updateProfile(currentUser.id, { origin_city: value })
        }
    }

    const handleOriginDefaultToggle = (checked: boolean) => {
        setSaveOriginAsDefault(checked)
        if (checked && currentUser && trip.origin_city) {
            updateProfile(currentUser.id, { origin_city: trip.origin_city })
        }
    }

    const handleTransportChange = (value: TripContext['transport_in_city']) => {
        updateTrip(trip.id, { transport_in_city: value })
        if (saveTransportAsDefault && currentUser) {
            updateProfile(currentUser.id, { transport_mode_preference: value })
        }
    }

    const handleTransportDefaultToggle = (checked: boolean) => {
        setSaveTransportAsDefault(checked)
        if (checked && currentUser) {
            updateProfile(currentUser.id, { transport_mode_preference: trip.transport_in_city })
        }
    }

    return (
        <motion.section
            className="card-premium p-4 md:p-8"
            whileHover={{ y: -2 }}
        >
            <div className="flex items-center gap-4 mb-4 md:mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <MapPin className="text-emerald-600" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Journey & Stay</h3>
                    <p className="text-label text-slate-500 mt-1">Travel & Accommodation</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Journey Column */}
                <div className="space-y-6">
                    {/* Origin City with Save as Default */}
                    <SmartFieldWrapper
                        label="Origin City"
                        showDefaultCheckbox={true}
                        isDefault={saveOriginAsDefault}
                        onDefaultChange={handleOriginDefaultToggle}
                    >
                        <input
                            type="text"
                            value={trip.origin_city}
                            onChange={(e) => handleOriginChange(e.target.value)}
                            placeholder="e.g. Bangalore, Chennai..."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </SmartFieldWrapper>

                    <div>
                        <label className="block text-label mb-3 text-slate-500">Mode to Kodaikanal</label>
                        <div className="grid grid-cols-2 gap-3">
                            {modeToKodaiOptions.map(opt => (
                                <motion.button
                                    key={opt.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => updateTrip(trip.id, { mode_to_kodai: opt.value as TripContext['mode_to_kodai'] })}
                                    className={`
                                        flex flex-col items-center gap-2 py-4 rounded-xl border transition-all duration-200
                                        ${trip.mode_to_kodai === opt.value
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }
                                    `}
                                >
                                    {opt.icon}
                                    <span className="text-sm font-medium">{opt.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {trip.mode_to_kodai !== 'own_vehicle' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <SmartFieldWrapper
                                label="Local Transport"
                                showDefaultCheckbox={true}
                                isDefault={saveTransportAsDefault}
                                onDefaultChange={handleTransportDefaultToggle}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {transportInCityOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleTransportChange(opt.value as TripContext['transport_in_city'])}
                                            className={`
                                                px-4 py-2 rounded-lg text-sm font-medium transition-colors border
                                                ${trip.transport_in_city === opt.value
                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </SmartFieldWrapper>
                        </motion.div>
                    )}
                </div>

                {/* Accommodation Column */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <label className="block text-label mb-4 text-slate-500">Accommodation Status</label>

                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 mb-6 w-fit shadow-sm">
                        <button
                            onClick={() => updateTrip(trip.id, { accommodation: { ...accommodation, status: 'booked' } })}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-semibold transition-all
                                ${accommodation.status === 'booked' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}
                            `}
                        >
                            Booked
                        </button>
                        <button
                            onClick={() => updateTrip(trip.id, { accommodation: { ...accommodation, status: 'undecided' } })}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-semibold transition-all
                                ${accommodation.status === 'undecided' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}
                            `}
                        >
                            Undecided
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {accommodation.status === 'booked' ? (
                            <motion.div
                                key="booked"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <label className="block text-label mb-2 text-slate-500">Hotel Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Enter hotel name..."
                                        value={accommodation.booked_location?.name || ''}
                                        onChange={(e) => updateTrip(trip.id, { accommodation: { ...accommodation, booked_location: { name: e.target.value, lat: 0, lng: 0 } } })}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="undecided"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                <label className="block text-label mb-2 text-slate-500">Preferred Area</label>
                                {CLUSTER_OPTIONS.map(cluster => (
                                    <motion.button
                                        key={cluster.id}
                                        onClick={() => updateTrip(trip.id, { accommodation: { ...accommodation, undecided_cluster: cluster.name } })}
                                        className={`
                                            w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group
                                            ${accommodation.undecided_cluster === cluster.name
                                                ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`font-bold ${accommodation.undecided_cluster === cluster.name ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                    {cluster.name}
                                                </span>
                                                {cluster.featured && (
                                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded-md uppercase tracking-wide flex items-center gap-1">
                                                        <Sparkles size={10} /> Pick
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500">{cluster.description}</p>
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.section>
    )
}
