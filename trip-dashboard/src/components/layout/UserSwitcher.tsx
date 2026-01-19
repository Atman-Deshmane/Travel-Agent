import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../../store/useUserStore'
import { ChevronDown, Plus, Check, User } from 'lucide-react'

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
        <div className="relative border-t border-white/10">
            <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-5 py-4"
            >
                {currentUser && (
                    <>
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-lg"
                            style={{
                                background: `linear-gradient(135deg, ${currentUser.avatar_color} 0%, ${currentUser.avatar_color}cc 100%)`,
                                boxShadow: `0 4px 12px ${currentUser.avatar_color}40`
                            }}
                        >
                            {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-white">{currentUser.name}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Switch user</p>
                        </div>
                        <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <ChevronDown size={16} className="text-slate-400" />
                        </motion.div>
                    </>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl overflow-hidden"
                    >
                        <ul className="py-2">
                            {users.map(user => (
                                <motion.li
                                    key={user.id}
                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    onClick={() => {
                                        setCurrentUser(user.id)
                                        setIsOpen(false)
                                    }}
                                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
                                        style={{ backgroundColor: user.avatar_color }}
                                    >
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="flex-1 text-sm text-slate-200">{user.name}</span>
                                    {user.id === currentUserId && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"
                                        >
                                            <Check size={12} className="text-emerald-400" />
                                        </motion.div>
                                    )}
                                </motion.li>
                            ))}
                        </ul>

                        <div className="border-t border-slate-700/50 p-3">
                            {showNewUserInput ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                                        placeholder="Enter name..."
                                        className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        autoFocus
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleCreateUser}
                                        className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg font-medium"
                                    >
                                        Add
                                    </motion.button>
                                </div>
                            ) : (
                                <motion.button
                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    onClick={() => setShowNewUserInput(true)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                                >
                                    <Plus size={16} />
                                    Create New User
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
