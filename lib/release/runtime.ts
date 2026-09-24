export function runtimeReleaseSha() {
  return (
    process.env.RENDER_GIT_COMMIT?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    "unknown"
  );
}

export function shortReleaseSha() {
  const sha = runtimeReleaseSha();
  return sha === "unknown" ? sha : sha.slice(0, 12);
}
