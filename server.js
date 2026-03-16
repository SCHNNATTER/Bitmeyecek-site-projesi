const express = require('express');
const cors = require('cors');
const path = require('path'); 

const app = express();
const PORT = 3000;

app.use(cors());

// --- SERVE YOUR FILES ---
// This serves your CSS, JS, and HTML
app.use(express.static(path.join(__dirname)));

// 🚨 THE FIX: Explicitly serve the new data folder so it never 404s!
app.use('/data', express.static(path.join(__dirname, 'data')));

// This handles the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 VTT Engine running at http://localhost:${PORT}`);
    console.log(`👉 Open your browser to http://localhost:3000 to play!`);
});