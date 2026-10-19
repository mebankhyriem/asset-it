import { redirect } from "next/navigation";

// Transfer requests are tracked as requests with type='Transfer'.
// The request detail page at /requests/[id] shows the full transfer info and approval timeline.
export default function TransferDetailPage({ params }: { params: { id: string } }) {
  redirect(`/requests/${params.id}`);
}
