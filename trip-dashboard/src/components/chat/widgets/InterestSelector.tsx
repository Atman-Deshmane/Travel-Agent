import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

interface InterestSelectorProps {
    onSelect: (interests: string[]) => void
}

const INTEREST_OPTIONS = [
    { id: 'nature', label: 'Nature & Viewpoints', emoji: '🌳' },
    { id: 'peace', label: 'Peace & Serenity', emoji: '🧘' },
    { id: 'adventure', label: 'Adventure & Trekking', emoji: '🥾' },
    { id: 'cafes', label: 'Cafes & Food', emoji: '☕' },
    { id: 'photography', label: 'Photography Spots', emoji: '📸' },
    { id: 'religious', label: 'Religious & Temples', emoji: '🙏' },
    { id: 'wildlife', label: 'Wildlife & Gardens', emoji: '🦋' },
    { id: 'waterfalls', label: 'Waterfalls', emoji: '💧' },
]

export function InterestSelector({ onSelect }: InterestSelectorProps) {
    const [selected, setSelected] = useState<string[]>([])

    const toggleInterest = (id: string) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    const handleSubmit = () => {
        if (selected.length > 0) {
            const labels = selected.map(id =>
                INTEREST_OPTIONS.find(o => o.id === id)?.label || id
            )
            onSelect(labels)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700"
        >
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-emerald-400" />
                <span className="text-sm font-medium text-slate-300">What interests you?</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {INTEREST_OPTIONS.map((interest) => (
                    <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${selected.includes(interest.id)
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        <span>{interest.emoji}</span>
                        <span>{interest.label}</span>
                        {selected.includes(interest.id) && <Check size={14} />}
                    </button>
                ))}
            </div>

            {selected.length > 0 && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleSubmit}
                    className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
                >
                    Continue with {selected.length} interest{selected.length > 1 ? 's' : ''}
                </motion.button>
            )}
        </motion.div>
    )
}
