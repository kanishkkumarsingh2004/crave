import { redirect } from "next/navigation";

/**
 * Root page — redirect directly to login (no public landing page per spec).
 */
export default function RootPage() {
  redirect("/login");
}
