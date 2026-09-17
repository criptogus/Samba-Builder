#!/usr/bin/env node

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { isPrereleaseVersion } = require("./release-version-utils.js");

const PROVENANCE_ASSET_PREFIX = "release-provenance-";
const PROVENANCE_ASSET_SUFFIX = ".json";
const DEFAULT_REPOSITORY = "criptogus/Samba-Builder";

// Cada plataforma publica um manifesto de proveniencia. Eles sao o contrato da
// release: nome, digest e tamanho de todo asset sao conferidos contra eles.
const REQUIRED_PLATFORMS = ["linux", "macos", "macos-intel", "windows"];

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function assetDigest(asset) {
  const match = asset.digest?.match(/^sha256:([a-f0-9]{64})$/i);
  if (!match) {
    throw new Error(`${asset.name} has no GitHub SHA-256 digest`);
  }
  return match[1].toLowerCase();
}

function isProvenanceAsset(name) {
  return (
    name.startsWith(PROVENANCE_ASSET_PREFIX) &&
    name.endsWith(PROVENANCE_ASSET_SUFFIX)
  );
}

/**
 * Resolve owner/repo a partir do ambiente do Actions (GITHUB_REPOSITORY).
 *
 * O script estava fixado no repositorio do projeto original, o que fazia a
 * verificacao falhar com 404 em qualquer fork — a release procurada nunca
 * existia no repositorio consultado.
 */
function resolveRepository(env = process.env, fallback = DEFAULT_REPOSITORY) {
  const slug = env.GITHUB_REPOSITORY || fallback;
  const [owner, repo] = String(slug).split("/");
  if (!owner || !repo) {
    throw new Error(`invalid repository slug: ${slug}`);
  }
  return { owner, repo };
}

