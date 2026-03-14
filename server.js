const express = require('express');
const cors = require('cors');
const path = require('path'); // NEW: Helps find your folders

const app = express();
const PORT = 3000;

app.use(cors());

// --- THE FIX: SERVE YOUR FILES ---
// This tells Node: "Look in the folder I'm currently in and show the files there!"
app.use(express.static(path.join(__dirname, '/')));

// This handles the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- THE D&D BEYOND TUNNEL ---
app.get('/api/dnd/:charId', async (req, res) => {
    const charId = req.params.charId;
    const dndBeyondUrl = `https://character-service.dndbeyond.com/character/v5/character/${charId}`;
    try {
        const response = await fetch(dndBeyondUrl);
        if (!response.ok) throw new Error("D&D Beyond rejected the request");
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch from D&D Beyond" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 VTT Engine running at http://localhost:${PORT}`);
    console.log(`👉 Open your browser to http://localhost:3000 to play!`);
});