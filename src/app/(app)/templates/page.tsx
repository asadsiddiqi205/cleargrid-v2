import { Suspense } from "react"
import { LibraryTabs } from "@/components/templates/library-tabs"
import { TemplatesTabs } from "@/components/templates/templates-tabs"

export default function TemplatesPage() {
  return (
    <div className="flex h-full flex-col">
      <LibraryTabs />
      <div className="flex-1 min-h-0">
        <Suspense fallback={null}>
          <TemplatesTabs />
        </Suspense>
      </div>
    </div>
  )
}
