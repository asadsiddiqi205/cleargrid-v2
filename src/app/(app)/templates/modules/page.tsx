import { LibraryTabs } from "@/components/templates/library-tabs"
import { ModulesView } from "@/components/templates/modules-view"

export default function ModulesPage() {
  return (
    <div className="flex h-full flex-col">
      <LibraryTabs />
      <div className="flex-1 min-h-0">
        <ModulesView />
      </div>
    </div>
  )
}
