import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateMockUsers, createBlankTrip } from '../data/mock_users'
import { formatDateRange, generateId } from '../lib/utils'

// ===== INTERFACES =====

export interface UserProfile {
    id: string
    name: string
    avatar_color: string
    defaults: {
        origin_city?: string
        food_preference: 'veg' | 'non_veg' | 'flexible'
        mobility: 'high' | 'medium' | 'low'
        pace: 'chill' | 'balanced' | 'packed'
        interests: string[]
        transport_mode_preference: 'own_vehicle' | 'taxi' | 'public' | 'flexible'
    }
}

export interface TripContext {
    id: string
    user_id: string
    name: string
    created_at: number

    // LOGISTICS
    dates: { from: Date | null; to: Date | null }
    arrival_time: 'morning' | 'noon' | 'evening'
    departure_time: 'morning' | 'noon' | 'evening'

    group_type: 'solo' | 'couple' | 'family' | 'friends'
    family_composition: { has_kids: boolean; has_elders: boolean }

    // JOURNEY
    origin_city: string
    mode_to_kodai: 'own_vehicle' | 'bus' | 'train' | 'flight'
    transport_in_city: 'own_vehicle' | 'taxi' | 'public' | 'flexible'

    // STAY
    accommodation: {
        status: 'booked' | 'undecided'
        booked_location?: { name: string; lat: number; lng: number; google_place_id?: string }
        undecided_cluster?: string
    }

    // PREFERENCES
    food_preference: 'veg' | 'non_veg' | 'flexible'
    mobility: 'high' | 'medium' | 'low'
    pace: 'chill' | 'balanced' | 'packed'
    interests: string[]
}

interface UserStore {
    // State
    users: UserProfile[]
    currentUserId: string | null
    trips: TripContext[]
    activeTripId: string | null

    // Computed
    getCurrentUser: () => UserProfile | null
    getActiveTrip: () => TripContext | null
    getUserTrips: () => TripContext[]

    // Actions
    setCurrentUser: (userId: string) => void
    createUser: (name: string) => void
    updateProfile: (userId: string, data: Partial<UserProfile['defaults']>) => void

    setActiveTrip: (tripId: string) => void
    createTrip: () => void
    deleteTrip: (tripId: string) => void
    updateTrip: (tripId: string, data: Partial<TripContext>) => void
}

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            // Initial State
            users: [],
            currentUserId: null,
            trips: [],
            activeTripId: null,

            // Computed Getters
            getCurrentUser: () => {
                const { users, currentUserId } = get()
                return users.find(u => u.id === currentUserId) || null
            },

            getActiveTrip: () => {
                const { trips, activeTripId } = get()
                return trips.find(t => t.id === activeTripId) || null
            },

            getUserTrips: () => {
                const { trips, currentUserId } = get()
                return trips.filter(t => t.user_id === currentUserId)
            },

            // Actions
            setCurrentUser: (userId) => {
                set({ currentUserId: userId, activeTripId: null })
            },

            createUser: (name) => {
                const newUser: UserProfile = {
                    id: generateId(),
                    name,
                    avatar_color: `hsl(${Math.random() * 360}, 70%, 60%)`,
                    defaults: {
                        food_preference: 'flexible',
                        mobility: 'medium',
                        pace: 'balanced',
                        interests: [],
                        transport_mode_preference: 'flexible',
                    },
                }
                set(state => ({
                    users: [...state.users, newUser],
                    currentUserId: newUser.id,
                }))
            },

            updateProfile: (userId, data) => {
                set(state => ({
                    users: state.users.map(u =>
                        u.id === userId
                            ? { ...u, defaults: { ...u.defaults, ...data } }
                            : u
                    ),
                }))
            },

            setActiveTrip: (tripId) => {
                set({ activeTripId: tripId })
            },

            createTrip: () => {
                const currentUser = get().getCurrentUser()
                if (!currentUser) return

                const newTrip = createBlankTrip(currentUser.id, currentUser.defaults)
                set(state => ({
                    trips: [...state.trips, newTrip],
                    activeTripId: newTrip.id,
                }))
            },

            deleteTrip: (tripId) => {
                set(state => {
                    const newTrips = state.trips.filter(t => t.id !== tripId)
                    const newActiveTripId = state.activeTripId === tripId
                        ? (newTrips.find(t => t.user_id === state.currentUserId)?.id || null)
                        : state.activeTripId
                    return { trips: newTrips, activeTripId: newActiveTripId }
                })
            },

            updateTrip: (tripId, data) => {
                set(state => ({
                    trips: state.trips.map(t => {
                        if (t.id !== tripId) return t

                        const updated = { ...t, ...data }

                        // Auto-update trip name based on dates
                        if (data.dates) {
                            updated.name = formatDateRange(data.dates.from, data.dates.to)
                        }

                        // Smart logic: If elders checked, set mobility to low
                        if (data.family_composition?.has_elders && t.mobility !== 'low') {
                            updated.mobility = 'low'
                        }

                        // Smart logic: If own_vehicle to Kodai, auto-set transport_in_city
                        if (data.mode_to_kodai === 'own_vehicle') {
                            updated.transport_in_city = 'own_vehicle'
                        }

                        return updated
                    }),
                }))
            },
        }),
        {
            name: 'trip-dashboard-storage',
            // Initialize with mock users on first load
            onRehydrateStorage: () => (state) => {
                if (state && state.users.length === 0) {
                    const mockUsers = generateMockUsers()
                    state.users = mockUsers
                    state.currentUserId = mockUsers[0]?.id || null
                }
            },
        }
    )
)

// Initialize store on first import if empty
const initStore = () => {
    const state = useUserStore.getState()
    if (state.users.length === 0) {
        const mockUsers = generateMockUsers()
        useUserStore.setState({
            users: mockUsers,
            currentUserId: mockUsers[0]?.id || null
        })
    }
}

initStore()
