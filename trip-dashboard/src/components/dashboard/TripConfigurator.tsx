import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import { LogisticsSection } from './LogisticsSection'
import { JourneyStaySection } from './JourneyStaySection'
import { VibeSection } from './VibeSection'
import { MapPin, Sparkles, ArrowRight, Terminal } from 'lucide-react'

// Hollywood Style Terminal Loader
function TerminalLoader({ onComplete }: { onComplete: () => void }) {
    const [lines, setLines] = useState<string[]>([])

    useEffect(() => {
        const sequence = [
            { text: "Initialize Neural Core...", delay: 200 },
            { text: "Loading User Preferences...", delay: 600 },
            { text: "Analyzing Travel Patterns...", delay: 1000 },
            { text: "Connecting to Satellite Metadata...", delay: 1500 },
            { text: "Optimizing Route Parameters... 100%", delay: 2200 },
            { text: "Welcome back, Traveler.", delay: 2800 }
        ]

        let timeouts: NodeJS.Timeout[] = []

        sequence.forEach(({ text, delay }) => {
            const timeout = setTimeout(() => {
                setLines(prev => [...prev, text])
            }, delay)
            timeouts.push(timeout)
        })

        const finalTimeout = setTimeout(onComplete, 3500)
        timeouts.push(finalTimeout)

        return () => timeouts.forEach(clearTimeout)
    }, [onComplete])

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-emerald-500 font-mono p-8 rounded-2xl shadow-2xl border border-slate-800">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                    <Terminal size={16} />
                    <span className="text-xs uppercase tracking-widest text-slate-500">System Boot</span>
                </div>
                <div className="space-y-2 font-mono text-sm h-64 overflow-hidden relative">
                    <AnimatePresence>
                        {lines.map((line, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2"
                            >
                                <span className="text-slate-600">➜</span>
                                {line}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <motion.div
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="w-2 h-4 bg-emerald-500 mt-2 inline-block"
                    />
                </div>
                <div className="h-1 bg-slate-800 w-full mt-4 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                    />
                </div>
            </div>
        </div>
    )
}

export function TripConfigurator() {
    const { getActiveTrip, getCurrentUser } = useUserStore()
    const activeTrip = getActiveTrip()
    const currentUser = getCurrentUser()
    const [loading, setLoading] = useState(true)

    // Simulating initial load only once per session typically, 
    // but for demo we load on mount if user exists
    useEffect(() => {
        if (currentUser) {
            setLoading(true)
        } else {
            setLoading(false)
        }
    }, [currentUser?.id]) // Re-trigger on user switch

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50">
                <p className="text-slate-400 font-medium">Please select a user from the sidebar</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="h-full p-8 flex items-center justify-center bg-slate-50">
                <TerminalLoader onComplete={() => setLoading(false)} />
            </div>
        )
    }

    if (!activeTrip) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full bg-slate-50 p-8"
            >
                <div className="card-premium p-12 text-center max-w-lg w-full">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
                        <MapPin size={32} className="text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">No Trip Selected</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Ready to plan your next adventure? Create a new trip context or select an existing one to get started.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold shadow-xl shadow-indigo-200 hover:shadow-2xl hover:bg-indigo-700 transition-all"
                    >
                        Start New Journey
                        <ArrowRight size={18} />
                    </motion.button>
                </div>
            </motion.div>
        )
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 280, damping: 24 }
        }
    }

    return (
        <motion.div
            key={activeTrip.id} // Force re-render on trip switch
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-5xl mx-auto p-12 pb-24" // Generous padding
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="mb-12">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
                        <Sparkles size={12} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">AI Planning Mode</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {activeTrip.id.substring(0, 8)}</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight mb-4">{activeTrip.name}</h1>
                <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
                    Configure your preferences below. Our AI will analyze {activeTrip.group_type} dynamics to generate the perfect itinerary.
                </p>
            </motion.div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 gap-10">
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

            {/* Footer / Generate Action */}
            <motion.div
                variants={itemVariants}
                className="mt-16 pt-10 border-t border-slate-200 flex items-center justify-between sticky bottom-6 bg-white/80 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-2xl"
            >
                <div>
                    <p className="text-label mb-1">Status</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-semibold text-slate-700">Ready to Generate</span>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-2xl hover:bg-slate-800 transition-all"
                >
                    <Sparkles size={18} className="text-indigo-400" />
                    Generate Itinerary
                    <ArrowRight size={18} className="text-slate-400" />
                </motion.button>
            </motion.div>
        </motion.div>
    )
}
