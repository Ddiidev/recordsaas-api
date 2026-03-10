import type { Config } from "@netlify/functions";

const GITHUB_REPO = "Ddiidev/recordsaas";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

function extractSemver(tag: string): string {
  const match = tag.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? tag;
}

function detectPlatformUrl(
  assets: GitHubAsset[]
): { windows: string | null; mac: string | null; linux: string | null } {
  let windows: string | null = null;
  let mac: string | null = null;
  let linux: string | null = null;

  for (const asset of assets) {
    const name = asset.name.toLowerCase();

    if (!windows && (name.endsWith(".exe") || name.endsWith(".msi"))) {
      windows = asset.browser_download_url;
    }

    if (!mac && (name.endsWith(".dmg") || (name.endsWith(".zip") && (name.includes("mac") || name.includes("darwin"))))) {
      mac = asset.browser_download_url;
    }

    if (
      !linux &&
      (name.endsWith(".appimage") ||
        name.endsWith(".deb") ||
        name.endsWith(".rpm") ||
        (name.endsWith(".zip") && name.includes("linux")))
    ) {
      linux = asset.browser_download_url;
    }
  }

  return { windows, mac, linux };
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

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "RecordSaaS-Landing",
    };

    const githubToken = Netlify.env.get("GITHUB_TOKEN");
    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`;
    }

    const response = await fetch(GITHUB_API_URL, { headers });

    if (!response.ok) {
      const body = await response.text();
      console.error("[latest-version] GitHub API error:", response.status, body);
      return jsonResponse({ error: "Failed to fetch latest release from GitHub" }, 502);
    }

    const release = (await response.json()) as GitHubRelease;
    const version = extractSemver(release.tag_name);
    const downloads = detectPlatformUrl(release.assets);

    const missingPlatforms = (["windows", "mac", "linux"] as const).filter(
      (p) => !downloads[p]
    );

    if (missingPlatforms.length > 0) {
      console.error(
        `[latest-version] Missing download links for ${missingPlatforms.join(", ")} in release ${release.tag_name}`
      );
    }

    return jsonResponse({
      version,
      downloads: {
        windows: downloads.windows ?? "",
        mac: downloads.mac ?? "",
        linux: downloads.linux ?? "",
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
