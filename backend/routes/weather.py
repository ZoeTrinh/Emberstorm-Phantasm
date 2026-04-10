from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()

@router.get("/weather")
async def get_weather(lat: float, lon: float):
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,"
        f"windspeed_10m_max,uv_index_max,weathercode"
        f"&hourly=visibility,cloudcover,relative_humidity_2m"
        f"&current_weather=true"
        f"&timezone=auto&forecast_days=7"
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Could not connect to weather service")
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Weather service returned an error")