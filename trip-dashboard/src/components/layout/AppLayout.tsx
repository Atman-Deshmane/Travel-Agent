import { useState } from 'react'
import type { ReactNode } from 'react';
import { MapPin, Compass, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type MainTab = 'plan' | 'explore';

interface AppLayoutProps {
    mainTab: MainTab;
    onMainTabChange: (tab: MainTab) => void;
    children: ReactNode;
    secondaryNav?: ReactNode;
}

export function AppLayout({ mainTab, onMainTabChange, children, secondaryNav }: AppLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Main Tab Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-3 md:px-4">
                    <div className="flex items-center justify-between h-12 md:h-16">
                        {/* Left Section: Logo + Main Tabs */}
                        <div className="flex items-center gap-4 md:gap-8">
                            {/* Logo/Brand */}
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <span className="font-bold text-slate-800 text-base md:text-lg tracking-tight">
                                    Kodaikanal
                                </span>
                            </div>

                            {/* Main Tabs - icons on mobile, icons+text on desktop */}
                            <nav className="flex items-center gap-1">
                                <button
                                    onClick={() => onMainTabChange('plan')}
                                    className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mainTab === 'plan'
                                        ? 'bg-slate-100 text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <Compass size={18} />
                                    <span className="hidden md:inline">Plan Trip</span>
                                </button>
                                <button
                                    onClick={() => onMainTabChange('explore')}
                                    className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mainTab === 'explore'
                                        ? 'bg-slate-100 text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <MapPin size={18} />
                                    <span className="hidden md:inline">Explore Places</span>
                                </button>
                            </nav>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-2">
                            {/* Secondary Nav - desktop only */}
                            <div className="hidden md:block">
                                {secondaryNav}
                            </div>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                            >
                                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile dropdown menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden overflow-hidden border-t border-slate-100 bg-white"
                        >
                            <div className="px-4 py-3 space-y-2">
                                {secondaryNav && (
                                    <div className="pb-2">
                                        {secondaryNav}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Content Area */}
            <main className="relative">
                {children}
            </main>
        </div>
    );
}
