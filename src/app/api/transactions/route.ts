import { NextRequest, NextResponse } from "next/server";
import { fetchTransactions } from "@/services/transactions";
import type { TransactionType } from "@/types/transactions";

/**
 * GET /api/transactions?address=0x...&type=all&pageKey=...
 * BFF 层：服务端调用 Alchemy SDK 获取交易历史
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const type = (searchParams.get("type") || "all") as TransactionType;
  const pageKey = searchParams.get("pageKey") || undefined;
  const maxCount = parseInt(searchParams.get("maxCount") || "100", 10);

  if (!address) {
    return NextResponse.json(
      { error: "Missing address" },
      { status: 400 }
    );
  }

  try {
    const result = await fetchTransactions({ 
      address, 
      type,
      pageKey,
      maxCount
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/transactions] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
