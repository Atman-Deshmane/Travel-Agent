import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface MobileDrawerProps {
    isOpen: boolean
    onClose: () => void
    position?: 'left' | 'bottom'
    height?: string
    title?: string
    children: ReactNode
}

export function MobileDrawer({
    isOpen,
    onClose,
    position = 'bottom',
    height = '85vh',
    title,
    children
}: MobileDrawerProps) {
    const isBottom = position === 'bottom'

    const variants = isBottom
        ? {
            hidden: { y: '100%', opacity: 0 },
            visible: { y: 0, opacity: 1 },
            exit: { y: '100%', opacity: 0 }
        }
        : {
            hidden: { x: '-100%', opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: '-100%', opacity: 0 }
        }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={variants}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={`fixed z-[70] bg-white overflow-hidden ${isBottom
                                ? 'inset-x-0 bottom-0 rounded-t-2xl'
                                : 'inset-y-0 left-0 w-80 shadow-2xl'
                            }`}
                        style={isBottom ? { height } : undefined}
                    >
                        {/* Drag Handle (bottom sheet) */}
                        {isBottom && (
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-slate-300" />
                            </div>
                        )}

                        {/* Header */}
                        {title && (
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {/* Close button if no title */}
                        {!title && !isBottom && (
                            <div className="flex justify-end p-3">
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="overflow-y-auto flex-1" style={{ height: title ? 'calc(100% - 60px)' : isBottom ? 'calc(100% - 20px)' : '100%' }}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
