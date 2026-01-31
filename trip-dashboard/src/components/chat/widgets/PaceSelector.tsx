import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Coffee, Flame, Users, UserCheck } from 'lucide-react'

interface PaceSelectorProps {
    onConfirm: (selection: { pace: string; group_type: string; has_elders: boolean; has_kids: boolean }) => void
}

const PACE_OPTIONS = [
    { id: 'chill', label: 'Chill', desc: '~3 places/day', icon: Coffee, color: 'from-blue-500 to-cyan-500' },
    { id: 'balanced', label: 'Balanced', desc: '~5 places/day', icon: Zap, color: 'from-emerald-500 to-teal-500' },
    { id: 'packed', label: 'Packed', desc: '8+ places/day', icon: Flame, color: 'from-orange-500 to-red-500' }
]

const GROUP_OPTIONS = [
    { id: 'solo', label: 'Solo', icon: UserCheck },
    { id: 'couple', label: 'Couple', icon: Users },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'family', label: 'Family', icon: Users }
]

export function PaceSelector({ onConfirm }: PaceSelectorProps) {
    const [selectedPace, setSelectedPace] = useState<string>('balanced')
    const [selectedGroup, setSelectedGroup] = useState<string>('solo')
    const [hasElders, setHasElders] = useState(false)
    const [hasKids, setHasKids] = useState(false)

    const handleConfirm = () => {
        onConfirm({
            pace: selectedPace,
            group_type: selectedGroup,
            has_elders: hasElders,
            has_kids: hasKids
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4"
        >
            {/* Pace Selection */}
            <div>
                <span className="text-sm font-medium text-white mb-3 block">What's your pace?</span>
                <div className="flex gap-2">
                    {PACE_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setSelectedPace(opt.id)}
                                className={`flex-1 p-3 rounded-xl border transition-all ${selectedPace === opt.id
                                    ? `bg-gradient-to-br ${opt.color} border-transparent text-white`
                                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                                    }`}
                            >
                                <Icon size={20} className="mx-auto mb-1" />
                                <div className="text-sm font-medium">{opt.label}</div>
                                <div className="text-xs opacity-80">{opt.desc}</div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Group Selection */}
            <div>
                <span className="text-sm font-medium text-white mb-3 block">Who's traveling?</span>
                <div className="flex gap-2">
                    {GROUP_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setSelectedGroup(opt.id)}
                                className={`flex-1 py-2 px-3 rounded-lg border transition-all ${selectedGroup === opt.id
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                                    }`}
                            >
                                <Icon size={16} className="mx-auto mb-1" />
                                <div className="text-xs">{opt.label}</div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Family options */}
            {selectedGroup === 'family' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex gap-4"
                >
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasElders}
                            onChange={(e) => setHasElders(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        With seniors (60+)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasKids}
                            onChange={(e) => setHasKids(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        With kids
                    </label>
                </motion.div>
            )}

            <button
                onClick={handleConfirm}
                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
            >
                Continue
            </button>
        </motion.div>
    )
}
