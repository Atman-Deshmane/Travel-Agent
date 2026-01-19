import { motion, AnimatePresence } from 'framer-motion'
import { TripList } from './TripList'
import { UserSwitcher } from './UserSwitcher'
import { Mountain } from 'lucide-react'

interface SidebarProps {
    children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Premium Dark Sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-72 flex flex-col sidebar-glass relative z-20"
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/50">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Mountain className="text-white" size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight">Kodai Planner</h1>
                        <p className="text-[10px] text-slate-400 font-medium">v2.4.0 • Enterprise</p>
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
            <main className="flex-1 overflow-y-auto bg-slate-50 relative z-10 scroll-smooth">
                <AnimatePresence mode="wait">
                    {children}
                </AnimatePresence>
            </main>
        </div>
    )
}
