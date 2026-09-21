import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Web3Provider } from './context/Web3Context'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Rewards from './pages/Rewards'
import Stats from './pages/Stats'

// The 3D game engine (three.js) is sizeable — only fetch it once the player
// actually opens the Garage or Race Arena, not on the initial page load.
const Garage = lazy(() => import('./pages/Garage'))
const RaceArena = lazy(() => import('./pages/RaceArena'))

function RouteLoading() {
  return <div className="route-loading">Loading…</div>
}

export default function App() {
  return (
    <Web3Provider>
      <HashRouter>
        <div className="app-shell">
          <Sidebar />
          <div className="main-col">
            <TopBar />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/garage" element={<Garage />} />
                <Route path="/race" element={<RaceArena />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/stats" element={<Stats />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </HashRouter>
    </Web3Provider>
  )
}
