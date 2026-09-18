import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allows the Next.js dev server's JS/RSC assets to be requested when the
  // site is opened from a phone (or any device) over the local network using
  // your computer's LAN IP instead of "localhost". Without this, Next.js 15+
  // silently blocks those requests in dev mode, which looks exactly like a
  // broken mobile layout: the static HTML/CSS shell still renders, but the
  // JS bundle never loads, so animated sections stay invisible and buttons
  // don't respond.
  allowedDevOrigins: [
    "192.168.0.0/16",
    "10.0.0.0/8",
    "172.16.0.0/12",
  ],
};

export default nextConfig;
