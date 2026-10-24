import { BrowserRouter, Route, Routes } from 'react-router'
import DeckDetail from '../pages/DeckDetail.tsx'
import Decks from '../pages/Decks.tsx'
import Home from '../pages/Home.tsx'
import Learn from '../pages/Learn.tsx'
import MyWordForm from '../pages/my-words/MyWordForm.tsx'
import MyWords from '../pages/MyWords.tsx'
import Notebook from '../pages/Notebook.tsx'
import NotFound from '../pages/NotFound.tsx'
import Placeholder from '../pages/Placeholder.tsx'
import Review from '../pages/Review.tsx'
import Search from '../pages/Search.tsx'
import Stats from '../pages/Stats.tsx'
import WordDetail from '../pages/WordDetail.tsx'
import AppLayout from './AppLayout.tsx'
import SettingsEffects from './SettingsEffects.tsx'
import './layout.css'
import '../components/components.css'
import '../components/quiz/quiz.css'
import '../pages/pages.css'
import '../pages/learn/learn.css'
import '../pages/review/review.css'
import '../pages/my-words/my-words.css'
import '../pages/home/home.css'
import '../pages/stats/stats.css'

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
          <Route path="my-words" element={<MyWords />} />
          <Route path="my-words/new" element={<MyWordForm />} />
          <Route path="my-words/:wordId/edit" element={<MyWordForm />} />
          <Route path="learn" element={<Learn />} />
          <Route path="review" element={<Review />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Placeholder title="Cài đặt" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
