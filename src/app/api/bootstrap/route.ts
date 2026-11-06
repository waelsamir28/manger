import { getBootstrap } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getBootstrap();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل البيانات";
    return Response.json({ ok: false, message }, { status: 500 });
  }
}
