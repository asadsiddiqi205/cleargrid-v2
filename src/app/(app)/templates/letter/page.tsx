import { redirect } from "next/navigation"

export default function LetterBuilderPage() {
  redirect("/templates?tab=letter")
}
