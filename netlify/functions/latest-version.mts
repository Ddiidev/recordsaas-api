import type { Config } from "@netlify/functions";

interface B2AuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

interface B2FileEntry {
  fileName: string;
  action: string;
  fileId: string | null;
}

interface B2ListResponse {
  files: B2FileEntry[];
  nextFileName: string | null;
}

interface B2DownloadAuthResponse {
  authorizationToken: string;
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

function compareSemver(a: string, b: string): number {
  const [aMaj, aMin, aPatch] = a.split(".").map(Number);
  const [bMaj, bMin, bPatch] = b.split(".").map(Number);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPatch - bPatch;
}

async function b2Authorize(
  keyId: string,
  applicationKey: string
): Promise<B2AuthResponse> {
  const credentials = btoa(`${keyId}:${applicationKey}`);
  const res = await fetch(
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  if (!res.ok) throw new Error(`B2 auth failed: ${res.status}`);
  return res.json() as Promise<B2AuthResponse>;
}

async function b2ListVersionFolders(
  apiUrl: string,
  authToken: string,
  bucketId: string
): Promise<string[]> {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId,
      prefix: "",
      delimiter: "/",
      maxFileCount: 1000,
    }),
  });
  if (!res.ok) throw new Error(`B2 list failed: ${res.status}`);
  const data = (await res.json()) as B2ListResponse;
  return data.files
    .filter((f) => f.action === "folder")
    .map((f) => f.fileName.replace(/\/$/, "").trim())
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v));
}

async function b2GetDownloadAuth(
  apiUrl: string,
  authToken: string,
  bucketId: string,
  fileNamePrefix: string
): Promise<string> {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId,
      fileNamePrefix,
      validDurationInSeconds: 3600,
    }),
  });
  if (!res.ok) throw new Error(`B2 download auth failed: ${res.status}`);
  const data = (await res.json()) as B2DownloadAuthResponse;
  return data.authorizationToken;
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

  const keyId = Netlify.env.get("B2_KEY_ID");
  const applicationKey = "00569e2d441be4ddd85be5a0fb65d34818bccb8fa6";
  const bucketId = Netlify.env.get("B2_BUCKET_ID");
  const bucketName = "RecordSaaSSetup";

  if (!keyId || !bucketId) {
    console.error("[latest-version] Missing B2 env vars");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  try {
    const auth = await b2Authorize(keyId, applicationKey);
    const versions = await b2ListVersionFolders(
      auth.apiUrl,
      auth.authorizationToken,
      bucketId
    );

    if (versions.length === 0) {
      return jsonResponse({ error: "No versions found" }, 404);
    }

    const latestVersion = [...versions].sort(compareSemver).at(-1)!;
    const prefix = `${latestVersion}/`;

    const downloadToken = await b2GetDownloadAuth(
      auth.apiUrl,
      auth.authorizationToken,
      bucketId,
      prefix
    );

    const base = `${auth.downloadUrl}/file/${bucketName}/${prefix}`;
    const q = `?Authorization=${encodeURIComponent(downloadToken)}`;

    return jsonResponse({
      version: latestVersion,
      downloads: {
        windows: `${base}RecordSaaS-Binaries-windows-latest.zip${q}`,
        mac: `${base}RecordSaaS-Binaries-macos-latest.zip${q}`,
        linux: `${base}RecordSaaS-Binaries-ubuntu-22.04.zip${q}`,
      },
    });
  } catch (error) {
    console.error("[latest-version] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
};

export const config: Config = {
  path: "/api/latest-version",
};
