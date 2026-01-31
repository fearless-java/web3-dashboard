import { NextRequest, NextResponse } from "next/server";
import { fetchTotalGasSpent } from "@/services/gas";

/**
 * GET /api/gas-spent?address=0x...
 * 服务端代理请求 Etherscan，Key 从环境变量读取（ETHERSCAN_API_KEY 或 NEXT_PUBLIC_ETHERSCAN_API_KEY），不暴露到前端。
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || address.length < 40) {
    return NextResponse.json(
      { error: "Missing or invalid address" },
      { status: 400 }
    );
  }

  try {
    const totalGasSpent = await fetchTotalGasSpent(address);
    return NextResponse.json({ totalGasSpent });
  } catch (error) {
    console.error("[api/gas-spent]", error);
    return NextResponse.json({ totalGasSpent: "0" });
  }
}
