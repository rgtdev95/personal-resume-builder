import { useState, useSyncExternalStore } from 'react'
import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, ChevronRight, FileText, Layers, Plus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { ProfileTab } from '@/components/ProfileTab'
import { SourcesTab } from '@/components/SourcesTab'
import { TrackerTab } from '@/components/TrackerTab'
import { VisualizeTab } from '@/components/VisualizeTab'
import { BuilderTab } from '@/components/BuilderTab'

const sections = [
  { value: 'tracker', label: 'Applications', icon: BriefcaseBusiness, description: 'Keep every opportunity and next step in view.' },
  { value: 'builder', label: 'Resume & cover letter', icon: FileText, description: 'Turn your experience into documents tailored to the role.' },
  { value: 'visualize', label: 'Application insights', icon: ChartNoAxesCombined, description: 'See how your applications move through the hiring process.' },
  { value: 'sources', label: 'Work history', icon: Layers, description: 'Your experience, projects, and achievements. The foundation for every resume.' },
  { value: 'profile', label: 'Your profile', icon: UserRound, description: 'Manage the personal details and education used in your documents.' },
]
const TAB_CONTENT_CLASS = 'workspace-panel data-[state=inactive]:hidden'
const mobileNavigationQuery = '(max-width: 767px)'
function subscribeViewport(callback: () => void) {
  const media = window.matchMedia(mobileNavigationQuery)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function App() {
  const [tab, setTab] = useState('tracker')
  const [builderLoadId, setBuilderLoadId] = useState<number | null>(null)
  const [trackerRefreshSignal, setTrackerRefreshSignal] = useState(0)
  const [builderLoadRequest, setBuilderLoadRequest] = useState(0)
  const mobileNavigation = useSyncExternalStore(subscribeViewport, () => window.matchMedia(mobileNavigationQuery).matches, () => false)
  const section = sections.find((item) => item.value === tab)!

  function openBuilderFor(id: number) {
    setBuilderLoadId(id)
    setBuilderLoadRequest((value) => value + 1)
    setTab('builder')
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Tabs value={tab} onValueChange={setTab} orientation={mobileNavigation ? 'horizontal' : 'vertical'} className="app-workspace">
        <aside className="workspace-sidebar">
          <div className="workspace-brand"><span className="brand-mark"><FileText aria-hidden="true" /></span><span>Resume Builder<span className="brand-detail">A place for your next chapter</span></span></div>
          <Button className="sidebar-create" onClick={() => setTab('builder')}><Plus aria-hidden="true" />Create a resume<ArrowUpRight aria-hidden="true" /></Button>
          <TabsList className="workspace-navigation" aria-label="Workspace sections" loop>
            {sections.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="workspace-nav-item"><Icon aria-hidden="true" />{label}</TabsTrigger>
            ))}
          </TabsList>
          <div className="sidebar-note"><span className="workspace-avatar"><UserRound aria-hidden="true" /></span><div>Personal workspace<span>Your profile & experience</span></div><button aria-label="Open your profile" onClick={() => setTab('profile')}><ChevronRight aria-hidden="true" /></button></div>
        </aside>
        <main id="main-content" className="workspace-main" tabIndex={-1}>
          <div className="workspace-topbar"><span>My workspace<ChevronRight aria-hidden="true" /><span>{section.label}</span></span><span className="workspace-local"><span />Local workspace</span></div>
          <header className="workspace-heading"><div><h1>{section.label}</h1><p>{section.description}</p></div>{tab === 'tracker' && <Button variant="outline" onClick={() => setTab('visualize')}><ChartNoAxesCombined aria-hidden="true" />View insights</Button>}</header>
          <TabsContent value="profile" forceMount className={TAB_CONTENT_CLASS}><ProfileTab /></TabsContent>
          <TabsContent value="sources" forceMount className={TAB_CONTENT_CLASS}><SourcesTab /></TabsContent>
          <TabsContent value="tracker" forceMount className={TAB_CONTENT_CLASS}><TrackerTab onGenerateFor={openBuilderFor} refreshSignal={trackerRefreshSignal} /></TabsContent>
          <TabsContent value="visualize" forceMount className={TAB_CONTENT_CLASS}><VisualizeTab active={tab === 'visualize'} /></TabsContent>
          <TabsContent value="builder" forceMount className={TAB_CONTENT_CLASS}>
            <BuilderTab active={tab === 'builder'} loadApplicationId={builderLoadId} loadRequest={builderLoadRequest} onGenerated={() => setTrackerRefreshSignal((v) => v + 1)} onViewExisting={() => setTab('tracker')} />
          </TabsContent>
        </main>
      </Tabs>
      <Toaster />
    </>
  )
}
export default App
