import { LazyMotion, MotionConfig } from 'motion/react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import DeckDetail from '../pages/DeckDetail.tsx'
import Decks from '../pages/Decks.tsx'
import Exercises from '../pages/Exercises.tsx'
import ExerciseRun from '../pages/exercises/ExerciseRun.tsx'
import ExerciseSet from '../pages/exercises/ExerciseSet.tsx'
import Home from '../pages/Home.tsx'
import Install from '../pages/Install.tsx'
import Learn from '../pages/Learn.tsx'
import MyWordForm from '../pages/my-words/MyWordForm.tsx'
import Notebook from '../pages/Notebook.tsx'
import NotFound from '../pages/NotFound.tsx'
import Review from '../pages/Review.tsx'
import Search from '../pages/Search.tsx'
import SelfStudy from '../pages/SelfStudy.tsx'
import Settings from '../pages/Settings.tsx'
import Stats from '../pages/Stats.tsx'
import WordDetail from '../pages/WordDetail.tsx'
import AppLayout from './AppLayout.tsx'
import DeepLinkGate from './DeepLinkGate.tsx'
import NotificationEffects from './NotificationEffects.tsx'
import SettingsEffects from './SettingsEffects.tsx'
import './layout.css'
import '../components/components.css'
import '../components/quiz/quiz.css'
import '../pages/pages.css'
import '../pages/learn/learn.css'
import '../pages/review/review.css'
import '../pages/my-words/my-words.css'
import '../pages/self-study/self-study.css'
import '../pages/exercises/exercises.css'
import '../pages/exercises/run/run.css'
import '../pages/home/home.css'
import '../pages/install/install.css'
import '../pages/stats/stats.css'
import '../pages/settings/settings.css'

// Motion's feature bundle (with layout animations) is a separate chunk, fetched right after start.
const loadMotionFeatures = () => import('./motionFeatures.ts').then((m) => m.default)

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <BrowserRouter>
          <SettingsEffects />
          <NotificationEffects />
          <DeepLinkGate>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="decks" element={<Decks />} />
                <Route path="decks/:deckId" element={<DeckDetail />} />
                <Route path="words/:wordId" element={<WordDetail />} />
                <Route path="search" element={<Search />} />
                <Route path="tu-hoc" element={<SelfStudy />} />
                <Route path="bai-tap" element={<Exercises />} />
                <Route path="bai-tap/cau-sai" element={<ExerciseRun retry />} />
                <Route path="bai-tap/:setId" element={<ExerciseSet />} />
                <Route path="bai-tap/:setId/lam" element={<ExerciseRun />} />
                <Route path="my-words" element={<Navigate to="/tu-hoc" replace />} />
                <Route path="my-words/new" element={<MyWordForm />} />
                <Route path="my-words/:wordId/edit" element={<MyWordForm />} />
                <Route path="learn" element={<Learn />} />
                <Route path="review" element={<Review />} />
                <Route path="notebook" element={<Notebook />} />
                <Route path="stats" element={<Stats />} />
                <Route path="settings" element={<Settings />} />
                <Route path="install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </DeepLinkGate>
        </BrowserRouter>
      </LazyMotion>
    </MotionConfig>
  )
}
