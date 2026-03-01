import type { Config } from "@netlify/functions";

interface NocodoRecord {
  Id: number;
  Title?: string;
  Content?: string;
  Completed?: boolean;
  CreatedAt?: string;
}

interface NocodbListResponse {
  list: NocodoRecord[];
  pageInfo: { totalRows: number };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function sanitizeRecord(row: NocodoRecord) {
  return {
    id: row.Id,
    title: row.Title || "",
    content: row.Content || "",
    completed: Boolean(row.Completed),
    createdAt: row.CreatedAt || "",
  };
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const baseUrl = Netlify.env.get("NOCODB_BASE_URL");
  const tableId = Netlify.env.get("NOCODB_ROADMAP_TABLE_ID");
  const apiToken = Netlify.env.get("NOCODB_API_TOKEN");

  if (!baseUrl || !tableId || !apiToken) {
    console.error("Missing NocoDB env vars");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  try {
    const url = new URL(req.url);
    const showAll = url.searchParams.get("all") === "true";

    const params = new URLSearchParams({
      sort: "-CreatedAt",
      limit: showAll ? "100" : "1",
      fields: "Id,Title,Content,Completed,CreatedAt",
    });

    const apiUrl = `${baseUrl}/api/v2/tables/${tableId}/records?${params}`;

    const res = await fetch(apiUrl, {
      headers: {
        "xc-token": apiToken,
      },
    });

    if (!res.ok) {
      console.error("NocoDB API error:", res.status, await res.text());
      return jsonResponse({ error: "Failed to fetch roadmap" }, 502);
    }

    const data = (await res.json()) as NocodbListResponse;
    const records = (data.list || []).map(sanitizeRecord);

    return jsonResponse({
      records,
      total: data.pageInfo?.totalRows || records.length,
    });
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
};

export const config: Config = {
  path: "/api/roadmap",
};
