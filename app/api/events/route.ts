import { getSession } from "@/lib/auth-session";
import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`));

      unsubscribe = subscribe((table) => {
        controller.enqueue(encoder.encode(`data: ${table}\n\n`));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
