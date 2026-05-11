function getSupabaseImagePatterns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  try {
    const { hostname, protocol } = new URL(supabaseUrl);

    return [
      {
        protocol: protocol.replace(":", ""),
        hostname,
        pathname: "/**"
      }
    ];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: getSupabaseImagePatterns()
  }
};

export default nextConfig;
