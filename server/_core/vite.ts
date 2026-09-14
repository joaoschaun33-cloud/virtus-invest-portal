import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { logger } from "./logger";

export async function setupVite(app: Express, server: Server) {
  // Keep development-only Vite packages out of the production runtime image.
  const vitePackage = "vite";
  const { createServer: createViteServer } = await import(vitePackage);
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "../../vite.config.ts"),
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    logger.error("static-build-directory-missing", undefined, { distPath });
  }

  const publicUrl = (req: express.Request) =>
    (
      process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get("host")}`
    ).replace(/\/$/, "");

  app.get("/robots.txt", (req, res) => {
    const origin = publicUrl(req);
    res
      .type("text/plain")
      .send(
        `User-agent: *\nAllow: /\nDisallow: /portfolio\nDisallow: /alerts\nDisallow: /editorial\n\nSitemap: ${origin}/sitemap.xml\n`
      );
  });

  app.get("/sitemap.xml", (req, res) => {
    const origin = publicUrl(req);
    const paths = [
      ["/", "1.0", "daily"],
      ["/markets", "0.9", "hourly"],
      ["/news", "0.8", "hourly"],
      ["/screener", "0.8", "daily"],
      ["/compare", "0.8", "weekly"],
      ["/calculators", "0.7", "monthly"],
      ["/trust", "0.6", "monthly"],
      ["/privacy", "0.3", "yearly"],
      ["/terms", "0.3", "yearly"],
      ["/cookies", "0.3", "yearly"],
    ];
    const urls = paths
      .map(
        ([pathName, priority, changefreq]) =>
          `  <url><loc>${origin}${pathName}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
      )
      .join("\n");
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      );
  });

  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
