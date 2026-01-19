import { motion } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { MapPin, Car, Bus, Train, Plane, Hotel, Map, Sparkles } from 'lucide-react'
import { CLUSTER_OPTIONS } from '../../data/mock_users'

interface JourneyStaySectionProps {
    trip: TripContext
}

export function JourneyStaySection({ trip }: JourneyStaySectionProps) {
    const { updateTrip, updateProfile, getCurrentUser } = useUserStore()
    const currentUser = getCurrentUser()

    const modeToKodaiOptions = [
        { value: 'own_vehicle', icon: <Car size={20} />, label: 'Own Vehicle' },
        { value: 'bus', icon: <Bus size={20} />, label: 'Bus' },
        { value: 'train', icon: <Train size={20} />, label: 'Train' },
        { value: 'flight', icon: <Plane size={20} />, label: 'Flight' },
    ]

    const transportInCityOptions = [
        { value: 'own_vehicle', label: 'Own Vehicle' },
        { value: 'taxi', label: 'Taxi/Cab' },
        { value: 'public', label: 'Public' },
        { value: 'flexible', label: 'Flexible' },
    ]

    const handleSaveOriginToProfile = () => {
        if (currentUser && trip.origin_city) {
            updateProfile(currentUser.id, { origin_city: trip.origin_city })
        }
    }

    return (
        <motion.section
            className="card p-6"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400 }}
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <MapPin className="text-emerald-600" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Journey & Stay</h3>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Travel & Accommodation</p>
                </div>
            </div>

            {/* Origin City */}
            <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Origin City
                </label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={trip.origin_city}
                        onChange={(e) => updateTrip(trip.id, { origin_city: e.target.value })}
                        placeholder="e.g., Chennai, Bangalore"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveOriginToProfile}
                        className="px-5 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-all"
                    >
                        Save as Default
                    </motion.button>
                </div>
            </div>

            {/* Mode to Kodai */}
            <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
                    How are you reaching Kodaikanal?
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {modeToKodaiOptions.map(opt => (
                        <motion.button
                            key={opt.value}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateTrip(trip.id, { mode_to_kodai: opt.value as TripContext['mode_to_kodai'] })}
                            className={`
                flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200
                ${trip.mode_to_kodai === opt.value
                                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 shadow-lg shadow-emerald-500/10'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                }
              `}
                        >
                            {opt.icon}
                            <span className="text-xs font-medium">{opt.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Transport in City - Hidden if own_vehicle */}
            {trip.mode_to_kodai !== 'own_vehicle' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6"
                >
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
                        Transport within Kodaikanal
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {transportInCityOptions.map(opt => (
                            <motion.button
                                key={opt.value}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => updateTrip(trip.id, { transport_in_city: opt.value as TripContext['transport_in_city'] })}
                                className={`
                  px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                  ${trip.transport_in_city === opt.value
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }
                `}
                            >
                                {opt.label}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Accommodation */}
            <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
                    Accommodation
                </label>

                {/* Segmented Control */}
                <div className="inline-flex bg-slate-100 rounded-xl p-1 mb-5">
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => updateTrip(trip.id, { accommodation: { ...trip.accommodation, status: 'booked' } })}
                        className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
              ${trip.accommodation.status === 'booked'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }
            `}
                    >
                        <Hotel size={16} />
                        Booked
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => updateTrip(trip.id, { accommodation: { ...trip.accommodation, status: 'undecided' } })}
                        className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
              ${trip.accommodation.status === 'undecided'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }
            `}
                    >
                        <Map size={16} />
                        Undecided
                    </motion.button>
                </div>

                {/* Booked: Hotel Input */}
                {trip.accommodation.status === 'booked' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <input
                            type="text"
                            value={trip.accommodation.booked_location?.name || ''}
                            onChange={(e) => updateTrip(trip.id, {
                                accommodation: {
                                    ...trip.accommodation,
                                    booked_location: { name: e.target.value, lat: 0, lng: 0 }
                                }
                            })}
                            placeholder="Enter hotel/resort name..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <p className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                            <Sparkles size={14} className="text-amber-500" />
                            We'll optimize your itinerary based on your hotel location
                        </p>
                    </motion.div>
                )}

                {/* Undecided: Cluster Selection */}
                {trip.accommodation.status === 'undecided' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 gap-4"
                    >
                        {CLUSTER_OPTIONS.map(cluster => (
                            <motion.button
                                key={cluster.id}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => updateTrip(trip.id, {
                                    accommodation: { ...trip.accommodation, undecided_cluster: cluster.name }
                                })}
                                className={`
                  relative p-5 rounded-xl border-2 text-left transition-all duration-200
                  ${trip.accommodation.undecided_cluster === cluster.name
                                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-500/10'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                    }
                `}
                            >
                                {cluster.featured && (
                                    <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                                        <Sparkles size={10} />
                                        Creator's Pick
                                    </span>
                                )}
                                <p className={`font-semibold ${trip.accommodation.undecided_cluster === cluster.name ? 'text-emerald-700' : 'text-slate-900'}`}>
                                    {cluster.name}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">{cluster.description}</p>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.section>
    )
}
