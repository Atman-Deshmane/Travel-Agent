import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import { LogisticsSection } from './LogisticsSection'
import { JourneyStaySection } from './JourneyStaySection'
import { VibeSection } from './VibeSection'
import { MapPin, Sparkles, ArrowRight, Terminal, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

// Validation Error Types
interface ValidationErrors {
    group?: boolean
    times?: boolean
    interests?: boolean
}

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

        let timeouts: ReturnType<typeof setTimeout>[] = []

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

// Toast Component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl z-50 ${type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
                }`}
        >
            {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{message}</span>
        </motion.div>
    )
}

interface TripConfiguratorProps {
    onFetchPlaces?: () => void
}

export function TripConfigurator({ onFetchPlaces }: TripConfiguratorProps) {
    const { getActiveTrip, getCurrentUser } = useUserStore()
    const activeTrip = getActiveTrip()
    const currentUser = getCurrentUser()
    const [loading, setLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [errors, setErrors] = useState<ValidationErrors>({})
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Refs for scrolling
    const logisticsRef = useRef<HTMLDivElement>(null)
    const vibeRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (currentUser) {
            setLoading(true)
        } else {
            setLoading(false)
        }

        // Warmup backend model (Fire and forget)
        fetch('http://127.0.0.1:5001/api/warmup').catch(console.error)
    }, [currentUser?.id])

    // Clear errors when trip data changes
    useEffect(() => {
        if (activeTrip) {
            setErrors({})
        }
    }, [activeTrip?.group_type, activeTrip?.arrival_time, activeTrip?.departure_time, activeTrip?.interests])

    const validateTrip = (): boolean => {
        if (!activeTrip) return false

        const newErrors: ValidationErrors = {}

        // Validate group type
        if (activeTrip.group_type === null) {
            newErrors.group = true
        }

        // Validate times
        if (activeTrip.arrival_time === null || activeTrip.departure_time === null) {
            newErrors.times = true
        }

        // Validate interests
        if (!activeTrip.interests || activeTrip.interests.length === 0) {
            newErrors.interests = true
        }

        setErrors(newErrors)

        // If errors, scroll to first error section
        if (Object.keys(newErrors).length > 0) {
            if (newErrors.group || newErrors.times) {
                logisticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else if (newErrors.interests) {
                vibeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            return false
        }

        return true
    }

    const handleGenerate = async () => {
        if (!validateTrip() || !activeTrip || !currentUser) {
            setToast({ message: 'Please fill all required fields', type: 'error' })
            return
        }

        // Helper to safely convert date to ISO string
        const toISOString = (date: Date | string | null): string | null => {
            if (!date) return null
            if (date instanceof Date) return date.toISOString()
            if (typeof date === 'string') return new Date(date).toISOString()
            return null
        }

        // Construct User Profile JSON
        const userProfileJson = {
            user_id: currentUser.id,
            name: currentUser.name,
            avatar_color: currentUser.avatar_color,
            generated_at: new Date().toISOString(),
            defaults: {
                origin_city: {
                    value: currentUser.defaults.origin_city || null,
                    required: false,
                    is_default: true
                },
                food_preference: {
                    value: currentUser.defaults.food_preference,
                    required: false,
                    is_default: true
                },
                mobility: {
                    value: currentUser.defaults.mobility,
                    required: false,
                    is_default: true
                },
                pace: {
                    value: currentUser.defaults.pace,
                    required: false,
                    is_default: true
                },
                interests: {
                    value: currentUser.defaults.interests,
                    required: true,
                    is_default: true
                },
                transport_mode_preference: {
                    value: currentUser.defaults.transport_mode_preference,
                    required: false,
                    is_default: true
                },
            }
        }

        // Construct Trip Context JSON
        const tripContextJson = {
            trip_id: activeTrip.id,
            user_id: activeTrip.user_id,
            name: activeTrip.name,
            generated_at: new Date().toISOString(),
            logistics: {
                dates: {
                    value: {
                        from: toISOString(activeTrip.dates.from),
                        to: toISOString(activeTrip.dates.to)
                    },
                    required: false
                },
                arrival_time: { value: activeTrip.arrival_time, required: true },
                departure_time: { value: activeTrip.departure_time, required: true },
                group_type: { value: activeTrip.group_type, required: true },
                family_composition: { value: activeTrip.family_composition, required: false },
            },
            journey: {
                origin_city: { value: activeTrip.origin_city, required: false },
                mode_to_kodai: { value: activeTrip.mode_to_kodai, required: false },
                transport_in_city: { value: activeTrip.transport_in_city, required: false },
            },
            stay: {
                accommodation: { value: activeTrip.accommodation, required: false },
            },
            preferences: {
                food_preference: { value: activeTrip.food_preference, required: false },
                mobility: { value: activeTrip.mobility, required: false },
                pace: { value: activeTrip.pace, required: false },
                interests: { value: activeTrip.interests, required: true },
            }
        }

        // Log to console
        console.log('='.repeat(60))
        console.log('📁 USER PROFILE JSON')
        console.log('='.repeat(60))
        console.log(JSON.stringify(userProfileJson, null, 2))
        console.log('')
        console.log('='.repeat(60))
        console.log('🗺️ TRIP CONTEXT JSON')
        console.log('='.repeat(60))
        console.log(JSON.stringify(tripContextJson, null, 2))
        console.log('')

        setIsGenerating(true)

        // Save to Flask backend using user name for folder/file naming
        try {
            // Helper for fetch with timeout
            const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = 2000) => {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(id);
                return response;
            };

            // Save user profile - folder and file named after user
            const profileResponse = await fetchWithTimeout(`http://127.0.0.1:5001/api/user/${encodeURIComponent(currentUser.name)}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userProfileJson)
            })

            if (!profileResponse.ok) {
                throw new Error('Failed to save user profile')
            }

            // Save trip - file named after trip name (date range)
            const tripResponse = await fetchWithTimeout(`http://127.0.0.1:5001/api/user/${encodeURIComponent(currentUser.name)}/trip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tripContextJson)
            })

            if (!tripResponse.ok) {
                throw new Error('Failed to save trip')
            }

            setToast({ message: `Saved to ${currentUser.name}/${activeTrip.name}.json`, type: 'success' })

        } catch (error) {
            console.error('Save error:', error)
            setToast({ message: 'Saved to console (backend unavailable)', type: 'success' })
        } finally {
            // Navigate to Places Explorer regardless of save status
            setIsGenerating(false)
            if (onFetchPlaces) {
                onFetchPlaces()
            }
        }
    }

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
            transition: { type: "spring" as const, stiffness: 280, damping: 24 }
        }
    }

    return (
        <>
            <motion.div
                key={activeTrip.id}
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="max-w-5xl mx-auto p-12 pb-24"
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
                        Configure your preferences below. Our AI will analyze {activeTrip.group_type || 'your'} dynamics to generate the perfect itinerary.
                    </p>
                </motion.div>

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 gap-10">
                    <motion.div variants={itemVariants} ref={logisticsRef}>
                        <LogisticsSection trip={activeTrip} errors={{ group: errors.group, times: errors.times }} />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <JourneyStaySection trip={activeTrip} />
                    </motion.div>

                    <motion.div variants={itemVariants} ref={vibeRef}>
                        <VibeSection trip={activeTrip} errors={{ interests: errors.interests }} />
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
                            {Object.keys(errors).length > 0 ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-sm font-semibold text-red-600">Missing Required Fields</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-semibold text-slate-700">Ready to Generate</span>
                                </>
                            )}
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-2xl hover:bg-slate-800 transition-all ${isGenerating ? 'opacity-80 cursor-not-allowed' : ''}`}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin text-indigo-400" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} className="text-indigo-400" />
                                Fetch Places
                                <ArrowRight size={18} className="text-slate-400" />
                            </>
                        )}
                    </motion.button>
                </motion.div>
            </motion.div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
