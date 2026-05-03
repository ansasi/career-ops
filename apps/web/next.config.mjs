import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'bcryptjs'],
  transpilePackages: ['@career-ops/core'],
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
};

export default nextConfig;
