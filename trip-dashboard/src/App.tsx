import { useState } from 'react'
import './index.css'
import { Sidebar } from './components/layout/Sidebar'
import { TripConfigurator } from './components/dashboard/TripConfigurator'
import { PlacesExplorer } from './pages/PlacesExplorer'
import { ItineraryBuilder } from './pages/ItineraryBuilder'
import { ChatMode } from './pages/ChatMode'
import { useUserStore } from './store/useUserStore'
import { Bot, Settings } from 'lucide-react'

type AppMode = 'ai' | 'manual'
type ManualView = 'configurator' | 'explorer' | 'itinerary'

function App() {
  // Top-level mode toggle
  const [mode, setMode] = useState<AppMode>('ai')

  // Manual mode navigation
  const [manualView, setManualView] = useState<ManualView>('configurator')
  const [explorerData, setExplorerData] = useState<{
    interests: string[]
    difficulty: string
  } | null>(null)
  const [itineraryData, setItineraryData] = useState<{
    selectedIds: string[]
    userConfig: { num_days: number; pace: string; hotel_cluster: string }
    allPlaces: any[]
  } | null>(null)

  const { getActiveTrip } = useUserStore()
  const activeTrip = getActiveTrip()

  const handleFetchPlaces = () => {
    if (!activeTrip) return

    setExplorerData({
      interests: activeTrip.interests || ['Nature', 'Sightseeing'],
      difficulty: activeTrip.mobility || 'medium'
    })
    setManualView('explorer')
  }

  const handleBuildItinerary = (selectedIds: string[], _keptFlaggedIds: string[], allPlaces: any[] = []) => {
    if (!activeTrip) return

    // Calculate number of days from trip dates
    const from = activeTrip.dates.from ? new Date(activeTrip.dates.from) : new Date()
    const to = activeTrip.dates.to ? new Date(activeTrip.dates.to) : new Date()
    const numDays = Math.ceil(Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

    setItineraryData({
      selectedIds,
      userConfig: {
        num_days: numDays,
        pace: activeTrip.pace || 'medium',
        hotel_cluster: 'Town Center' // Default, could be derived from accommodation
      },
      allPlaces
    })
    setManualView('itinerary')
  }

  const handleBackToConfigurator = () => {
    setManualView('configurator')
  }

  const handleBackToExplorer = () => {
    setManualView('explorer')
  }

  // AI Mode
  if (mode === 'ai') {
    return (
      <ChatMode onSwitchToManual={() => setMode('manual')} />
    )
  }

  // Manual Mode Views
  if (manualView === 'explorer' && explorerData && activeTrip) {
    return (
      <PlacesExplorer
        userProfile={explorerData}
        tripConfig={{
          numDays: (() => {
            const from = activeTrip.dates.from ? new Date(activeTrip.dates.from) : new Date()
            const to = activeTrip.dates.to ? new Date(activeTrip.dates.to) : new Date()
            const diffTime = Math.abs(to.getTime() - from.getTime())
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          })(),
          pace: activeTrip.pace || 'medium'
        }}
        onBack={handleBackToConfigurator}
        onBuildItinerary={handleBuildItinerary}
      />
    )
  }

  if (manualView === 'itinerary' && itineraryData) {
    // Get user and trip name for saving
    const userName = activeTrip?.name?.split("'s")[0] || 'Guest'
    const tripName = activeTrip?.name?.split("'s ")[1] || 'Trip'

    return (
      <ItineraryBuilder
        selectedPlaceIds={itineraryData.selectedIds}
        userConfig={itineraryData.userConfig}
        onBack={handleBackToExplorer}
        allPlaces={itineraryData.allPlaces}
        userName={userName}
        tripName={tripName}
      />
    )
  }

  // Default: Manual Mode Configurator with Sidebar + Mode Toggle
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mode Toggle Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setMode('ai')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-600 hover:text-slate-900"
            >
              <Bot size={16} />
              AI Chat
            </button>
            <button
              onClick={() => setMode('manual')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all bg-white text-indigo-600 shadow-sm"
            >
              <Settings size={16} />
              Manual Mode
            </button>
          </div>

          <div className="text-sm text-slate-500">
            Kodaikanal Trip Planner
          </div>
        </div>
      </div>

      {/* Content */}
      <Sidebar>
        <TripConfigurator onFetchPlaces={handleFetchPlaces} />
      </Sidebar>
    </div>
  )
}

export default App
