#!/usr/bin/env node

const axios = require('axios');

/**
 * Day 9 - Custom WeatherTool for MCP
 * 
 * A comprehensive weather tool that provides current weather, forecasts,
 * and weather-related information for any location worldwide.
 */

class WeatherTool {
    constructor() {
        this.name = 'weather_tool';
        this.description = 'Get current weather conditions, forecasts, and weather information for any location';
        
        // Mock weather data for demonstration
        this.mockWeatherData = {
            'london': {
                location: 'London, UK',
                temperature: 12,
                condition: 'Cloudy',
                humidity: 78,
                windSpeed: 15,
                pressure: 1013,
                uvIndex: 2,
                visibility: 10,
                forecast: [
                    { day: 'Today', high: 15, low: 8, condition: 'Partly Cloudy' },
                    { day: 'Tomorrow', high: 18, low: 10, condition: 'Sunny' },
                    { day: 'Day 3', high: 14, low: 7, condition: 'Rainy' },
                    { day: 'Day 4', high: 16, low: 9, condition: 'Partly Cloudy' },
                    { day: 'Day 5', high: 19, low: 12, condition: 'Sunny' }
                ]
            },
            'new york': {
                location: 'New York, NY, USA',
                temperature: 22,
                condition: 'Sunny',
                humidity: 65,
                windSpeed: 8,
                pressure: 1018,
                uvIndex: 7,
                visibility: 16,
                forecast: [
                    { day: 'Today', high: 25, low: 18, condition: 'Sunny' },
                    { day: 'Tomorrow', high: 23, low: 16, condition: 'Partly Cloudy' },
                    { day: 'Day 3', high: 20, low: 14, condition: 'Thunderstorms' },
                    { day: 'Day 4', high: 24, low: 17, condition: 'Sunny' },
                    { day: 'Day 5', high: 26, low: 19, condition: 'Hot' }
                ]
            },
            'tokyo': {
                location: 'Tokyo, Japan',
                temperature: 18,
                condition: 'Light Rain',
                humidity: 85,
                windSpeed: 12,
                pressure: 1008,
                uvIndex: 3,
                visibility: 8,
                forecast: [
                    { day: 'Today', high: 20, low: 15, condition: 'Rainy' },
                    { day: 'Tomorrow', high: 22, low: 17, condition: 'Cloudy' },
                    { day: 'Day 3', high: 25, low: 19, condition: 'Sunny' },
                    { day: 'Day 4', high: 23, low: 18, condition: 'Partly Cloudy' },
                    { day: 'Day 5', high: 21, low: 16, condition: 'Light Rain' }
                ]
            },
            'sydney': {
                location: 'Sydney, Australia',
                temperature: 24,
                condition: 'Partly Cloudy',
                humidity: 70,
                windSpeed: 18,
                pressure: 1015,
                uvIndex: 8,
                visibility: 12,
                forecast: [
                    { day: 'Today', high: 26, low: 20, condition: 'Partly Cloudy' },
                    { day: 'Tomorrow', high: 28, low: 22, condition: 'Sunny' },
                    { day: 'Day 3', high: 25, low: 19, condition: 'Windy' },
                    { day: 'Day 4', high: 23, low: 17, condition: 'Cloudy' },
                    { day: 'Day 5', high: 27, low: 21, condition: 'Sunny' }
                ]
            },
            'paris': {
                location: 'Paris, France',
                temperature: 14,
                condition: 'Light Rain',
                humidity: 82,
                windSpeed: 10,
                pressure: 1010,
                uvIndex: 2,
                visibility: 9,
                forecast: [
                    { day: 'Today', high: 16, low: 11, condition: 'Rainy' },
                    { day: 'Tomorrow', high: 19, low: 13, condition: 'Cloudy' },
                    { day: 'Day 3', high: 21, low: 15, condition: 'Partly Cloudy' },
                    { day: 'Day 4', high: 17, low: 12, condition: 'Showers' },
                    { day: 'Day 5', high: 20, low: 14, condition: 'Sunny' }
                ]
            }
        };

        this.weatherConditions = [
            'Sunny', 'Partly Cloudy', 'Cloudy', 'Overcast', 'Light Rain', 
            'Heavy Rain', 'Drizzle', 'Thunderstorms', 'Snow', 'Fog', 
            'Windy', 'Hot', 'Cold', 'Humid', 'Dry'
        ];
    }

