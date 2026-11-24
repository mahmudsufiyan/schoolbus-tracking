import express from 'express';
import fetch from 'node-fetch';   // or use global fetch on Node 18+
const router = express.Router();

router.get('/route', async (req, res) => {
    const { fromLat, fromLng, toLat, toLng } = req.query;
    if (!fromLat || !fromLng || !toLat || !toLng) {
        return res.status(400).json({ error: 'Missing coords' });
    }
    try {
        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${fromLng},${fromLat};${toLng},${toLat}` +
            `?overview=full&geometries=geojson&steps=true`;
        const r = await fetch(url);
        const data = await r.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Routing failed' });
    }
});

export default router;