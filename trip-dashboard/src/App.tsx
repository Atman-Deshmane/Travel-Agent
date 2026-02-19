import { useState } from 'react'
import './index.css'
import { AppLayout } from './components/layout/AppLayout'
import { ModeToggle } from './components/layout/ModeToggle'
import { Sidebar } from './components/layout/Sidebar'
import { TripConfigurator } from './components/dashboard/TripConfigurator'
import { PlacesExplorer } from './pages/PlacesExplorer'
import { ItineraryBuilder } from './pages/ItineraryBuilder'
import { ChatMode } from './pages/ChatMode'
import { PlacesDatabase } from './pages/PlacesDatabase'
import { useUserStore } from './store/useUserStore'

type MainTab = 'plan' | 'explore'
type PlanMode = 'manual' | 'ai'
type ManualView = 'configurator' | 'explorer' | 'itinerary'

function App() {
  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('plan')

  // Plan Trip mode toggle (Manual first by default)
  const [planMode, setPlanMode] = useState<PlanMode>('manual')

  // Manual mode navigation
  const [manualView, setManualView] = useState<ManualView>('configurator')
  const [explorerData, setExplorerData] = useState<{
    interests: string[]
    difficulty: string
  } | null>(null)
  const [itineraryData, setItineraryData] = useState<{
    selectedIds: string[]
    userConfig: {
      num_days: number
      pace: string
      hotel_cluster: string
      hotel_location?: { lat: number; lng: number; name: string }
      food_preference?: string
      start_date?: string
    }
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

    // Get hotel location from accommodation
    const hotelLocation = activeTrip.accommodation?.booked_location?.lat
      ? {
        lat: activeTrip.accommodation.booked_location.lat,
        lng: activeTrip.accommodation.booked_location.lng,
        name: activeTrip.accommodation.booked_location.name || 'Hotel'
      }
      : undefined

    setItineraryData({
      selectedIds,
      userConfig: {
        num_days: numDays,
        pace: activeTrip.pace || 'medium',
        hotel_cluster: activeTrip.accommodation?.undecided_cluster || 'Town Center',
        hotel_location: hotelLocation,
        food_preference: activeTrip.food_preference || 'flexible',
        start_date: activeTrip.dates.from ? new Date(activeTrip.dates.from).toISOString() : undefined
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

  // Render content based on main tab
  const renderContent = () => {
    // EXPLORE TAB - Show places database
    if (mainTab === 'explore') {
      return <PlacesDatabase />
    }

    // PLAN TAB
    // AI Chat mode
    if (planMode === 'ai') {
      return <ChatMode />
    }

    // Manual mode - different views
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

    // Default: Manual mode configurator with Sidebar
    return (
      <Sidebar>
        <TripConfigurator onFetchPlaces={handleFetchPlaces} />
      </Sidebar>
    )
  }

  return (
    <AppLayout
      mainTab={mainTab}
      onMainTabChange={setMainTab}
      secondaryNav={
        mainTab === 'plan' ? (
          <ModeToggle mode={planMode} onModeChange={setPlanMode} />
        ) : null
      }
    >
      {renderContent()}
    </AppLayout>
  )
}

export default App