    /**
     * Get tool schema for MCP registration
     */
    getToolSchema() {
        return {
            name: this.name,
            description: this.description,
            inputSchema: {
                type: 'object',
                properties: {
                    location: {
                        type: 'string',
                        description: 'City name or location to get weather for (e.g., "London", "New York", "Tokyo")'
                    },
                    type: {
                        type: 'string',
                        description: 'Type of weather information to retrieve',
                        enum: ['current', 'forecast', 'detailed', 'alerts'],
                        default: 'current'
                    },
                    units: {
                        type: 'string',
                        description: 'Temperature units',
                        enum: ['celsius', 'fahrenheit'],
                        default: 'celsius'
                    },
                    days: {
                        type: 'number',
                        description: 'Number of forecast days (1-7, only for forecast type)',
                        minimum: 1,
                        maximum: 7,
                        default: 5
                    }
                },
                required: ['location']
            }
        };
    }

    /**
     * Execute the weather tool with given parameters
     */
    async execute(parameters) {
        try {
            console.log(`🌤️ WeatherTool executing with parameters:`, parameters);

            const { location, type = 'current', units = 'celsius', days = 5 } = parameters;

            if (!location) {
                throw new Error('Location is required');
            }

            // Normalize location for lookup
            const normalizedLocation = location.toLowerCase().trim();
            
            // Check if we have mock data for this location
            let weatherData = this.mockWeatherData[normalizedLocation];
            
            if (!weatherData) {
                // Generate random weather data for unknown locations
                weatherData = this.generateRandomWeather(location);
            }

            // Convert temperature units if needed
            if (units === 'fahrenheit') {
                weatherData = this.convertToFahrenheit(weatherData);
            }

            // Return different data based on requested type
            switch (type) {
                case 'current':
                    return this.getCurrentWeather(weatherData);
                
                case 'forecast':
                    return this.getForecast(weatherData, days);
                
                case 'detailed':
                    return this.getDetailedWeather(weatherData, days);
                
                case 'alerts':
                    return this.getWeatherAlerts(weatherData);
                
                default:
                    return this.getCurrentWeather(weatherData);
            }

        } catch (error) {
            console.error('WeatherTool execution error:', error);
            return {
                error: true,
                message: error.message,
                location: parameters.location || 'unknown'
            };
        }
    }

    /**
     * Get current weather conditions
     */
    getCurrentWeather(weatherData) {
        return {
            success: true,
            type: 'current',
            location: weatherData.location,
            timestamp: new Date().toISOString(),
            current: {
                temperature: weatherData.temperature,
                condition: weatherData.condition,
                humidity: weatherData.humidity,
                windSpeed: weatherData.windSpeed,
                pressure: weatherData.pressure,
                uvIndex: weatherData.uvIndex,
                visibility: weatherData.visibility
            },
            summary: `Current weather in ${weatherData.location}: ${weatherData.temperature}°C, ${weatherData.condition}`
        };
    }

    /**
     * Get weather forecast
     */
    getForecast(weatherData, days) {
        const forecastDays = weatherData.forecast.slice(0, Math.min(days, 5));
        
        return {
            success: true,
            type: 'forecast',
            location: weatherData.location,
            timestamp: new Date().toISOString(),
            current: {
                temperature: weatherData.temperature,
                condition: weatherData.condition
            },
            forecast: forecastDays,
            summary: `${days}-day forecast for ${weatherData.location}`
        };
    }

    /**
     * Get detailed weather information
     */
    getDetailedWeather(weatherData, days) {
        const forecastDays = weatherData.forecast.slice(0, Math.min(days, 5));
        
        return {
            success: true,
            type: 'detailed',
            location: weatherData.location,
            timestamp: new Date().toISOString(),
            current: {
                temperature: weatherData.temperature,
                condition: weatherData.condition,
                humidity: weatherData.humidity,
                windSpeed: weatherData.windSpeed,
                pressure: weatherData.pressure,
                uvIndex: weatherData.uvIndex,
                visibility: weatherData.visibility,
                feelsLike: Math.round(weatherData.temperature + (Math.random() * 6 - 3))
            },
            forecast: forecastDays,
            details: {
                sunrise: '06:45 AM',
                sunset: '07:32 PM',
                moonPhase: this.getMoonPhase(),
                airQuality: this.getAirQuality(),
                pollen: this.getPollenCount()
            },
            summary: `Detailed weather information for ${weatherData.location}`
        };
    }

