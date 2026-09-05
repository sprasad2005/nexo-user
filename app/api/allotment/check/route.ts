import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pan = searchParams.get("pan");
    const clientId = searchParams.get("clientId");

    if (!pan || !clientId) {
      return NextResponse.json({ success: false, error: "Missing PAN or Client ID" }, { status: 400 });
    }

    const url = "https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query?type=pan";
    const headers = {
      "reqparam": pan,
      "client_id": clientId,
      "Access-Control-Allow-Origin": "*",
    };

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    if (res.status === 200) {
      const data = await res.json();
      
      // KFintech returns 200 if the PAN is found, even if shares allotted is 0.
      // We must check if All_Shares > 0 to confirm actual allotment.
      const isAllotted = data && data.data && data.data.length > 0 && parseInt(data.data[0].All_Shares || "0") > 0;
      
      return NextResponse.json({
        success: true,
        status: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
        data,
      });
    } else if (res.status === 404) {
      return NextResponse.json({
        success: true,
        status: "NOT_ALLOTTED",
      });
    } else {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {}
      return NextResponse.json({
        success: false,
        error: `Unexpected response code: ${res.status}`,
        details: errorData,
      }, { status: res.status });
    }
  } catch (error: any) {
    console.error("Error checking allotment:", error);
    return NextResponse.json({ success: false, error: "Network or Server Error" }, { status: 500 });
  }
}
