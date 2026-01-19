import { useUserStore } from '../../store/useUserStore'
import type { TripContext } from '../../store/useUserStore'
import { MapPin, Car, Bus, Train, Plane, Hotel, Map } from 'lucide-react'
import { cn } from '../../lib/utils'
import { CLUSTER_OPTIONS } from '../../data/mock_users'

interface JourneyStaySectionProps {
    trip: TripContext
}

export function JourneyStaySection({ trip }: JourneyStaySectionProps) {
    const { updateTrip, updateProfile, getCurrentUser } = useUserStore()
    const currentUser = getCurrentUser()

    const modeToKodaiOptions = [
        { value: 'own_vehicle', icon: <Car size={18} />, label: 'Own Vehicle' },
        { value: 'bus', icon: <Bus size={18} />, label: 'Bus' },
        { value: 'train', icon: <Train size={18} />, label: 'Train' },
        { value: 'flight', icon: <Plane size={18} />, label: 'Flight' },
    ]

    const transportInCityOptions = [
        { value: 'own_vehicle', label: 'Own Vehicle' },
        { value: 'taxi', label: 'Taxi/Cab' },
        { value: 'public', label: 'Public Transport' },
        { value: 'flexible', label: 'Flexible' },
    ]

    const handleSaveOriginToProfile = () => {
        if (currentUser && trip.origin_city) {
            updateProfile(currentUser.id, { origin_city: trip.origin_city })
        }
    }

    return (
        <section className="bg-surface rounded-xl p-6 border border-border">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-6">
                <MapPin className="text-accent" size={20} />
                Journey & Stay
            </h3>

            {/* Origin City */}
            <div className="mb-6">
                <label className="block text-sm text-text-secondary mb-2">Origin City</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={trip.origin_city}
                        onChange={(e) => updateTrip(trip.id, { origin_city: e.target.value })}
                        placeholder="e.g., Chennai, Bangalore"
                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                    />
                    <button
                        onClick={handleSaveOriginToProfile}
                        className="px-4 py-2 text-sm border border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors"
                    >
                        Save as Default
                    </button>
                </div>
            </div>

            {/* Mode to Kodai */}
            <div className="mb-6">
                <label className="block text-sm text-text-secondary mb-3">How are you reaching Kodaikanal?</label>
                <div className="grid grid-cols-4 gap-3">
                    {modeToKodaiOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => updateTrip(trip.id, { mode_to_kodai: opt.value as TripContext['mode_to_kodai'] })}
                            className={cn(
                                "flex flex-col items-center gap-2 py-3 rounded-lg border-2 transition-all",
                                trip.mode_to_kodai === opt.value
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border bg-background text-text-secondary hover:border-text-secondary"
                            )}
                        >
                            {opt.icon}
                            <span className="text-xs font-medium">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Transport in City - Hidden if own_vehicle */}
            {trip.mode_to_kodai !== 'own_vehicle' && (
                <div className="mb-6">
                    <label className="block text-sm text-text-secondary mb-3">Transport within Kodaikanal</label>
                    <div className="flex flex-wrap gap-2">
                        {transportInCityOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => updateTrip(trip.id, { transport_in_city: opt.value as TripContext['transport_in_city'] })}
                                className={cn(
                                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                    trip.transport_in_city === opt.value
                                        ? "bg-accent text-white"
                                        : "bg-background border border-border text-text-secondary hover:border-accent"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Accommodation */}
            <div>
                <label className="block text-sm text-text-secondary mb-3">Accommodation</label>

                {/* Segmented Control */}
                <div className="inline-flex bg-background rounded-lg p-1 mb-4">
                    <button
                        onClick={() => updateTrip(trip.id, { accommodation: { ...trip.accommodation, status: 'booked' } })}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all",
                            trip.accommodation.status === 'booked'
                                ? "bg-accent text-white"
                                : "text-text-secondary hover:text-text-primary"
                        )}
                    >
                        <Hotel size={14} className="inline mr-2" />
                        Booked
                    </button>
                    <button
                        onClick={() => updateTrip(trip.id, { accommodation: { ...trip.accommodation, status: 'undecided' } })}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all",
                            trip.accommodation.status === 'undecided'
                                ? "bg-accent text-white"
                                : "text-text-secondary hover:text-text-primary"
                        )}
                    >
                        <Map size={14} className="inline mr-2" />
                        Undecided
                    </button>
                </div>

                {/* Booked: Hotel Input */}
                {trip.accommodation.status === 'booked' && (
                    <div>
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
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                        />
                        <p className="text-xs text-text-secondary mt-2">
                            💡 Tip: Enter your hotel name so we can optimize your itinerary
                        </p>
                    </div>
                )}

                {/* Undecided: Cluster Selection */}
                {trip.accommodation.status === 'undecided' && (
                    <div className="grid grid-cols-2 gap-3">
                        {CLUSTER_OPTIONS.map(cluster => (
                            <button
                                key={cluster.id}
                                onClick={() => updateTrip(trip.id, {
                                    accommodation: { ...trip.accommodation, undecided_cluster: cluster.name }
                                })}
                                className={cn(
                                    "relative p-4 rounded-lg border-2 text-left transition-all",
                                    trip.accommodation.undecided_cluster === cluster.name
                                        ? "border-accent bg-accent/10"
                                        : "border-border bg-background hover:border-text-secondary"
                                )}
                            >
                                {cluster.featured && (
                                    <span className="absolute top-2 right-2 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                                        Creator's Pick
                                    </span>
                                )}
                                <p className={cn(
                                    "font-medium",
                                    trip.accommodation.undecided_cluster === cluster.name ? "text-accent" : "text-text-primary"
                                )}>
                                    {cluster.name}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">{cluster.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
