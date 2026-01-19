import { motion, AnimatePresence } from 'framer-motion'
import { TripList } from './TripList'
import { UserSwitcher } from './UserSwitcher'
import { Mountain, Sparkles } from 'lucide-react'

interface SidebarProps {
    children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
    return (
        <div className="flex h-screen bg-slate-50">
            {/* Premium Dark Sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-72 flex flex-col glass-sidebar"
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <Mountain className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-white tracking-tight">Kodai Planner</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Trip Dashboard</p>
                    </div>
                </div>

                {/* Trip List */}
                <div className="flex-1 overflow-hidden">
                    <TripList />
                </div>

                {/* User Switcher */}
                <UserSwitcher />
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50">
                <AnimatePresence mode="wait">
                    {children}
                </AnimatePresence>
            </main>
        </div>
    )
}
