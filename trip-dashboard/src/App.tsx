import './index.css'
import { Sidebar } from './components/layout/Sidebar'
import { TripConfigurator } from './components/dashboard/TripConfigurator'

function App() {
  return (
    <Sidebar>
      <TripConfigurator />
    </Sidebar>
  )
}

export default App