    /**
     * Get weather alerts (mock)
     */
    getWeatherAlerts(weatherData) {
        const alerts = [];
        
        // Generate alerts based on conditions
        if (weatherData.windSpeed > 25) {
            alerts.push({
                type: 'Wind Warning',
                severity: 'Moderate',
                message: 'Strong winds expected. Secure loose objects.',
                validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
            });
        }
        
        if (weatherData.temperature > 30) {
            alerts.push({
                type: 'Heat Advisory',
                severity: 'High',
                message: 'Extremely high temperatures. Stay hydrated and avoid prolonged sun exposure.',
                validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
            });
        }
        
        if (weatherData.condition.includes('Rain') || weatherData.condition.includes('Storm')) {
            alerts.push({
                type: 'Precipitation Alert',
                severity: 'Low',
                message: 'Rain expected. Carry an umbrella.',
                validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
            });
        }

        return {
            success: true,
            type: 'alerts',
            location: weatherData.location,
            timestamp: new Date().toISOString(),
            current: {
                temperature: weatherData.temperature,
                condition: weatherData.condition
            },
            alerts: alerts,
            alertCount: alerts.length,
            summary: `${alerts.length} weather alert(s) for ${weatherData.location}`
        };
    }

    /**
     * Generate random weather data for unknown locations
     */
    generateRandomWeather(location) {
        const condition = this.weatherConditions[Math.floor(Math.random() * this.weatherConditions.length)];
        const baseTemp = Math.floor(Math.random() * 35) + 5; // 5-40°C
        
        const forecast = [];
        for (let i = 0; i < 5; i++) {
            forecast.push({
                day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `Day ${i + 1}`,
                high: baseTemp + Math.floor(Math.random() * 8) - 2,
                low: baseTemp - Math.floor(Math.random() * 8) - 3,
                condition: this.weatherConditions[Math.floor(Math.random() * this.weatherConditions.length)]
            });
        }

        return {
            location: location,
            temperature: baseTemp,
            condition: condition,
            humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
            windSpeed: Math.floor(Math.random() * 25) + 5, // 5-30 km/h
            pressure: Math.floor(Math.random() * 20) + 1000, // 1000-1020 hPa
            uvIndex: Math.floor(Math.random() * 11), // 0-10
            visibility: Math.floor(Math.random() * 10) + 5, // 5-15 km
            forecast: forecast
        };
    }

    /**
     * Convert weather data to Fahrenheit
     */
    convertToFahrenheit(weatherData) {
        const convertTemp = (celsius) => Math.round((celsius * 9/5) + 32);
        
        return {
            ...weatherData,
            temperature: convertTemp(weatherData.temperature),
            forecast: weatherData.forecast.map(day => ({
                ...day,
                high: convertTemp(day.high),
                low: convertTemp(day.low)
            }))
        };
    }

    /**
     * Get moon phase (mock)
     */
    getMoonPhase() {
        const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 
                       'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
        return phases[Math.floor(Math.random() * phases.length)];
    }

    /**
     * Get air quality index (mock)
     */
    getAirQuality() {
        const qualities = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy'];
        const quality = qualities[Math.floor(Math.random() * qualities.length)];
        const index = Math.floor(Math.random() * 150) + 20;
        
        return {
            index: index,
            quality: quality,
            primaryPollutant: Math.random() > 0.5 ? 'PM2.5' : 'Ozone'
        };
    }

    /**
     * Get pollen count (mock)
     */
    getPollenCount() {
        const levels = ['Low', 'Moderate', 'High', 'Very High'];
        const level = levels[Math.floor(Math.random() * levels.length)];
        
        return {
            level: level,
            tree: Math.floor(Math.random() * 5) + 1,
            grass: Math.floor(Math.random() * 5) + 1,
            weed: Math.floor(Math.random() * 5) + 1
        };
    }

    /**
     * Test the weather tool with sample queries
     */
    async test() {
        console.log('🧪 Testing WeatherTool...\n');

        const testCases = [
            { location: 'London', type: 'current' },
            { location: 'New York', type: 'forecast', days: 3 },
            { location: 'Tokyo', type: 'detailed' },
            { location: 'Berlin', type: 'current', units: 'fahrenheit' },
            { location: 'Sydney', type: 'alerts' },
            { location: 'Invalid Location', type: 'current' }
        ];

        for (const testCase of testCases) {
            console.log(`📍 Testing: ${JSON.stringify(testCase)}`);
            const result = await this.execute(testCase);
            console.log(`✅ Result:`, JSON.stringify(result, null, 2));
            console.log('-'.repeat(60));
        }
    }
}

module.exports = { WeatherTool };