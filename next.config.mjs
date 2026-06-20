/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages: 정적 HTML로 export (서버 런타임 없음)
  output: "export",
  // 프로젝트 페이지(https://taeyongvv.github.io/job_moaba/)라 basePath 필요
  basePath: "/job_moaba",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
