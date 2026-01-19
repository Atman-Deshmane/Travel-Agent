import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import { ChevronUp, Plus, Check, User, LogOut } from 'lucide-react'

export function UserSwitcher() {
    const { users, currentUserId, setCurrentUser, createUser, getCurrentUser } = useUserStore()
    const [isOpen, setIsOpen] = useState(false)
    const [newUserName, setNewUserName] = useState('')
    const [showNewUserInput, setShowNewUserInput] = useState(false)

    const currentUser = getCurrentUser()

    const handleCreateUser = () => {
        if (newUserName.trim()) {
            createUser(newUserName.trim())
            setNewUserName('')
            setShowNewUserInput(false)
            setIsOpen(false)
        }
    }

    return (
        <div className="relative border-t border-slate-800/50 bg-slate-900/50">
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-10"
                        />
                        {/* Popover */}
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden z-20"
                        >
                            <div className="p-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5">Switch Profile</p>
                                <ul className="space-y-0.5">
                                    {users.map(user => (
                                        <motion.button
                                            key={user.id}
                                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                            onClick={() => {
                                                setCurrentUser(user.id)
                                                setIsOpen(false)
                                            }}
                                            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left"
                                        >
                                            <div
                                                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                                style={{ backgroundColor: user.avatar_color }}
                                            >
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`flex-1 text-sm font-medium ${user.id === currentUserId ? 'text-white' : 'text-slate-400'}`}>
                                                {user.name}
                                            </span>
                                            {user.id === currentUserId && (
                                                <Check size={14} className="text-emerald-400" />
                                            )}
                                        </motion.button>
                                    ))}
                                </ul>
                            </div>

                            <div className="border-t border-slate-700/50 p-2 bg-slate-800/50">
                                {showNewUserInput ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newUserName}
                                            onChange={(e) => setNewUserName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                                            placeholder="Name"
                                            className="flex-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleCreateUser}
                                            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-500"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewUserInput(true)}
                                        className="flex items-center gap-2 w-full px-2 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
                                    >
                                        <Plus size={14} />
                                        Add New Profile
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-6 py-4"
            >
                {currentUser && (
                    <>
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-slate-800"
                            style={{ background: currentUser.avatar_color }}
                        >
                            {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-slate-200">{currentUser.name}</p>
                            <p className="text-[10px] font-medium text-slate-500">Free Plan</p>
                        </div>
                        <ChevronUp size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </motion.button>
        </div>
    )
}
