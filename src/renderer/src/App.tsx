import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Breadcrumb } from '@/components/Breadcrumb'
import { MainContent } from '@/components/MainContent'
import { RightPanel } from '@/components/RightPanel'

export default function App(): JSX.Element {
  const init = useStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-content">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <Breadcrumb />
        <div className="flex min-h-0 flex-1">
          <MainContent />
          <RightPanel />
        </div>
      </div>
    </div>
  )
}
