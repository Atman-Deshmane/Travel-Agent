import type { ReactNode } from 'react';
import { MapPin, Bot, Settings } from 'lucide-react';

type ActiveTab = 'manual' | 'ai' | 'explore';

interface AppLayoutProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    children: ReactNode;
}

const tabs: { key: ActiveTab; label: string; icon: typeof MapPin }[] = [
    { key: 'manual', label: 'Manual Mode', icon: Settings },
    { key: 'ai', label: 'AI Mode', icon: Bot },
    { key: 'explore', label: 'Explore Places', icon: MapPin },
];

export function AppLayout({ activeTab, onTabChange, children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header with 3 Top-Level Tabs */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-3 md:px-4">
                    <div className="flex items-center justify-between h-12 md:h-16">
                        {/* Left Section: Logo + Tabs */}
                        <div className="flex items-center gap-4 md:gap-8">
                            {/* Logo/Brand */}
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <span className="font-bold text-slate-800 text-base md:text-lg tracking-tight hidden sm:inline">
                                    Kodai Planner
                                </span>
                            </div>

                            {/* 3 Top-Level Tab Buttons */}
                            <nav className="flex items-center gap-1">
                                {tabs.map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => onTabChange(key)}
                                        className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === key
                                            ? 'bg-slate-100 text-indigo-600'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span className="hidden md:inline">{label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="relative">
                {children}
            </main>
        </div>
    );
}
