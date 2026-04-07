import { NextResponse } from "next/server";

// Temporary debug endpoint — logs any incoming POST
let lastWebhook: { time: string; body: string } | null = null;

export async function POST(request: Request) {
  const body = await request.text();
  lastWebhook = { time: new Date().toISOString(), body: body.slice(0, 500) };
  console.log("[Debug Webhook] Received:", body.slice(0, 500));
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ lastWebhook });
}
