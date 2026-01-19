import { useUserStore } from '../../store/useUserStore'
import { LogisticsSection } from './LogisticsSection'
import { JourneyStaySection } from './JourneyStaySection'
import { VibeSection } from './VibeSection'
import { MapPin, Sparkles } from 'lucide-react'

export function TripConfigurator() {
    const { getActiveTrip, getCurrentUser } = useUserStore()
    const activeTrip = getActiveTrip()
    const currentUser = getCurrentUser()

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <p>Please select a user to continue</p>
            </div>
        )
    }

    if (!activeTrip) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <MapPin size={48} className="mb-4 opacity-30" />
                <h2 className="text-xl font-semibold text-text-primary mb-2">No Trip Selected</h2>
                <p className="text-sm">Create a new trip or select one from the sidebar</p>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-accent text-sm font-medium mb-2">
                    <Sparkles size={16} />
                    Planning for {currentUser.name}
                </div>
                <h1 className="text-3xl font-bold text-text-primary">{activeTrip.name}</h1>
                <p className="text-text-secondary mt-1">
                    Configure your perfect Kodaikanal trip below
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-6">
                <LogisticsSection trip={activeTrip} />
                <JourneyStaySection trip={activeTrip} />
                <VibeSection trip={activeTrip} />
            </div>

            {/* Summary Footer */}
            <div className="mt-8 p-4 bg-surface-elevated rounded-xl border border-border">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Trip Summary</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-text-secondary">Group</p>
                        <p className="text-text-primary capitalize">{activeTrip.group_type}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Pace</p>
                        <p className="text-text-primary capitalize">{activeTrip.pace}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Mobility</p>
                        <p className="text-text-primary capitalize">{activeTrip.mobility}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Stay</p>
                        <p className="text-text-primary capitalize">
                            {activeTrip.accommodation.status === 'booked'
                                ? (activeTrip.accommodation.booked_location?.name || 'Hotel TBD')
                                : activeTrip.accommodation.undecided_cluster
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
