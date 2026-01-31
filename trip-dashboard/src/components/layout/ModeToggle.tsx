import { Bot, Settings } from 'lucide-react';

type PlanMode = 'manual' | 'ai';

interface ModeToggleProps {
    mode: PlanMode;
    onModeChange: (mode: PlanMode) => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
                onClick={() => onModeChange('ai')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${mode === 'ai'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
            >
                <Bot size={16} />
                AI Chat
            </button>
            <button
                onClick={() => onModeChange('manual')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${mode === 'manual'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
            >
                <Settings size={16} />
                Manual Mode
            </button>
        </div>
    );
}
