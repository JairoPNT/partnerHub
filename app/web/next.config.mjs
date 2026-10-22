/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Next 16.4 defaults to the tsc CLI, which also diagnoses standalone test files.
  // Keep the prior production API typechecker; do not disable build type checking.
  experimental: { useTypeScriptCli: false }
};

export default nextConfig;

