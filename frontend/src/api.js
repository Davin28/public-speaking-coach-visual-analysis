// Everything that talks to the Flask backend lives here.
// If the backend port changes, change it in this one spot.
export const API_URL = "http://localhost:5000";

export async function getTranscript(retries = 5, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${API_URL}/transcript`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const data = await res.json();
      return data.text;
    } catch (error) {
      if (i < retries - 1) {
        console.warn(`Retrying /transcript... (${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// TODO (once the backend has it): POST the recording, get the full analysis back.
// export async function analyzeRecording(file) {
//   const body = new FormData();
//   body.append("file", file);
//   const res = await fetch(`${API_URL}/analyze`, { method: "POST", body });
//   if (!res.ok) throw new Error(`Backend returned ${res.status}`);
//   return res.json(); // same shape as mockAnalysis in mockAnalysis.js
// }