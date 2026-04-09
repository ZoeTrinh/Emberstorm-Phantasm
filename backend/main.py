from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# CRITICAL: This allows your React app to talk to this Python server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class ManeuverRequest(BaseModel):
    current_alt: float
    target_alt: float

@app.get("/flare-status")
def get_flare():
    # In a hackathon, you'd fetch real NOAA data here
    return {"status": "WARNING", "intensity": "X-Class", "arrival_time": "14:20 UTC"}

@app.post("/calculate-burn")
def calculate_burn(data: ManeuverRequest):
    # Simple Delta-V Approximation for the hackathon
    dv = abs(data.target_alt - data.current_alt) * 0.05 
    return {"delta_v": round(dv, 4), "fuel_used": "1.2kg"}
