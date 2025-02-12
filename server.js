require('dotenv').config();
const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;





const client = redis.createClient(REDIS_PORT);

// Handle Redis errors
client.on('error', (err) => console.error('Redis error:', err));

(async () => {
    await client.connect();
    console.log(`Connected to Redis on custom port ${REDIS_PORT}`);
})();

// Function to fetch weather data
async function fetchWeather(req, res, next) {
    try {
        const { city } = req.params;
        const API_KEY = process.env.WEATHER_API_KEY;
        const URL = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}?unitGroup=metric&key=${API_KEY}`;

        const response = await axios.get(URL);
        const data = response.data;

        // Cache the response in Redis for 30 minutes
        client.setEx(city, 1800, JSON.stringify(data));

        res.status(201).json({ source: 'API', data });
    } catch (error) {
        next(error);
    }
}

async function checkCache(req, res, next) {
    const { city } = req.params;

    try {
        const cachedData = await client.get(city);  // ✅ Use async/await instead of callbacks
        if (cachedData) {
            return res.json({ source: 'Redis Cache', data: JSON.parse(cachedData) });
        }
        next();
    } catch (err) {
        console.error('Redis error:', err);
        next(); // Proceed to fetchWeather even if Redis fails
    }
}

// API Route
app.get('/weather/:city', checkCache, fetchWeather);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