/** Exige um manifesto de proveniencia por plataforma. */
function verifyRequiredPlatforms(assets) {
  const uploaded = new Set((assets ?? []).map((asset) => asset.name));
  const missing = REQUIRED_PLATFORMS.map(
    (platform) =>
      `${PROVENANCE_ASSET_PREFIX}${platform}${PROVENANCE_ASSET_SUFFIX}`,
  ).filter((name) => !uploaded.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Faltam manifestos de proveniencia: ${missing.join(", ")}. ` +
        "Alguma plataforma nao completou o build.",
    );
  }
}

function verifyReleaseAssetProvenance(assets, provenanceDirectory) {
  const uploadedAssets = new Map(assets.map((asset) => [asset.name, asset]));
  const manifestNames = assets
    .map((asset) => asset.name)
    .filter(isProvenanceAsset)
    .sort();
  const localManifestNames = fs
    .readdirSync(provenanceDirectory)
    .filter(isProvenanceAsset)
    .sort();

  if (
    manifestNames.length !== localManifestNames.length ||
    manifestNames.some((name, index) => name !== localManifestNames[index])
  ) {
    throw new Error(
      "Uploaded provenance manifests do not match the locally generated manifests",
    );
  }

  const provenArtifacts = new Map();
  for (const manifestName of localManifestNames) {
    const manifestPath = path.join(provenanceDirectory, manifestName);
    const bytes = fs.readFileSync(manifestPath);
    const uploadedManifest = uploadedAssets.get(manifestName);
    if (
      !uploadedManifest ||
      uploadedManifest.size !== bytes.byteLength ||
      assetDigest(uploadedManifest) !== sha256(bytes)
    ) {
      throw new Error(
        `Uploaded provenance manifest ${manifestName} does not match the local manifest`,
      );
    }

    const provenance = JSON.parse(bytes.toString("utf8"));
    if (
      !Array.isArray(provenance.artifacts) ||
      provenance.artifacts.length === 0
    ) {
      throw new Error(`${manifestName} does not contain release artifacts`);
    }
    for (const artifact of provenance.artifacts) {
      if (provenArtifacts.has(artifact.name)) {
        throw new Error(
          `Release artifact ${artifact.name} appears in multiple provenance manifests`,
        );
      }
      provenArtifacts.set(artifact.name, artifact);
    }
  }

  const releaseArtifacts = assets.filter(
    (asset) => !isProvenanceAsset(asset.name),
  );
  if (releaseArtifacts.length !== provenArtifacts.size) {
    throw new Error("Release asset set does not match provenance");
  }
  for (const asset of releaseArtifacts) {
    const proven = provenArtifacts.get(asset.name);
    if (
      !proven ||
      proven.sha256?.toLowerCase() !== assetDigest(asset) ||
      proven.size !== asset.size
    ) {
      throw new Error(`Release asset ${asset.name} does not match provenance`);
    }
  }
}

/**
 * Verifies that all expected binary assets are present in the GitHub release
 * for the version specified in package.json
 */
async function verifyReleaseAssets() {
  try {
    // Read version from package.json
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const version = packageJson.version;

    console.log(`🔍 Verifying release assets for version ${version}...`);

    // Repositorio: vem do ambiente do Actions (GITHUB_REPOSITORY), nunca fixo.
    const { owner, repo } = resolveRepository();
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    // Fetch all releases (including drafts)
    const tagName = `v${version}`;

    console.log(`📡 Fetching all releases to find: ${tagName}`);

    const allReleasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const response = await fetch(allReleasesUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "samba-release-verifier",
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const allReleases = await response.json();
    const release = allReleases.find((r) => r.tag_name === tagName);

    if (!release) {
      throw new Error(
        `Release ${tagName} not found in published releases or drafts. Make sure the release exists.`,
      );
    }

    const assets = release.assets || [];

    console.log(`📦 Found ${assets.length} assets in release ${tagName}`);
    console.log(`📄 Release status: ${release.draft ? "DRAFT" : "PUBLISHED"}`);

    const expectedPrerelease = isPrereleaseVersion(version);
    if (release.prerelease !== expectedPrerelease) {
      throw new Error(
        `Release ${tagName} prerelease flag is ${release.prerelease}, expected ${expectedPrerelease}`,
      );
    }

    // Os manifestos de proveniencia sao o contrato da release. Os nomes dos
    // binarios variam por plataforma (zip, exe, deb, rpm, AppImage, nupkg) e
    // nao sao fixados aqui: o conteudo de cada asset e conferido contra a
    // proveniencia, com nome, digest e tamanho exatos.
    const expectedAssets = REQUIRED_PLATFORMS.map(
      (platform) =>
        `${PROVENANCE_ASSET_PREFIX}${platform}${PROVENANCE_ASSET_SUFFIX}`,
    );

    console.log("📋 Expected assets:");
    expectedAssets.forEach((asset) => console.log(`  - ${asset}`));
    console.log("");

    verifyRequiredPlatforms(assets);

    // Get actual asset names
    const actualAssets = assets.map((asset) => asset.name);

    console.log("📋 Actual assets:");
    actualAssets.forEach((asset) => console.log(`  - ${asset}`));
    console.log("");

    // Check for missing assets
    const missingAssets = expectedAssets.filter(
      (expected) => !actualAssets.includes(expected),
    );

    if (missingAssets.length > 0) {
      console.error("❌ VERIFICATION FAILED!");
      console.error("📭 Missing assets:");
      missingAssets.forEach((asset) => console.error(`  - ${asset}`));
      console.error("");
      console.error(
        "Please ensure all platforms have completed their builds and uploads.",
      );
      process.exit(1);
    }

    // Asset fora da proveniencia e rejeitado por verifyReleaseAssetProvenance,
    // que exige conjunto exato: nada sobrando, nada faltando.

    verifyReleaseAssetProvenance(assets, path.join(__dirname, "..", "out"));

    console.log("✅ VERIFICATION PASSED!");
    console.log(
      `🎉 As ${REQUIRED_PLATFORMS.length} plataformas publicaram e os ${assets.length} assets de ${tagName} batem com a proveniencia`,
    );
    console.log("");
    console.log("📊 Release Summary:");
    console.log(`  Release: ${release.name || tagName}`);
    console.log(`  Tag: ${release.tag_name}`);
    console.log(`  Published: ${release.published_at}`);
    console.log(`  URL: ${release.html_url}`);
  } catch (error) {
    console.error("❌ Error verifying release assets:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyReleaseAssets();
}

module.exports = {
  resolveRepository,
  verifyRequiredPlatforms,
  verifyReleaseAssetProvenance,
  verifyReleaseAssets,
};
