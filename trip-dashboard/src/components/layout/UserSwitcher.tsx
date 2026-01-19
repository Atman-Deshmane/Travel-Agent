import { useState } from 'react'
import { useUserStore } from '../../store/useUserStore'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

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
        <div className="relative border-t border-border">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors"
            >
                {currentUser && (
                    <>
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ backgroundColor: currentUser.avatar_color }}
                        >
                            {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-text-primary">{currentUser.name}</p>
                            <p className="text-xs text-text-secondary">Switch user</p>
                        </div>
                        <ChevronDown
                            size={16}
                            className={cn(
                                "text-text-secondary transition-transform",
                                isOpen && "rotate-180"
                            )}
                        />
                    </>
                )}
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                    <ul className="py-1">
                        {users.map(user => (
                            <li
                                key={user.id}
                                onClick={() => {
                                    setCurrentUser(user.id)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors",
                                    user.id === currentUserId
                                        ? "bg-accent/10"
                                        : "hover:bg-surface-elevated"
                                )}
                            >
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                    style={{ backgroundColor: user.avatar_color }}
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 text-sm text-text-primary">{user.name}</span>
                                {user.id === currentUserId && (
                                    <Check size={14} className="text-accent" />
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="border-t border-border p-2">
                        {showNewUserInput ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                                    placeholder="Enter name..."
                                    className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:border-accent"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreateUser}
                                    className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent-hover"
                                >
                                    Add
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowNewUserInput(true)}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text-secondary hover:text-accent transition-colors"
                            >
                                <Plus size={14} />
                                Create New User
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
