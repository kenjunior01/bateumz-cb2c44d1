// Test script to find 2026 World Cup IDs
const API_KEY = "499d3679c952dd2c3ed57f4278c68676";

async function fetchLeagues() {
  try {
    console.log("Searching for World Cup 2026...");
    const response = await fetch("https://v3.football.api-sports.io/leagues?search=world%20cup", {
      method: "GET",
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });
    
    const data = await response.json();
    console.log("Leagues found:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

fetchLeagues();
