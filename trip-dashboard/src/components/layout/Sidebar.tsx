import { TripList } from './TripList'
import { UserSwitcher } from './UserSwitcher'
import { Mountain } from 'lucide-react'

interface SidebarProps {
    children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 flex flex-col bg-surface border-r border-border">
                {/* Logo */}
                <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
                    <Mountain className="text-accent" size={24} />
                    <h1 className="text-lg font-bold text-text-primary">Kodai Planner</h1>
                </div>

                {/* Trip List */}
                <div className="flex-1 overflow-hidden">
                    <TripList />
                </div>

                {/* User Switcher */}
                <UserSwitcher />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
