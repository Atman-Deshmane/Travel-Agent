import { motion } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import { LogisticsSection } from './LogisticsSection'
import { JourneyStaySection } from './JourneyStaySection'
import { VibeSection } from './VibeSection'
import { MapPin, Sparkles, ArrowRight } from 'lucide-react'

export function TripConfigurator() {
    const { getActiveTrip, getCurrentUser } = useUserStore()
    const activeTrip = getActiveTrip()
    const currentUser = getCurrentUser()

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>Please select a user to continue</p>
            </div>
        )
    }

    if (!activeTrip) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full"
            >
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
                    <MapPin size={32} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Trip Selected</h2>
                <p className="text-slate-500 mb-6">Create a new trip or select one from the sidebar</p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25"
                >
                    Create Trip
                    <ArrowRight size={18} />
                </motion.button>
            </motion.div>
        )
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 25 }
        }
    }

    return (
        <motion.div
            key={activeTrip.id}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto p-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full">
                        <Sparkles size={14} className="text-indigo-600" />
                        <span className="text-xs font-semibold text-indigo-600">Planning for {currentUser.name}</span>
                    </div>
                </div>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{activeTrip.name}</h1>
                <p className="text-slate-500 mt-2 text-lg">
                    Configure your perfect Kodaikanal adventure
                </p>
            </motion.div>

            {/* Sections */}
            <div className="space-y-8">
                <motion.div variants={itemVariants}>
                    <LogisticsSection trip={activeTrip} />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <JourneyStaySection trip={activeTrip} />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <VibeSection trip={activeTrip} />
                </motion.div>
            </div>

            {/* Summary Footer */}
            <motion.div
                variants={itemVariants}
                className="mt-10 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Trip Summary</h4>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/25"
                    >
                        Generate Itinerary
                    </motion.button>
                </div>
                <div className="grid grid-cols-4 gap-6">
                    {[
                        { label: 'Group', value: activeTrip.group_type },
                        { label: 'Pace', value: activeTrip.pace },
                        { label: 'Mobility', value: activeTrip.mobility },
                        {
                            label: 'Stay', value: activeTrip.accommodation.status === 'booked'
                                ? (activeTrip.accommodation.booked_location?.name || 'Hotel TBD')
                                : activeTrip.accommodation.undecided_cluster
                        },
                    ].map((item, i) => (
                        <div key={i}>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{item.label}</p>
                            <p className="text-white font-medium capitalize">{item.value}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}
