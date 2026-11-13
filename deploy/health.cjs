// Call this handler before application routes. It returns false for other URLs.
module.exports = function health(req, res) {
  if (req.method !== "GET" || req.url !== "/api/health") return false;
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", revision: process.env.APP_REVISION || "unknown" }));
  return true;
};
