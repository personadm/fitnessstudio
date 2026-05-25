/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default ist 1MB — zu wenig für Newsletter mit eingebetteten Bildern
      // als data:URL. 5MB erlaubt mehrere komprimierte Bilder pro Newsletter.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
