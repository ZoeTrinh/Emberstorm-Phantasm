from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()

@router.get("/sun")
async def get_sun_data(lat: float, lon: float):
    url = f"https://api.sunrise-sunset.org/json?lat={lat}&lng={lon}&formatted=0"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Could not connect to sunrise service")
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Sunrise service returned an error")