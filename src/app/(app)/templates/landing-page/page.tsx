import { redirect } from "next/navigation"

export default function LandingPageBuilderPage() {
  redirect("/templates?tab=landing-page")
}
