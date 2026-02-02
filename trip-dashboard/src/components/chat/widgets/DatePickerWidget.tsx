import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'

interface DatePickerWidgetProps {
    onConfirm: (dates: { from: string; to: string }) => void
}

export function DatePickerWidget({ onConfirm }: DatePickerWidgetProps) {
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    const handleConfirm = () => {
        if (fromDate && toDate) {
            onConfirm({ from: fromDate, to: toDate })
        }
    }

    // Calculate tomorrow's date for min
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const minDate = tomorrow.toISOString().split('T')[0]

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm sm:max-w-md w-full"
        >
            <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-indigo-500" />
                <span className="text-sm font-medium text-slate-700">When are you visiting Kodaikanal?</span>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block font-medium">From</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        min={minDate}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block font-medium">To</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        min={fromDate || minDate}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                </div>
            </div>

            {fromDate && toDate && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleConfirm}
                    className="w-full py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md shadow-indigo-200"
                >
                    Confirm Dates
                </motion.button>
            )}
        </motion.div>
    )
}
