// Dev script — uses VITE_RAPIDAPI_KEY from .env (run with: node --env-file=.env test-api.js)
const API_KEY = process.env.VITE_RAPIDAPI_KEY;
const HOST = process.env.VITE_RAPIDAPI_FOOTBALL_HOST || "free-api-live-football-data.p.rapidapi.com";

if (!API_KEY) {
  console.error("Set VITE_RAPIDAPI_KEY in .env");
  process.exit(1);
}

fetch(`https://${HOST}/football-get-all-leagues`, {
  headers: { "X-RapidAPI-Key": API_KEY, "X-RapidAPI-Host": HOST },
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
