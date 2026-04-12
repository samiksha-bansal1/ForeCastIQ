/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable StrictMode in development to prevent double API calls.
  // Next.js enables it by default — it runs every useEffect twice in dev
  // to help catch bugs, but it causes duplicate backend requests.
  // This does NOT affect production builds.
  reactStrictMode: false,

  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
