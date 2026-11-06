import { getBootstrap, runAction } from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const extra = await runAction(body);
    const data = await getBootstrap();
    return Response.json({ ok: true, data, extra });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تنفيذ العملية";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
