// External organizations module removed in redesign.
export async function GET() {
  return Response.json({ organizations: [] });
}
