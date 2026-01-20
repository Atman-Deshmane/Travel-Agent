import type { UserProfile, TripContext } from '../store/useUserStore'
import { generateId } from '../lib/utils'

const AVATAR_COLORS = [
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
]

export function generateMockUsers(): UserProfile[] {
    return [
        {
            id: generateId(),
            name: 'Arjun Sharma',
            avatar_color: AVATAR_COLORS[0],
            defaults: {
                origin_city: 'Chennai',
                food_preference: 'flexible',
                mobility: 'high',
                pace: 'balanced',
                interests: ['Nature', 'Trekking', 'Photography'],
                transport_mode_preference: 'own_vehicle',
            },
        },
        {
            id: generateId(),
            name: 'Priya Menon',
            avatar_color: AVATAR_COLORS[1],
            defaults: {
                origin_city: 'Bangalore',
                food_preference: 'veg',
                mobility: 'medium',
                pace: 'chill',
                interests: ['Nature', 'History', 'Food'],
                transport_mode_preference: 'flexible',
            },
        },
    ]
}

export function createBlankTrip(userId: string, userDefaults: UserProfile['defaults']): TripContext {
    return {
        id: generateId(),
        user_id: userId,
        name: 'New Trip',
        created_at: Date.now(),

        // Required fields start as null - user must select
        dates: { from: null, to: null },
        arrival_time: null,
        departure_time: null,
        group_type: null,
        family_composition: { has_kids: false, has_elders: false },

        // Defaults from user profile
        origin_city: userDefaults.origin_city || '',
        mode_to_kodai: 'own_vehicle',
        transport_in_city: userDefaults.transport_mode_preference || 'flexible',

        accommodation: {
            status: 'undecided',
            undecided_cluster: 'Vattakanal',
        },

        food_preference: userDefaults.food_preference || 'flexible',
        mobility: userDefaults.mobility || 'medium',
        pace: userDefaults.pace || 'balanced',
        // Interests start empty - user must select at least one
        interests: [],
    }
}

export const INTEREST_OPTIONS = [
    'Nature', 'Trekking', 'Photography', 'History',
    'Food', 'Shopping', 'Adventure', 'Spiritual',
    'Relaxation', 'Wildlife'
]

export const CLUSTER_OPTIONS = [
    { id: 'town-center', name: 'Town Center', description: 'Near lake, shops, restaurants' },
    { id: 'vattakanal', name: 'Vattakanal', description: "Creator's Pick - Quiet, scenic", featured: true },
    { id: 'forest-road', name: 'Forest Road', description: 'Peaceful, nature immersion' },
    { id: 'coakers-walk', name: "Coaker's Walk", description: 'Central, easy access' },
]
