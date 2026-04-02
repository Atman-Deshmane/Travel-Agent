import { motion } from 'framer-motion'

interface WeightSliderProps {
    value: number // 0-100, where 0 = 100% popularity, 100 = 100% similarity
    onChange: (value: number) => void
    disabled?: boolean
}

export function WeightSlider({ value, onChange, disabled = false }: WeightSliderProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
            {/* Slider */}
            <div className="relative">
                {/* Track Background */}
                <div className="h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-blue-200 via-slate-100 to-purple-200">
                    <motion.div
                        className="h-full rounded-full"
                        style={{
                            background: `linear-gradient(90deg, 
                                rgba(59, 130, 246, ${0.3 + ((100 - value) / 100) * 0.5}) 0%, 
                                rgba(168, 85, 247, ${0.3 + (value / 100) * 0.5}) 100%)`
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
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-slate-300 shadow-md pointer-events-none"
                    style={{ left: `calc(${value}% - 10px)` }}
                    animate={{ left: `calc(${value}% - 10px)` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            </div>

            {/* Percentage Display */}
            <div className="flex justify-center mt-3 mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <span className="text-[11px] md:text-xs font-semibold text-blue-600">{100 - value}%</span>
                    <span className="text-[10px] text-slate-400">Popularity</span>
                    <span className="text-[10px] text-slate-300 mx-0.5">·</span>
                    <span className="text-[11px] md:text-xs font-semibold text-purple-600">{value}%</span>
                    <span className="text-[10px] text-slate-400">Interests</span>
                </div>
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-1">
                <span className="text-[11px] md:text-xs font-medium text-blue-600">Go with popularity</span>
                <span className="text-[11px] md:text-xs font-medium text-purple-600">Based on your interests</span>
            </div>
        </div>
    )
}
