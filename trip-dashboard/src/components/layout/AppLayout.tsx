import type { ReactNode } from 'react';
import { MapPin, Compass } from 'lucide-react';

type MainTab = 'plan' | 'explore';

interface AppLayoutProps {
    mainTab: MainTab;
    onMainTabChange: (tab: MainTab) => void;
    children: ReactNode;
    secondaryNav?: ReactNode;
}

export function AppLayout({ mainTab, onMainTabChange, children, secondaryNav }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Main Tab Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Left Section: Logo + Main Tabs */}
                        <div className="flex items-center gap-8">
                            {/* Logo/Brand */}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-slate-800 text-lg tracking-tight">
                                    Kodaikanal
                                </span>
                            </div>

                            {/* Main Tabs */}
                            <nav className="flex items-center gap-1">
                                <button
                                    onClick={() => onMainTabChange('plan')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mainTab === 'plan'
                                            ? 'bg-slate-100 text-indigo-600'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <Compass size={18} />
                                    Plan Trip
                                </button>
                                <button
                                    onClick={() => onMainTabChange('explore')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mainTab === 'explore'
                                            ? 'bg-slate-100 text-indigo-600'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <MapPin size={18} />
                                    Explore Places
                                </button>
                            </nav>
                        </div>

                        {/* Right Section: Secondary Nav (Mode Toggle) */}
                        <div>
                            {secondaryNav}
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
