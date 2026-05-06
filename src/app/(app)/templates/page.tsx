import { Suspense } from "react"
import { TemplatesTabs } from "@/components/templates/templates-tabs"

export default function TemplatesPage() {
  return (
    <Suspense fallback={null}>
      <TemplatesTabs />
    </Suspense>
  )
}
