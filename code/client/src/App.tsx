import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { ProfileTab } from '@/components/ProfileTab'
import { SourcesTab } from '@/components/SourcesTab'
import { TrackerTab } from '@/components/TrackerTab'
import { VisualizeTab } from '@/components/VisualizeTab'
import { BuilderTab } from '@/components/BuilderTab'

// forceMount + data-[state=inactive]:hidden (instead of Radix's default
// unmount-when-inactive) so switching tabs never wipes in-progress state —
// e.g. a half-filled Builder draft — matching the old app, where tabs were
// just CSS-hidden <section>s that never left the DOM.
const TAB_CONTENT_CLASS = 'mt-4 data-[state=inactive]:hidden'

function App() {
  const [tab, setTab] = useState('tracker')
  const [builderLoadId, setBuilderLoadId] = useState<number | null>(null)
  const [trackerRefreshSignal, setTrackerRefreshSignal] = useState(0)

  function openBuilderFor(id: number) {
    setBuilderLoadId(id)
    setTab('builder')
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-semibold">Resume Builder &amp; Tracker</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="sources">Work History</TabsTrigger>
          <TabsTrigger value="tracker">Tracker</TabsTrigger>
          <TabsTrigger value="visualize">Visualize</TabsTrigger>
          <TabsTrigger value="builder">Resume / Cover Letter</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" forceMount className={TAB_CONTENT_CLASS}>
          <ProfileTab />
        </TabsContent>
        <TabsContent value="sources" forceMount className={TAB_CONTENT_CLASS}>
          <SourcesTab />
        </TabsContent>
        <TabsContent value="tracker" forceMount className={TAB_CONTENT_CLASS}>
          <TrackerTab onGenerateFor={openBuilderFor} refreshSignal={trackerRefreshSignal} />
        </TabsContent>
        <TabsContent value="visualize" forceMount className={TAB_CONTENT_CLASS}>
          <VisualizeTab active={tab === 'visualize'} />
        </TabsContent>
        <TabsContent value="builder" forceMount className={TAB_CONTENT_CLASS}>
          <BuilderTab
            loadApplicationId={builderLoadId}
            onGenerated={() => setTrackerRefreshSignal((v) => v + 1)}
            onViewExisting={() => setTab('tracker')}
          />
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  )
}

export default App
