import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, Mic, MicOff, RotateCw, Volume2, VolumeX,
    Play, Pause, Loader2, Bot, User
} from 'lucide-react'
import { InterestSelector, PlaceCarousel, ItineraryWidget, DatePickerWidget, PaceSelector } from '../components/chat/widgets'
import { API_ENDPOINTS } from '../config/api'

interface Message {
    id: string
    role: 'user' | 'assistant'
    text: string
    audioBase64?: string
    uiComponent?: {
        type: string
        data?: any
    }
    timestamp: Date
}

export function ChatMode() {
    // Initial pinned greeting from Koda
    const initialGreeting: Message = {
        id: 'greeting',
        role: 'assistant',
        text: "Hi there! 👋 I'm Koda, your personal Kodaikanal trip planner.\n\nI'll help you create the perfect itinerary for your visit to the \"Princess of Hill Stations\"! To get started, could you tell me your name?",
        timestamp: new Date()
    }

    const [messages, setMessages] = useState<Message[]>([initialGreeting])
    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [, setSessionState] = useState<any>(null)

    // Audio playback state
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
    const [isMuted, setIsMuted] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Auto-scroll to bottom (only after user sends a message, not on initial load)
    useEffect(() => {
        if (messages.length > 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: text.trim(),
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInputText('')
        setIsLoading(true)

        try {
            const response = await fetch(API_ENDPOINTS.chat, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text.trim(),
                    session_id: sessionId
                })
            })

            const data = await response.json()

            if (data.status === 'success') {
                if (data.session_id) setSessionId(data.session_id)
                if (data.session_state) setSessionState(data.session_state)

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    text: data.response,
                    uiComponent: data.ui_component,
                    timestamp: new Date()
                }

                setMessages(prev => [...prev, assistantMessage])
            } else {
                throw new Error(data.response || 'Failed to get response')
            }
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleVoiceSubmit = async (audioBlob: Blob) => {
        setIsLoading(true)

        // Add placeholder user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: '🎤 Processing voice...',
            timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])

        try {
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')
            if (sessionId) formData.append('session_id', sessionId)

            const response = await fetch(API_ENDPOINTS.voice, {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (data.status === 'success') {
                if (data.session_id) setSessionId(data.session_id)
                if (data.session_state) setSessionState(data.session_state)

                // Update user message with transcribed text
                setMessages(prev => prev.map(m =>
                    m.id === userMessage.id
                        ? { ...m, text: data.user_text }
                        : m
                ))

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    text: data.agent_text,
                    audioBase64: data.audio_base64,
                    uiComponent: data.ui_component,
                    timestamp: new Date()
                }

                setMessages(prev => [...prev, assistantMessage])

                // Auto-play audio if available and not muted
                if (data.audio_base64 && !isMuted) {
                    playAudio(data.audio_base64, assistantMessage.id)
                }
            } else {
                throw new Error(data.message || 'Voice processing failed')
            }
        } catch (error) {
            console.error('Voice error:', error)
            setMessages(prev => prev.map(m =>
                m.id === userMessage.id
                    ? { ...m, text: 'Failed to process voice. Please try again.' }
                    : m
            ))
        } finally {
            setIsLoading(false)
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                handleVoiceSubmit(audioBlob)
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (error) {
            console.error('Failed to start recording:', error)
            alert('Could not access microphone. Please check permissions.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const handleRecording = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    const playAudio = useCallback((base64Audio: string, messageId: string) => {
        try {
            // If this message is already playing, pause it
            if (playingMessageId === messageId && audioRef.current) {
                audioRef.current.pause()
                setPlayingMessageId(null)
                return
            }

            // Stop any currently playing audio
            if (audioRef.current) {
                audioRef.current.pause()
            }

            const audioData = atob(base64Audio)
            const arrayBuffer = new ArrayBuffer(audioData.length)
            const view = new Uint8Array(arrayBuffer)
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i)
            }
            const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' })
            const audioUrl = URL.createObjectURL(audioBlob)

            const audio = new Audio(audioUrl)
            audio.playbackRate = playbackSpeed
            audioRef.current = audio

            audio.onplay = () => setPlayingMessageId(messageId)
            audio.onpause = () => setPlayingMessageId(null)
            audio.onended = () => setPlayingMessageId(null)

            audio.play()
        } catch (error) {
            console.error('Failed to play audio:', error)
        }
    }, [playingMessageId, playbackSpeed])

    const cycleSpeed = () => {
        const speeds = [1, 1.25, 1.5, 2]
        const currentIndex = speeds.indexOf(playbackSpeed)
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length]
        setPlaybackSpeed(nextSpeed)
        if (audioRef.current) {
            audioRef.current.playbackRate = nextSpeed
        }
    }

    const handleWidgetAction = (action: string, data: { interests?: string[]; places?: string[]; dates?: { from: string; to: string }; pace?: string; group_type?: string; has_elders?: boolean; has_kids?: boolean }) => {
        // Handle widget interactions
        if (action === 'select_interests' && data.interests) {
            sendMessage(`My interests are: ${data.interests.join(', ')}`)
        } else if (action === 'select_places' && data.places) {
            sendMessage(`I want to visit these ${data.places.length} places. Please build my itinerary.`)
        } else if (action === 'confirm_itinerary') {
            sendMessage('This itinerary looks great! Please save it.')
        } else if (action === 'select_dates' && data.dates) {
            sendMessage(`I'm planning to visit from ${data.dates.from} to ${data.dates.to}`)
        } else if (action === 'select_pace') {
            const parts = [`My pace is ${data.pace}, traveling ${data.group_type}`]
            if (data.has_elders) parts.push('with senior family members')
            if (data.has_kids) parts.push('with kids')
            sendMessage(parts.join(', '))
        }
    }

    const renderWidget = (uiComponent: any) => {
        if (!uiComponent) return null

        switch (uiComponent.type) {
            case 'interest_selector':
                return (
                    <InterestSelector
                        onSelect={(interests: string[]) => handleWidgetAction('select_interests', { interests })}
                    />
                )
            case 'place_carousel':
                return (
                    <PlaceCarousel
                        places={uiComponent.data?.places || []}
                        selectedIds={uiComponent.data?.selected_ids || []}
                        onConfirm={(placeIds: string[]) => handleWidgetAction('select_places', { places: placeIds })}
                    />
                )
            case 'itinerary_view':
                return (
                    <ItineraryWidget
                        itinerary={uiComponent.data}
                        onConfirm={() => handleWidgetAction('confirm_itinerary', {})}
                    />
                )
            case 'date_picker':
                return (
                    <DatePickerWidget
                        onConfirm={(dates) => handleWidgetAction('select_dates', { dates })}
                    />
                )
            case 'pace_selector':
                return (
                    <PaceSelector
                        onConfirm={(selection) => handleWidgetAction('select_pace', selection)}
                    />
                )
            default:
                return null
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-slate-50 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl opacity-60 translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10">
                <div className="max-w-4xl mx-auto space-y-6">
                    <AnimatePresence mode="popLayout">
                        {messages.map((message) => {
                            // Simple markdown rendering for **bold**
                            const renderText = (text: string) => {
                                const parts = text.split(/(\*\*[^*]+\*\*)/g)
                                return parts.map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
                                    }
                                    return <span key={i}>{part}</span>
                                })
                            }

                            const isPlaying = playingMessageId === message.id

                            return (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                            <Bot size={16} className="text-white" />
                                        </div>
                                    )}

                                    <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className="relative group">
                                            {/* Corner audio controls for assistant messages with audio */}
                                            {message.role === 'assistant' && message.audioBase64 && (
                                                <div className="absolute -top-3 -right-2 flex items-center gap-0.5 bg-white/95 backdrop-blur rounded-full px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-slate-100 z-10">
                                                    {/* Mute/Unmute */}
                                                    <button
                                                        onClick={() => setIsMuted(!isMuted)}
                                                        className={`p-1.5 rounded-full transition-all ${isMuted
                                                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                                                        title={isMuted ? "Unmute" : "Mute"}
                                                    >
                                                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                                    </button>

                                                    {/* Replay */}
                                                    <button
                                                        onClick={() => {
                                                            if (audioRef.current) {
                                                                audioRef.current.currentTime = 0
                                                                audioRef.current.play()
                                                            } else {
                                                                playAudio(message.audioBase64!, message.id)
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                                                        title="Replay"
                                                    >
                                                        <RotateCw size={14} />
                                                    </button>

                                                    {/* Play/Pause */}
                                                    <button
                                                        onClick={() => playAudio(message.audioBase64!, message.id)}
                                                        className={`p-1.5 rounded-full transition-all ${isPlaying
                                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                                                        title={isPlaying ? "Pause" : "Play"}
                                                    >
                                                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                                    </button>

                                                    {/* Speed */}
                                                    <button
                                                        onClick={cycleSpeed}
                                                        className="px-2 py-1 rounded-full text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                                                        title="Playback speed"
                                                    >
                                                        {playbackSpeed}x
                                                    </button>
                                                </div>
                                            )}

                                            <div
                                                className={`px-5 py-4 rounded-2xl shadow-sm ${message.role === 'user'
                                                    ? 'bg-indigo-600 text-white rounded-br-sm shadow-indigo-200'
                                                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-slate-200'
                                                    }`}
                                            >
                                                <div className={`whitespace-pre-wrap leading-relaxed ${message.role === 'assistant' ? 'text-[15px]' : 'text-base'}`}>
                                                    {renderText(message.text)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Widget rendering */}
                                        {message.role === 'assistant' && message.uiComponent && (
                                            <div className="mt-4 w-full">
                                                {renderWidget(message.uiComponent)}
                                            </div>
                                        )}
                                    </div>

                                    {message.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                            <User size={16} className="text-white" />
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-3"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-sm border border-slate-200 shadow-sm">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area - Floating Capsule */}
            <div className="flex-shrink-0 px-4 py-4 mb-2">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-1.5 flex items-end gap-2 relative z-20 ring-1 ring-black/5">
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    sendMessage(inputText)
                                }
                            }}
                            placeholder="Ask Koda anything..."
                            className="flex-1 max-h-32 min-h-[48px] py-3 px-6 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none overflow-y-auto rounded-3xl"
                            rows={1}
                        />

                        <div className="flex items-center gap-1 pr-1 pb-1">
                            <button
                                onClick={handleRecording}
                                className={`p-3 rounded-full transition-all duration-300 ${isRecording
                                    ? 'bg-red-50 text-red-500 ring-2 ring-red-100'
                                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                    }`}
                                title={isRecording ? 'Stop recording' : 'Start recording'}
                            >
                                {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>

                            <button
                                onClick={() => sendMessage(inputText)}
                                disabled={!inputText.trim() || isLoading}
                                className="p-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md shadow-indigo-200"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-3 text-xs text-slate-400 font-medium">
                        Koda can make mistakes. Please verify important info.
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {isRecording && (
                    <>
                        {/* Full border glow container - pointer-events-none so it doesn't block interaction */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 pointer-events-none z-40"
                            style={{
                                boxShadow: 'inset 0 0 60px 15px rgba(59, 130, 246, 0.5), inset 0 0 120px 30px rgba(59, 130, 246, 0.3)'
                            }}
                        />

                        {/* Animated pulsing glow overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: [0.4, 0.7, 0.4],
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="fixed inset-0 pointer-events-none z-40"
                            style={{
                                boxShadow: 'inset 0 0 100px 25px rgba(59, 130, 246, 0.4), inset 0 0 200px 50px rgba(96, 165, 250, 0.2)'
                            }}
                        />

                        {/* Corner accents for extra prominence */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 0.9, 0.5] }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            className="fixed top-0 left-0 w-48 h-48 pointer-events-none z-40"
                            style={{
                                background: 'radial-gradient(circle at top left, rgba(59, 130, 246, 0.6) 0%, transparent 70%)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 0.9, 0.5] }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                            className="fixed top-0 right-0 w-48 h-48 pointer-events-none z-40"
                            style={{
                                background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.6) 0%, transparent 70%)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 0.9, 0.5] }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.4 }}
                            className="fixed bottom-0 left-0 w-48 h-48 pointer-events-none z-40"
                            style={{
                                background: 'radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.6) 0%, transparent 70%)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 0.9, 0.5] }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.6 }}
                            className="fixed bottom-0 right-0 w-48 h-48 pointer-events-none z-40"
                            style={{
                                background: 'radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.6) 0%, transparent 70%)'
                            }}
                        />
                    </>
                )}
            </AnimatePresence>
        </div >
    )
}
