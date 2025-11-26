import { checkForUpdates } from "@/lib/version";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const versionInfo = await checkForUpdates();
    return NextResponse.json(versionInfo);
  } catch (error) {
    console.error("Error checking for updates:", error);
    return NextResponse.json(
      { error: "Failed to check for updates" },
      { status: 500 }
    );
  }
}
