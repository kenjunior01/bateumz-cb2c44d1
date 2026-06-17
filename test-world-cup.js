// Test script to get World Cup details
const API_KEY = "499d3679c952dd2c3ed57f4278c68676";

async function fetchWorldCup() {
  try {
    console.log("Fetching World Cup (league ID 1)...");
    const response = await fetch("https://v3.football.api-sports.io/leagues?id=1", {
      method: "GET",
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });
    
    const data = await response.json();
    console.log("World Cup details:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

fetchWorldCup();
