import { Suspense } from "react"
import { ComposerView } from "@/components/composer/composer-view"

export default function EmailGeneratorPage() {
  return (
    <Suspense fallback={null}>
      <ComposerView />
    </Suspense>
  )
}
