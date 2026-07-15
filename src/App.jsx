import { HashRouter, Routes, Route } from 'react-router-dom'
import { Web3Provider } from './context/Web3Context'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Home from './pages/Home'
import Garage from './pages/Garage'
import RaceArena from './pages/RaceArena'
import Leaderboard from './pages/Leaderboard'
import Rewards from './pages/Rewards'
import Stats from './pages/Stats'

export default function App() {
  return (
    <Web3Provider>
      <HashRouter>
        <div className="app-shell">
          <Sidebar />
          <div className="main-col">
            <TopBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/garage" element={<Garage />} />
              <Route path="/race" element={<RaceArena />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/stats" element={<Stats />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </Web3Provider>
  )
}
