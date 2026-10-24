import { BrowserRouter, Route, Routes } from 'react-router'
import DeckDetail from '../pages/DeckDetail.tsx'
import Decks from '../pages/Decks.tsx'
import Home from '../pages/Home.tsx'
import NotFound from '../pages/NotFound.tsx'
import Placeholder from '../pages/Placeholder.tsx'
import Search from '../pages/Search.tsx'
import WordDetail from '../pages/WordDetail.tsx'
import AppLayout from './AppLayout.tsx'
import SettingsEffects from './SettingsEffects.tsx'
import './layout.css'
import '../components/components.css'
import '../pages/pages.css'

export default function App() {
  return (
    <BrowserRouter>
      <SettingsEffects />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="decks" element={<Decks />} />
          <Route path="decks/:deckId" element={<DeckDetail />} />
          <Route path="words/:wordId" element={<WordDetail />} />
          <Route path="search" element={<Search />} />
          <Route path="learn" element={<Placeholder title="Học" />} />
          <Route path="review" element={<Placeholder title="Ôn tập" />} />
          <Route path="notebook" element={<Placeholder title="Sổ tay" />} />
          <Route path="settings" element={<Placeholder title="Cài đặt" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
