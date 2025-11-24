# Day 9 - Custom WeatherTool MCP 🌤️

A complete custom Model Context Protocol (MCP) tool implementation featuring a comprehensive WeatherTool that provides current weather, forecasts, detailed information, and alerts for any location worldwide.

## Overview

This implementation demonstrates how to:
- **Design and build a custom MCP tool** from scratch
- **Register custom tools** in an MCP server
- **Connect AI agents** to call custom tools through MCP protocol
- **Return meaningful, structured results** with comprehensive weather data
- **Provide interactive web UI** for testing custom tools

## Features

### 🌤️ Custom WeatherTool Capabilities

- **Current Weather**: Get real-time weather conditions for any location
- **Weather Forecasts**: 1-7 day forecasts with high/low temperatures
- **Detailed Information**: Extended data including sunrise, sunset, air quality, pollen
- **Weather Alerts**: Automatic alerts for severe weather conditions
- **Temperature Units**: Support for Celsius and Fahrenheit
- **Global Coverage**: Works with any location (includes smart fallbacks)

### 🔧 MCP Integration Features

- **Tool Registration**: Proper MCP tool schema definition and registration
- **Parameter Validation**: Comprehensive input validation and error handling
- **Structured Responses**: JSON-formatted responses following MCP standards
- **Connection Management**: Robust client-server communication
- **Real-time Execution**: Live tool calls with performance monitoring

### 🌐 Web Interface Features

- **Interactive UI**: Beautiful, responsive web interface for testing
- **Real-time Connection**: Connect/disconnect from MCP server
- **Parameter Forms**: Dynamic forms for all tool parameters
- **Quick Locations**: Instant weather for popular cities
- **Formatted Results**: Beautiful weather cards with all information
- **Status Monitoring**: Real-time logs and connection status

## Installation & Usage

### 1. Install Dependencies

```bash
cd day9
npm install
```

### 2. Start the Web UI (Recommended)

```bash
# Start the web server with integrated MCP
npm start

# Then visit http://localhost:3009 in your browser
```

### 3. Alternative: Command Line Usage

```bash
# Test the MCP server directly
node weather-server.js

# Test the MCP client
node weather-client.js

# Run just the weather tool
node -e "const { WeatherTool } = require('./weather-tool.js'); new WeatherTool().test()"
```

## Custom WeatherTool API

### Tool Schema

```json
{
  "name": "weather_tool",
  "description": "Get current weather conditions, forecasts, and weather information for any location",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name or location (required)"
      },
      "type": {
        "type": "string",
        "enum": ["current", "forecast", "detailed", "alerts"],
        "default": "current"
      },
      "units": {
        "type": "string", 
        "enum": ["celsius", "fahrenheit"],
        "default": "celsius"
      },
      "days": {
        "type": "number",
        "minimum": 1,
        "maximum": 7,
        "default": 5
      }
    },
    "required": ["location"]
  }
}
```

### Usage Examples

#### Current Weather
```bash
# Get current weather for London
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{"location": "London", "type": "current"}'
```

#### Weather Forecast
```bash
# Get 3-day forecast for New York
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{"location": "New York", "type": "forecast", "days": 3}'
```

#### Detailed Information
```bash
# Get detailed weather for Tokyo in Fahrenheit
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{"location": "Tokyo", "type": "detailed", "units": "fahrenheit"}'
```

#### Weather Alerts
```bash
# Get weather alerts for Sydney
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{"location": "Sydney", "type": "alerts"}'
```

## Sample Responses

### Current Weather Response
```json
{
  "success": true,
  "weather": {
    "success": true,
    "type": "current",
    "location": "London, UK",
    "timestamp": "2025-11-24T18:35:59.624Z",
    "current": {
      "temperature": 12,
      "condition": "Cloudy",
      "humidity": 78,
      "windSpeed": 15,
      "pressure": 1013,
      "uvIndex": 2,
      "visibility": 10
    },
    "summary": "Current weather in London, UK: 12°C, Cloudy"
  },
  "executionTime": 1,
  "location": "London",
  "type": "current",
  "units": "celsius"
}
```

### Forecast Response
```json
{
  "success": true,
  "type": "forecast",
  "location": "New York, NY, USA", 
  "current": {
    "temperature": 22,
    "condition": "Sunny"
  },
  "forecast": [
    {"day": "Today", "high": 25, "low": 18, "condition": "Sunny"},
    {"day": "Tomorrow", "high": 23, "low": 16, "condition": "Partly Cloudy"},
    {"day": "Day 3", "high": 20, "low": 14, "condition": "Thunderstorms"}
  ]
}
```

### Detailed Response
```json
{
  "success": true,
  "type": "detailed",
  "location": "Tokyo, Japan",
  "current": {
    "temperature": 64,
    "condition": "Light Rain",
    "humidity": 85,
    "windSpeed": 12,
    "pressure": 1008,
    "uvIndex": 3,
    "visibility": 8,
    "feelsLike": 62
  },
  "forecast": [...],
  "details": {
    "sunrise": "06:45 AM",
    "sunset": "07:32 PM", 
    "moonPhase": "Waning Gibbous",
    "airQuality": {
      "index": 55,
      "quality": "Moderate",
      "primaryPollutant": "PM2.5"
    },
    "pollen": {
      "level": "High",
      "tree": 3,
      "grass": 4,
      "weed": 2
    }
  }
}
```

## Architecture

### Component Structure

```
Day 9 - WeatherTool MCP
├── weather-tool.js        # Custom WeatherTool implementation
├── weather-server.js      # MCP Server with tool registration  
├── weather-client.js      # MCP Client for testing
├── server.js             # Web UI server with API endpoints
├── public/index.html      # Interactive web interface
└── README.md             # This documentation
```

