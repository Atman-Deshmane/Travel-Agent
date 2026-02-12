import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateMockUsers, createBlankTrip } from '../data/mock_users'
import { formatDateRange, generateId } from '../lib/utils'
import { API_ENDPOINTS } from '../config/api'

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

    // LOGISTICS - Required fields (can be null until user selects)
    dates: { from: Date | null; to: Date | null }
    arrival_time: 'morning' | 'noon' | 'evening' | null
    departure_time: 'morning' | 'noon' | 'evening' | null

    group_type: 'solo' | 'couple' | 'family' | 'friends' | null
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

    // Hydration
    hydrateFromBackend: () => Promise<void>
}

// Helper to deserialize dates from storage (ISO string -> Date)
function deserializeDates(trip: TripContext): TripContext {
    return {
        ...trip,
        dates: {
            from: trip.dates.from ? new Date(trip.dates.from) : null,
            to: trip.dates.to ? new Date(trip.dates.to) : null,
        }
    }
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
                const trip = trips.find(t => t.id === activeTripId)
                if (!trip) return null
                // Ensure dates are Date objects
                return deserializeDates(trip)
            },

            getUserTrips: () => {
                const { trips, currentUserId } = get()
                return trips.filter(t => t.user_id === currentUserId).map(deserializeDates)
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

                        // Deserialize existing trip dates first
                        const existingTrip = deserializeDates(t)
                        const updated = { ...existingTrip, ...data }

                        // Auto-update trip name based on dates
                        if (data.dates) {
                            const fromDate = data.dates.from instanceof Date
                                ? data.dates.from
                                : (data.dates.from ? new Date(data.dates.from) : null)
                            const toDate = data.dates.to instanceof Date
                                ? data.dates.to
                                : (data.dates.to ? new Date(data.dates.to) : null)
                            updated.name = formatDateRange(fromDate, toDate)
                            // Ensure dates are Date objects
                            updated.dates = { from: fromDate, to: toDate }
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

            hydrateFromBackend: async () => {
                try {
                    const response = await fetch(API_ENDPOINTS.dashboardData)
                    if (!response.ok) {
                        console.warn('Failed to fetch backend data')
                        return
                    }

                    const data = await response.json()

                    if (data.users && data.users.length > 0) {
                        // Transform backend user format to frontend UserProfile format
                        const users: UserProfile[] = data.users.map((u: Record<string, unknown>) => ({
                            id: u.user_id as string,
                            name: u.name as string,
                            avatar_color: (u.avatar_color as string) || `hsl(${Math.random() * 360}, 70%, 60%)`,
                            defaults: {
                                origin_city: (u.defaults as Record<string, { value: unknown }>)?.origin_city?.value as string | undefined,
                                food_preference: ((u.defaults as Record<string, { value: unknown }>)?.food_preference?.value as UserProfile['defaults']['food_preference']) || 'flexible',
                                mobility: ((u.defaults as Record<string, { value: unknown }>)?.mobility?.value as UserProfile['defaults']['mobility']) || 'medium',
                                pace: ((u.defaults as Record<string, { value: unknown }>)?.pace?.value as UserProfile['defaults']['pace']) || 'balanced',
                                interests: ((u.defaults as Record<string, { value: unknown }>)?.interests?.value as string[]) || [],
                                transport_mode_preference: ((u.defaults as Record<string, { value: unknown }>)?.transport_mode_preference?.value as UserProfile['defaults']['transport_mode_preference']) || 'flexible',
                            }
                        }))

                        // Transform backend trip format to frontend TripContext format
                        const trips: TripContext[] = data.trips.map((t: Record<string, unknown>) => {
                            const logistics = t.logistics as Record<string, { value: unknown }>
                            const journey = t.journey as Record<string, { value: unknown }>
                            const stay = t.stay as Record<string, { value: unknown }>
                            const preferences = t.preferences as Record<string, { value: unknown }>
                            const dates = logistics?.dates?.value as { from: string | null; to: string | null } || { from: null, to: null }

                            return {
                                id: t.trip_id as string,
                                user_id: t.user_id as string,
                                name: t.name as string,
                                created_at: Date.now(),
                                dates: {
                                    from: dates.from ? new Date(dates.from) : null,
                                    to: dates.to ? new Date(dates.to) : null,
                                },
                                arrival_time: logistics?.arrival_time?.value as TripContext['arrival_time'],
                                departure_time: logistics?.departure_time?.value as TripContext['departure_time'],
                                group_type: logistics?.group_type?.value as TripContext['group_type'],
                                family_composition: (logistics?.family_composition?.value as TripContext['family_composition']) || { has_kids: false, has_elders: false },
                                origin_city: (journey?.origin_city?.value as string) || '',
                                mode_to_kodai: (journey?.mode_to_kodai?.value as TripContext['mode_to_kodai']) || 'own_vehicle',
                                transport_in_city: (journey?.transport_in_city?.value as TripContext['transport_in_city']) || 'flexible',
                                accommodation: (stay?.accommodation?.value as TripContext['accommodation']) || { status: 'undecided', undecided_cluster: 'Vattakanal' },
                                food_preference: (preferences?.food_preference?.value as TripContext['food_preference']) || 'flexible',
                                mobility: (preferences?.mobility?.value as TripContext['mobility']) || 'medium',
                                pace: (preferences?.pace?.value as TripContext['pace']) || 'balanced',
                                interests: (preferences?.interests?.value as string[]) || [],
                            }
                        })

                        // Merge with existing state (backend data takes priority for users that exist)
                        const existingState = get()
                        const existingUserIds = new Set(existingState.users.map(u => u.id))
                        const newUsers = users.filter(u => !existingUserIds.has(u.id))

                        const existingTripIds = new Set(existingState.trips.map(t => t.id))
                        const newTrips = trips.filter(t => !existingTripIds.has(t.id))

                        set(state => ({
                            users: [...state.users, ...newUsers],
                            trips: [...state.trips, ...newTrips],
                            currentUserId: state.currentUserId || (newUsers.length > 0 ? newUsers[0].id : state.currentUserId),
                        }))

                        console.log(`Hydrated ${newUsers.length} users and ${newTrips.length} trips from backend`)
                    }
                } catch (error) {
                    console.warn('Backend hydration failed:', error)
                }
            },
        }),
        {
            name: 'trip-dashboard-storage',
            // Deserialize dates when rehydrating from storage
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Initialize with mock users if empty
                    if (state.users.length === 0) {
                        const mockUsers = generateMockUsers()
                        state.users = mockUsers
                        state.currentUserId = mockUsers[0]?.id || null
                    }

                    // Deserialize dates for all trips
                    state.trips = state.trips.map(trip => deserializeDates(trip))
                }
            },
        }
    )
)

// Initialize store on first import if empty
const initStore = async () => {
    const state = useUserStore.getState()

    // Try to hydrate from backend first
    await state.hydrateFromBackend()

    // If still empty after backend hydration, add mock users
    const newState = useUserStore.getState()
    if (newState.users.length === 0) {
        const mockUsers = generateMockUsers()
        useUserStore.setState({
            users: mockUsers,
            currentUserId: mockUsers[0]?.id || null
        })
    }
}

initStore()
