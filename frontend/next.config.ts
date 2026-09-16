import type { NextConfig } from "next";

// Deployed environments (e.g. the demo VM) are reached by IP/hostname
// instead of localhost -- Next.js's dev server blocks cross-origin
// requests to its dev resources (HMR, hydration script) by default,
// and accessing it via a public IP counts as cross-origin from its
// perspective. PUBLIC_HOST (optional; unset in local dev) covers that
// -- found because this had been patched by hand, directly on the VM,
// uncommitted, with nothing else in the repo ever setting it: any
// future `git checkout`/reset there would have silently wiped it and
// broken the live demo with no obvious cause.
const publicHost = process.env.PUBLIC_HOST;

const nextConfig: NextConfig = {
  ...(publicHost ? { allowedDevOrigins: [publicHost] } : {}),
};

export default nextConfig;
