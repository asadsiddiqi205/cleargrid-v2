import { Suspense } from "react"
import { ComposerView } from "@/components/composer/composer-view"

export default function NewMessagePage() {
  return (
    <Suspense fallback={null}>
      <ComposerView />
    </Suspense>
  )
}
