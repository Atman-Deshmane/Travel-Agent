import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, Mic, MicOff, RotateCcw, Volume2, VolumeX,
    Play, Loader2, Bot, User
} from 'lucide-react'
import { InterestSelector, PlaceCarousel, ItineraryWidget, DatePickerWidget, PaceSelector } from '../components/chat/widgets'

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
    const [, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
            const response = await fetch('http://127.0.0.1:5001/api/ai/chat', {
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

            const response = await fetch('http://127.0.0.1:5001/api/ai/voice', {
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
                    playAudio(data.audio_base64)
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

    const playAudio = (base64Audio: string) => {
        try {
            const audioData = atob(base64Audio)
            const arrayBuffer = new ArrayBuffer(audioData.length)
            const view = new Uint8Array(arrayBuffer)
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i)
            }
            const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' })
            const audioUrl = URL.createObjectURL(audioBlob)

            if (audioRef.current) {
                audioRef.current.pause()
            }

            const audio = new Audio(audioUrl)
            audio.playbackRate = playbackSpeed
            audioRef.current = audio

            audio.onplay = () => setIsPlaying(true)
            audio.onpause = () => setIsPlaying(false)
            audio.onended = () => setIsPlaying(false)

            audio.play()
        } catch (error) {
            console.error('Failed to play audio:', error)
        }
    }

    const cycleSpeed = () => {
        const speeds = [1, 1.25, 1.5, 2]
        const currentIndex = speeds.indexOf(playbackSpeed)
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length]
        setPlaybackSpeed(nextSpeed)
        if (audioRef.current) {
            audioRef.current.playbackRate = nextSpeed
        }
    }

    const resetConversation = async () => {
        try {
            await fetch('http://127.0.0.1:5001/api/ai/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            })
        } catch (e) {
            console.error('Reset failed:', e)
        }

        // Reset to initial greeting
        setMessages([initialGreeting])
        setSessionId(null)
        setSessionState(null)
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
        <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Chat Controls Header */}
            <header className="flex-shrink-0 bg-slate-800/80 backdrop-blur-lg border-b border-slate-700 px-4 py-2">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                        Kodaikanal • <span className="text-emerald-400">Koda</span>
                    </div>

                    {/* Chat Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>

                        <button
                            onClick={cycleSpeed}
                            className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 text-sm font-mono hover:bg-slate-600 transition-colors"
                            title="Playback speed"
                        >
                            {playbackSpeed}x
                        </button>

                        <button
                            onClick={resetConversation}
                            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                            title="Reset conversation"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <AnimatePresence mode="popLayout">
                        {messages.map((message) => (
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
                                    <div
                                        className={`px-4 py-3 rounded-2xl ${message.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-sm'
                                            : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{message.text}</p>
                                    </div>

                                    {/* Audio controls for assistant messages */}
                                    {message.role === 'assistant' && message.audioBase64 && (
                                        <div className="flex items-center gap-2 mt-1 text-slate-400">
                                            <button
                                                onClick={() => playAudio(message.audioBase64!)}
                                                className="p-1 hover:text-emerald-400 transition-colors"
                                                title="Play audio"
                                            >
                                                <Play size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Widget rendering */}
                                    {message.role === 'assistant' && message.uiComponent && (
                                        <div className="mt-3 w-full">
                                            {renderWidget(message.uiComponent)}
                                        </div>
                                    )}
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                        <User size={16} className="text-white" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
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
                            <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700 px-4 py-4">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <div className="flex-1 relative">
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
                            placeholder="Type your message..."
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            rows={1}
                            disabled={isLoading || isRecording}
                        />
                    </div>

                    {/* Voice Button */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isLoading}
                        className={`p-3 rounded-xl transition-all ${isRecording
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        title={isRecording ? 'Stop recording' : 'Start voice input'}
                    >
                        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {/* Send Button */}
                    <button
                        onClick={() => sendMessage(inputText)}
                        disabled={!inputText.trim() || isLoading}
                        className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-teal-700 transition-all"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>

            {/* Recording Overlay */}
            <AnimatePresence>
                {isRecording && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50"
                        onClick={stopRecording}
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl shadow-red-500/50"
                        >
                            <Mic size={40} className="text-white" />
                        </motion.div>
                        <p className="text-white text-xl mt-6 font-medium">Listening...</p>
                        <p className="text-slate-400 mt-2">Tap anywhere to stop</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