### Data Flow

```
1. Web UI or API Request
   ↓
2. Express Server (/api/weather)
   ↓  
3. MCP Server (tool registration)
   ↓
4. WeatherTool.execute(parameters)
   ↓
5. Weather data processing & validation
   ↓
6. Structured JSON response
   ↓
7. Web UI formatting & display
```

### Tool Implementation Details

The WeatherTool is implemented as a complete MCP tool with:

- **Schema Definition**: Proper JSON schema for parameter validation
- **Execution Engine**: Async execution with error handling
- **Data Sources**: Mock weather data + dynamic generation for unknown locations
- **Unit Conversion**: Automatic Celsius/Fahrenheit conversion
- **Response Formatting**: Structured, consistent output format
- **Error Handling**: Comprehensive error management and user feedback

## Testing the Custom Tool

### Test Scenarios

1. **Basic Functionality Test**
```bash
npm start
# Visit http://localhost:3009
# Connect to MCP server
# Test weather for "London"
```

2. **Parameter Validation Test**
```bash
# Test missing location parameter (should fail gracefully)
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{}'
```

3. **Unit Conversion Test**
```bash
# Test Fahrenheit conversion
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{"location": "Paris", "units": "fahrenheit"}'
```

4. **Unknown Location Test**  
```bash
# Test with fictional location (should generate random data)
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{"location": "Atlantis"}'
```

5. **Forecast Test**
```bash
# Test multi-day forecast
curl -X POST http://localhost:3009/api/weather \
  -H "Content-Type: application/json" \
  -d '{"location": "Tokyo", "type": "forecast", "days": 7}'
```

### Expected Results

- ✅ **Current Weather**: Returns temperature, condition, humidity, wind, pressure
- ✅ **Forecasts**: Returns 1-7 days with high/low temps and conditions  
- ✅ **Detailed Info**: Includes sunrise/sunset, moon phase, air quality, pollen
- ✅ **Weather Alerts**: Generates contextual alerts based on conditions
- ✅ **Unit Conversion**: Properly converts temperatures between C/F
- ✅ **Error Handling**: Graceful failure with meaningful error messages
- ✅ **Unknown Locations**: Generates realistic random weather data

## MCP Protocol Implementation

### Server Registration
```javascript
// Tool registration in MCP server
const weatherTool = new WeatherTool();
const weatherSchema = weatherTool.getToolSchema();
this.tools.set(weatherSchema.name, {
    schema: weatherSchema,
    executor: weatherTool
});
```

### Client Tool Calls
```javascript
// Calling the custom tool through MCP
const result = await mcpServer.processRequest('tools/call', {
    name: 'weather_tool',
    arguments: { location: 'London', type: 'current' }
});
```

### Response Format
```javascript
// MCP-compliant response structure
{
    content: [
        {
            type: 'text',
            text: JSON.stringify(weatherData, null, 2)
        }
    ],
    isError: false
}
```

## API Endpoints

### Web UI Endpoints

- `GET /` - Web interface
- `GET /api/health` - Health check
- `GET /api/mcp/status` - Connection status

### MCP Control Endpoints

- `POST /api/mcp/connect` - Connect to MCP server
- `POST /api/mcp/disconnect` - Disconnect from server
- `POST /api/mcp/tools/discover` - Discover available tools

### Weather API Endpoints

- `POST /api/weather` - Get weather information
- `GET /api/weather/:location` - Get weather for specific location

## Performance Metrics

| Operation | Average Time | Description |
|-----------|-------------|-------------|
| Tool Registration | <1ms | Register WeatherTool in MCP server |
| Weather Execution | 1-3ms | Execute weather tool with parameters |
| API Response | 50-100ms | Full request-response cycle |
| UI Update | <200ms | Web interface update with results |

## Future Enhancements

### Potential Improvements

1. **Real Weather APIs**: Integrate with OpenWeatherMap, AccuWeather
2. **Caching Layer**: Cache weather data to improve performance
3. **Historical Data**: Add support for historical weather information
4. **Location Intelligence**: GPS coordinates, address validation
5. **Weather Maps**: Integrate weather radar and satellite imagery
6. **Push Notifications**: Real-time weather alert notifications
7. **Batch Requests**: Support multiple locations in single request
8. **Weather Widgets**: Embeddable weather widgets for websites

### Production Considerations

1. **Rate Limiting**: Implement API rate limiting for production use
2. **Authentication**: Add API key authentication for external access
3. **Monitoring**: Add comprehensive logging and monitoring
4. **Scaling**: Implement horizontal scaling for high traffic
5. **Data Persistence**: Store weather data for analytics
6. **Error Recovery**: Advanced error recovery mechanisms

## Troubleshooting

### Common Issues

**Tool Not Found**
- Verify MCP server is connected and tool is registered
- Check tool name spelling in API calls

**Invalid Parameters** 
- Ensure location parameter is provided
- Verify parameter types match schema (numbers for days, etc.)

**Connection Failed**
- Check if server is running on correct port (3009)
- Verify no other services are using the port

**Weather Data Issues**
- Unknown locations will generate random data (this is expected)
- All data is mock/simulated for demonstration purposes

## License

MIT

---

**Day 9 Achievement**: ✅ Custom WeatherTool MCP implementation complete with tool registration, AI agent integration, comprehensive weather data responses, and interactive web testing interface.

## Quick Start

```bash
cd day9
npm install
npm start
# Visit http://localhost:3009
# Click "Connect to Weather MCP"
# Enter a location and get weather!
```

The WeatherTool demonstrates the complete MCP custom tool workflow: **Tool Creation → MCP Registration → Agent Integration → Meaningful Results**.