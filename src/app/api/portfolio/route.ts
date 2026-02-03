import { NextRequest, NextResponse } from "next/server";
import { fetchPortfolio } from "@/services/portfolio";

/**
 * POST /api/portfolio
 * BFF 层：服务端调用 Alchemy SDK，前端不直接接触密钥
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Invalid address" },
        { status: 400 }
      );
    }

    const assets = await fetchPortfolio({ address });
    return NextResponse.json({ assets });
  } catch (error) {
    console.error("[api/portfolio] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
