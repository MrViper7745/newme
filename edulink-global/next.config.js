/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
module.exports = {
  // ...your existing config
  api: {
    responseLimit: false,
  },
}