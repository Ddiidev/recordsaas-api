import type { Config } from "@netlify/functions";

type Platform = "windows" | "mac" | "linux";

interface NocodbListResponse {
  list: Array<Record<string, unknown>>;
  pageInfo?: {
    totalRows?: number;
  };
}

interface VersionRow {
  record: Record<string, unknown>;
  version: string;
  semver: string | null;
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

function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function keyMatchesAlias(key: string, aliases: string[]): boolean {
  const normalized = normalizeKey(key);
  return aliases.some((alias) => normalizeKey(alias) === normalized);
}

function keyContainsAllTokens(key: string, tokens: string[]): boolean {
  const normalized = normalizeKey(key);
  return tokens.every((token) => normalized.includes(normalizeKey(token)));
}

function extractSemver(value: string): string | null {
  const match = value.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? null;
}

function extractUrlFromValue(value: unknown): string | null {
  const direct = asNonEmptyString(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractUrlFromValue(item);
      if (nested) return nested;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const urlKeys = [
      "url",
      "signedUrl",
      "signed_url",
      "downloadUrl",
      "download_url",
      "path",
    ];

    for (const key of urlKeys) {
      const candidate = asNonEmptyString(objectValue[key]);
      if (candidate) return candidate;
    }
  }

  return null;
}

function findStringByAliases(
  record: Record<string, unknown>,
  aliases: string[],
  tokenGroups: string[][] = []
): string | null {
  for (const [key, value] of Object.entries(record)) {
    if (!keyMatchesAlias(key, aliases)) continue;
    const candidate = asNonEmptyString(value);
    if (candidate) return candidate;
  }

  for (const tokens of tokenGroups) {
    for (const [key, value] of Object.entries(record)) {
      if (!keyContainsAllTokens(key, tokens)) continue;
      const candidate = asNonEmptyString(value);
      if (candidate) return candidate;
    }
  }

  return null;
}

function findUrlByAliases(
  record: Record<string, unknown>,
  aliases: string[],
  tokenGroups: string[][] = []
): string | null {
  for (const [key, value] of Object.entries(record)) {
    if (!keyMatchesAlias(key, aliases)) continue;
    const candidate = extractUrlFromValue(value);
    if (candidate) return candidate;
  }

  for (const tokens of tokenGroups) {
    for (const [key, value] of Object.entries(record)) {
      if (!keyContainsAllTokens(key, tokens)) continue;
      const candidate = extractUrlFromValue(value);
      if (candidate) return candidate;
    }
  }

  return null;
}

function detectPlatform(value: string): Platform | null {
  const normalized = value.toLowerCase();

  if (normalized.includes("win")) return "windows";
  if (
    normalized.includes("mac") ||
    normalized.includes("osx") ||
    normalized.includes("darwin")
  ) {
    return "mac";
  }
  if (
    normalized.includes("linux") ||
    normalized.includes("ubuntu") ||
    normalized.includes("debian")
  ) {
    return "linux";
  }

  return null;
}

function extractVersionRows(records: Array<Record<string, unknown>>): VersionRow[] {
  const versionAliases = [
    "Version",
    "SetupVersion",
    "LatestVersion",
    "ReleaseVersion",
    "AppVersion",
  ];

  return records.flatMap((record) => {
    const rawVersion = findStringByAliases(record, versionAliases, [["version"]]);
    if (!rawVersion) return [];

    const semver = extractSemver(rawVersion);
    return [
      {
        record,
        version: semver ?? rawVersion,
        semver,
      },
    ];
  });
}

function pickLatestVersion(rows: VersionRow[]): string | null {
  const semverRows = rows.filter((row) => row.semver !== null) as Array<
    VersionRow & { semver: string }
  >;

  if (semverRows.length > 0) {
    return [...semverRows].sort((a, b) => compareSemver(a.semver, b.semver)).at(-1)!
      .semver;
  }

  return rows[0]?.version ?? null;
}

function extractPlatformSpecificUrl(
  record: Record<string, unknown>,
  platform: Platform
): string | null {
  if (platform === "windows") {
    return findUrlByAliases(
      record,
      [
        "Windows",
        "WindowsUrl",
        "WindowsURL",
        "WindowsDownloadUrl",
        "WindowsDownloadURL",
        "WindowsLink",
        "WindowsSetupUrl",
      ],
      [
        ["windows"],
        ["win", "download"],
        ["win", "url"],
      ]
    );
  }

  if (platform === "mac") {
    return findUrlByAliases(
      record,
      [
        "Mac",
        "MacUrl",
        "MacURL",
        "MacOsUrl",
        "MacOSUrl",
        "MacDownloadUrl",
        "MacLink",
        "MacSetupUrl",
        "OsxUrl",
      ],
      [
        ["mac"],
        ["macos"],
        ["osx"],
      ]
    );
  }

  return findUrlByAliases(
    record,
    [
      "Linux",
      "LinuxUrl",
      "LinuxURL",
      "LinuxDownloadUrl",
      "LinuxLink",
      "LinuxSetupUrl",
      "UbuntuUrl",
      "UbuntuDownloadUrl",
    ],
    [
      ["linux"],
      ["ubuntu"],
    ]
  );
}

function extractGenericDownloadUrl(record: Record<string, unknown>): string | null {
  return findUrlByAliases(
    record,
    [
      "DownloadUrl",
      "DownloadURL",
      "Url",
      "URL",
      "Link",
      "FileUrl",
      "InstallerUrl",
      "SetupUrl",
      "BinaryUrl",
    ],
    [
      ["download"],
      ["link"],
      ["url"],
      ["installer"],
      ["setup"],
    ]
  );
}

function aggregateDownloads(
  records: Array<Record<string, unknown>>
): Partial<Record<Platform, string>> {
  const downloads: Partial<Record<Platform, string>> = {};

  for (const record of records) {
    for (const platform of ["windows", "mac", "linux"] as Platform[]) {
      if (downloads[platform]) continue;
      const platformUrl = extractPlatformSpecificUrl(record, platform);
      if (platformUrl) {
        downloads[platform] = platformUrl;
      }
    }

    const platformValue = findStringByAliases(record, [
      "Platform",
      "OS",
      "OperatingSystem",
      "TargetPlatform",
      "TargetOS",
      "Sistema",
    ]);

    if (!platformValue) continue;

    const detectedPlatform = detectPlatform(platformValue);
    if (!detectedPlatform || downloads[detectedPlatform]) continue;

    const genericUrl = extractGenericDownloadUrl(record);
    if (genericUrl) {
      downloads[detectedPlatform] = genericUrl;
    }
  }

  return downloads;
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

  const baseUrl = Netlify.env.get("NOCODB_BASE_URL") || "https://app.nocodb.com";
  const tableId =
    Netlify.env.get("NOCODB_SETUP_VERSIONS_TABLE_ID") ||
    Netlify.env.get("NOCODB_SETUPVERSIONS_TABLE_ID") ||
    Netlify.env.get("NOCODB_LATEST_VERSION_TABLE_ID") ||
    "SetupVersions";
  const apiToken = Netlify.env.get("NOCODB_API_TOKEN");

  if (!apiToken) {
    console.error("[latest-version] Missing NOCODB_API_TOKEN");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  try {
    const params = new URLSearchParams({
      sort: "-Id",
      limit: "200",
    });

    const apiUrl = `${baseUrl}/api/v2/tables/${tableId}/records?${params}`;
    const response = await fetch(apiUrl, {
      headers: {
        "xc-token": apiToken,
      },
    });

    if (!response.ok) {
      console.error("[latest-version] NocoDB API error:", response.status, await response.text());
      return jsonResponse({ error: "Failed to fetch setup versions" }, 502);
    }

    const data = (await response.json()) as NocodbListResponse;
    const records = data.list || [];

    if (records.length === 0) {
      return jsonResponse({ error: "No versions found" }, 404);
    }

    const versionRows = extractVersionRows(records);
    const latestVersion = pickLatestVersion(versionRows);

    if (!latestVersion) {
      return jsonResponse({ error: "No valid version found in SetupVersions" }, 404);
    }

    const latestVersionRows = versionRows
      .filter((row) => row.version === latestVersion || row.semver === latestVersion)
      .map((row) => row.record);

    const downloads = aggregateDownloads(latestVersionRows);

    const missingPlatforms = (["windows", "mac", "linux"] as Platform[]).filter(
      (platform) => !downloads[platform]
    );

    if (missingPlatforms.length > 0) {
      console.error(
        `[latest-version] Missing download links for ${missingPlatforms.join(", ")} in SetupVersions (version ${latestVersion})`
      );
      return jsonResponse(
        { error: `Missing download links for version ${latestVersion}` },
        502
      );
    }

    return jsonResponse({
      version: latestVersion,
      downloads: {
        windows: downloads.windows!,
        mac: downloads.mac!,
        linux: downloads.linux!,
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
