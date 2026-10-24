import { redirect } from "next/navigation";

// Bulk price upload now lives inside the admin dashboard (/admin/labs).
export default function PriceUploadRedirect() {
  redirect("/admin/labs");
}
