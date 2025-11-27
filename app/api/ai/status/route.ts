import { NextResponse } from "next/server";

// GET - Verificar se a API key da OpenAI está configurada
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;

  return NextResponse.json({
    configured: !!apiKey && apiKey.length > 0,
  });
}
