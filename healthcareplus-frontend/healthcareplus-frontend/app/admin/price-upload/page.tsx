import { redirect } from "next/navigation";

// Price upload now lives inside Admin → Labs. This tiny redirect only exists so an old
// copy of this page can never break the build. You can delete this whole folder.
export default function PriceUploadMoved() {
  redirect("/admin/labs");
}
