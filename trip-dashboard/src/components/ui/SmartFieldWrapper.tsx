import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface SmartFieldWrapperProps {
    label: string
    children: React.ReactNode
    showDefaultCheckbox?: boolean
    isDefault?: boolean
    onDefaultChange?: (checked: boolean) => void
    error?: boolean
    errorMessage?: string
}

export function SmartFieldWrapper({
    label,
    children,
    showDefaultCheckbox = false,
    isDefault = false,
    onDefaultChange,
    error = false,
    errorMessage,
}: SmartFieldWrapperProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className={`block text-label ${error ? 'text-red-500' : 'text-slate-500'}`}>
                    {label}
                </label>

                {showDefaultCheckbox && (
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div
                            onClick={() => onDefaultChange?.(!isDefault)}
                            className={`
                                w-4 h-4 rounded border flex items-center justify-center transition-all
                                ${isDefault
                                    ? 'bg-violet-500 border-violet-500'
                                    : 'border-slate-300 bg-white group-hover:border-violet-400'
                                }
                            `}
                        >
                            {isDefault && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                            Save as default
                        </span>
                    </label>
                )}
            </div>

            {/* The actual input field */}
            <motion.div
                animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={error ? 'ring-2 ring-red-200 rounded-xl' : ''}
            >
                {children}
            </motion.div>

            {/* Error message */}
            {error && errorMessage && (
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-medium text-red-500 mt-1"
                >
                    {errorMessage}
                </motion.p>
            )}
        </div>
    )
}
