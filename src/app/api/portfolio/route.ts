import { NextRequest, NextResponse } from "next/server";
import { fetchPortfolioFromCovalent } from "@/services/covalent";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Invalid address" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const assets = await fetchPortfolioFromCovalent(address);
    const duration = Date.now() - startTime;

    console.log(`[api/portfolio] Covalent 总耗时: ${duration}ms, 资产数: ${assets.length}`);

    return NextResponse.json({ 
      assets,
      meta: {
        source: 'covalent',
        duration,
        count: assets.length,
      }
    });
  } catch (error) {
    console.error("[api/portfolio] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
