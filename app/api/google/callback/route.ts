
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { encryptGoogleToken } from "@/lib/google-encryption";



export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  const redirect = (status: string) =>
    NextResponse.redirect(
      new URL(`/entrainements?google=${status}`, request.url)
    );

  // Vérification de la sécurité OAuth
  if (!state || !savedState || state !== savedState) {
    const response = redirect("invalid_state");
    response.cookies.delete("google_oauth_state");
    return response;
  }

  if (url.searchParams.get("error")) {
    const response = redirect("denied");
    response.cookies.delete("google_oauth_state");
    return response;
  }

  if (!code) {
    const response = redirect("missing_code");
    response.cookies.delete("google_oauth_state");
    return response;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError || !user) {
    const response = redirect("login_required");
    response.cookies.delete("google_oauth_state");
    return response;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return redirect("configuration_error");
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "http://localhost:3000/api/google/callback"
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return redirect("token_error");
    }

    // Conserver l'ancien refresh token si Google n'en fournit pas un nouveau
    const { data: existing, error: readError } = await supabase
      .from("google_calendar_tokens")
      .select("refresh_token_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError) {
      return redirect("database_error");
    }

    const refreshToken = tokens.refresh_token
      ? encryptGoogleToken(tokens.refresh_token)
      : existing?.refresh_token_encrypted;

    if (!refreshToken) {
      return redirect("refresh_token_missing");
    }

    const { error: saveError } = await supabase
      .from("google_calendar_tokens")
      .upsert(
        {
          user_id: user.id,
          access_token_encrypted: encryptGoogleToken(tokens.access_token),
          refresh_token_encrypted: refreshToken,
          expiry_date: tokens.expiry_date ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (saveError) {
      return redirect("database_error");
    }

    const response = redirect("connected");
    response.cookies.delete("google_oauth_state");
    return response;

  } catch (error) {
    console.error("Erreur connexion Google :", error);
    return redirect("connection_error");
  }
}
