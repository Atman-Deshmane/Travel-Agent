import { useUserStore } from '../../store/useUserStore'
import { Plus, Trash2, MapPin } from 'lucide-react'
import { cn } from '../../lib/utils'

export function TripList() {
    const { getUserTrips, activeTripId, setActiveTrip, createTrip, deleteTrip } = useUserStore()
    const trips = getUserTrips()

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-text-primary">My Trips</h2>
                <button
                    onClick={createTrip}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                    <Plus size={14} />
                    New Trip
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {trips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-text-secondary text-sm">
                        <MapPin size={24} className="mb-2 opacity-50" />
                        <p>No trips yet</p>
                        <button
                            onClick={createTrip}
                            className="mt-2 text-accent hover:underline"
                        >
                            Create your first trip
                        </button>
                    </div>
                ) : (
                    <ul className="py-2">
                        {trips.map(trip => (
                            <li
                                key={trip.id}
                                onClick={() => setActiveTrip(trip.id)}
                                className={cn(
                                    "group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors",
                                    activeTripId === trip.id
                                        ? "bg-accent/10 border-l-2 border-accent"
                                        : "hover:bg-surface-elevated border-l-2 border-transparent"
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-sm font-medium",
                                        activeTripId === trip.id ? "text-accent" : "text-text-primary"
                                    )}>
                                        {trip.name}
                                    </span>
                                    <span className="text-xs text-text-secondary capitalize">
                                        {trip.group_type} • {trip.accommodation.status}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteTrip(trip.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-danger transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
