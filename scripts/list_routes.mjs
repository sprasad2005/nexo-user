import fs from "fs";
import path from "path";

function getRoutes(dir, base = "") {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getRoutes(filePath, path.join(base, file)));
    } else if (file === "route.ts" || file === "route.js") {
      results.push(path.join(base, file).replace(/\\/g, "/"));
    }
  }
  return results;
}

const apiDir = path.resolve("app/api");
const routes = getRoutes(apiDir);
console.log(`Total API Routes: ${routes.length}`);
routes.sort().forEach((r, idx) => console.log(`${idx + 1}. /api/${r.replace(/\/route\.(ts|js)$/, "")}`));
