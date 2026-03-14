const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// This is the magic line that tells the browser "Let this data through!"
app.use(cors());

// Create our custom secret tunnel
app.get('/api/dnd/:charId', async (req, res) => {
    const charId = req.params.charId;
    const dndBeyondUrl = `https://character-service.dndbeyond.com/character/v5/character/${charId}`;

    try {
        // The server asks D&D Beyond for the data
        const response = await fetch(dndBeyondUrl);
        if (!response.ok) throw new Error("D&D Beyond rejected the request");
        
        const data = await response.json();
        
        // The server sends the data back to your frontend!
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch from D&D Beyond" });
    }
});

app.listen(PORT, () => {
    console.log(`CORS Proxy Server running at http://localhost:${PORT}`);
});