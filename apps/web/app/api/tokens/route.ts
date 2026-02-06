import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiToken } from "@/lib/auth/api-token";

// GET /api/tokens - List user's tokens (without revealing the actual token)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokens, error } = await (supabase as any)
    .from("api_tokens")
    .select("id, name, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tokens });
}

// POST /api/tokens - Generate a new API token
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let name = "Desktop App";
  try {
    const body = await request.json();
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      name = body.name.trim();
    }
  } catch {
    // Default name is fine
  }

  const token = generateApiToken();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from("api_tokens").insert({
    user_id: user.id,
    token,
    name,
  }).select("id, name, created_at").single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }

  // Return the raw token ONCE - it won't be shown again
  return NextResponse.json({
    id: data.id,
    name: data.name,
    token,
    created_at: data.created_at,
  });
}

// DELETE /api/tokens - Revoke a token by id
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("id");

  if (!tokenId) {
    return NextResponse.json(
      { error: "Token id required" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("api_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
