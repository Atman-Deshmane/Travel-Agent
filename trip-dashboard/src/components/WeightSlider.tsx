import { motion } from 'framer-motion'
import { Users, Sparkles } from 'lucide-react'

interface WeightSliderProps {
    value: number // 0-100, where 0 = 100% popularity, 100 = 100% similarity
    onChange: (value: number) => void
    disabled?: boolean
}

export function WeightSlider({ value, onChange, disabled = false }: WeightSliderProps) {
    const popularityWeight = 100 - value
    const similarityWeight = value

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-500" />
                    <span className="text-sm font-semibold text-slate-700">Crowd's Wisdom</span>
                    <span className="text-lg font-bold text-blue-600">{popularityWeight}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-purple-600">{similarityWeight}%</span>
                    <span className="text-sm font-semibold text-slate-700">Personalization</span>
                    <Sparkles size={16} className="text-purple-500" />
                </div>
            </div>

            <div className="relative">
                {/* Track Background */}
                <div className="h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-100 via-slate-100 to-purple-100">
                    {/* Gradient overlay based on value */}
                    <motion.div
                        className="h-full rounded-full"
                        style={{
                            background: `linear-gradient(90deg, 
                rgba(59, 130, 246, ${0.3 + (popularityWeight / 100) * 0.5}) 0%, 
                rgba(168, 85, 247, ${0.3 + (similarityWeight / 100) * 0.5}) 100%)`
                        }}
                        animate={{ opacity: 1 }}
                    />
                </div>

                {/* Slider Input */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    disabled={disabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    style={{ margin: 0 }}
                />

                {/* Thumb Indicator */}
                <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-300 shadow-lg pointer-events-none"
                    style={{ left: `calc(${value}% - 12px)` }}
                    animate={{ left: `calc(${value}% - 12px)` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-3 text-[10px] text-slate-400 uppercase tracking-wider">
                <span>Go with the crowd</span>
                <span>Default (40/60)</span>
                <span>Super personalized</span>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2 mt-4">
                {[
                    { label: 'Popular', value: 20 },
                    { label: 'Balanced', value: 60 },
                    { label: 'Personal', value: 80 }
                ].map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => onChange(preset.value)}
                        disabled={disabled}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${Math.abs(value - preset.value) < 10
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
