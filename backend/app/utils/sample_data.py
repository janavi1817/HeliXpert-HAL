import csv
import random
from pathlib import Path
from app.core.config import SAMPLE_DIR

SAMPLE_CSV_PATH = SAMPLE_DIR / "helicopters_dataset.csv"

MODELS_INFO = [
    # HAL Helicopters (India)
    {"model": "HAL Dhruv ALH Mk III", "manufacturer": "HAL", "country": "India", "engine_type": "Turboshaft (Shakti 1H1)", "fuel_cap": 1400, "speed": 290, "range": 630, "year_range": (2012, 2024)},
    {"model": "HAL Prachand LCH", "manufacturer": "HAL", "country": "India", "engine_type": "Twin Turboshaft (Shakti)", "fuel_cap": 1150, "speed": 280, "range": 550, "year_range": (2018, 2024)},
    {"model": "HAL Rudra (ALH-WSI)", "manufacturer": "HAL", "country": "India", "engine_type": "Twin Turboshaft (Shakti 1H1)", "fuel_cap": 1350, "speed": 285, "range": 600, "year_range": (2014, 2023)},
    {"model": "HAL Light Utility Helicopter (LUH)", "manufacturer": "HAL", "country": "India", "engine_type": "Single Turboshaft (HE-Ardiden 1U)", "fuel_cap": 600, "speed": 250, "range": 500, "year_range": (2019, 2024)},
    {"model": "HAL Chetak", "manufacturer": "HAL", "country": "India", "engine_type": "Turbomeca Artouste IIIB", "fuel_cap": 575, "speed": 210, "range": 450, "year_range": (1985, 2015)},
    {"model": "HAL Cheetah", "manufacturer": "HAL", "country": "India", "engine_type": "Turbomeca Artouste IIIB", "fuel_cap": 560, "speed": 205, "range": 420, "year_range": (1988, 2016)},
    
    # Boeing (USA)
    {"model": "Boeing AH-64E Apache", "manufacturer": "Boeing", "country": "USA", "engine_type": "Twin Turboshaft (GE T700-701D)", "fuel_cap": 1420, "speed": 293, "range": 476, "year_range": (2015, 2024)},
    {"model": "Boeing CH-47F Chinook", "manufacturer": "Boeing", "country": "USA", "engine_type": "Twin Turboshaft (Honeywell T55-GA-714A)", "fuel_cap": 3914, "speed": 302, "range": 741, "year_range": (2012, 2023)},
    
    # Sikorsky (USA)
    {"model": "Sikorsky UH-60M Black Hawk", "manufacturer": "Sikorsky", "country": "USA", "engine_type": "Twin Turboshaft (GE T700-GE-701D)", "fuel_cap": 1360, "speed": 294, "range": 590, "year_range": (2010, 2022)},
    {"model": "Sikorsky MH-60R Seahawk", "manufacturer": "Sikorsky", "country": "USA", "engine_type": "Twin Turboshaft (GE T700-401C)", "fuel_cap": 1600, "speed": 270, "range": 830, "year_range": (2016, 2024)},
    
    # Airbus Helicopters (France/Germany)
    {"model": "Airbus H125 Écureuil", "manufacturer": "Airbus Helicopters", "country": "France", "engine_type": "Turbomeca Arriel 2D", "fuel_cap": 540, "speed": 287, "range": 662, "year_range": (2008, 2023)},
    {"model": "Airbus H145", "manufacturer": "Airbus Helicopters", "country": "Germany", "engine_type": "Twin Turbomeca Arriel 2E", "fuel_cap": 903, "speed": 268, "range": 650, "year_range": (2015, 2024)},
    {"model": "Airbus H225M Caracal", "manufacturer": "Airbus Helicopters", "country": "France", "engine_type": "Twin Turboshaft (Makila 2A1)", "fuel_cap": 2560, "speed": 324, "range": 857, "year_range": (2011, 2022)},
    
    # Bell (USA)
    {"model": "Bell 407GXi", "manufacturer": "Bell", "country": "USA", "engine_type": "Rolls-Royce 250-C47E/4", "fuel_cap": 484, "speed": 246, "range": 624, "year_range": (2016, 2024)},
    {"model": "Bell 412EP", "manufacturer": "Bell", "country": "USA", "engine_type": "Pratt & Whitney PT6T-3D", "fuel_cap": 1250, "speed": 259, "range": 674, "year_range": (2005, 2021)},
    
    # Mil (Russia)
    {"model": "Mil Mi-17V-5", "manufacturer": "Mil", "country": "Russia", "engine_type": "Klimov VK-2500", "fuel_cap": 2617, "speed": 250, "range": 580, "year_range": (2010, 2021)},
    {"model": "Kamov Ka-226T", "manufacturer": "Kamov", "country": "Russia", "engine_type": "Twin Turbomeca Arrius 2G1", "fuel_cap": 770, "speed": 250, "range": 600, "year_range": (2015, 2023)}
]

STATUS_CHOICES = ["Active", "Active", "Active", "Active", "Maintenance", "Standby", "Inspection Required", "Decommissioned"]

def generate_sample_dataset(num_records: int = 120, output_path: Path = SAMPLE_CSV_PATH) -> Path:
    """Generate realistic helicopter dataset CSV"""
    random.seed(42) # Reproducible
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    rows = []
    headers = [
        "helicopter_id", "model", "manufacturer", "year", "engine_type",
        "engine_hours", "flight_hours", "fuel_capacity", "max_speed",
        "range_km", "country", "status"
    ]
    
    # Ensure HAL has around 47 helicopters as in prompt example!
    # "How many helicopters are manufactured by HAL?" -> "There are 47 helicopters manufactured by HAL in the uploaded dataset."
    hal_models = [m for m in MODELS_INFO if m["manufacturer"] == "HAL"]
    non_hal_models = [m for m in MODELS_INFO if m["manufacturer"] != "HAL"]
    
    id_counter = 1
    
    # Generate 47 HAL helicopters
    for i in range(47):
        m = random.choice(hal_models)
        year = random.randint(m["year_range"][0], m["year_range"][1])
        age = 2025 - year
        flt_hours = int(max(45, age * random.uniform(150, 420) + random.uniform(10, 100)))
        eng_hours = int(flt_hours * random.uniform(1.05, 1.18))
        fuel = m["fuel_cap"] + random.randint(-20, 30)
        speed = m["speed"] + random.randint(-5, 8)
        range_km = m["range"] + random.randint(-15, 25)
        status = random.choice(STATUS_CHOICES)
        if year >= 2022:
            status = "Active"
            
        rows.append({
            "helicopter_id": f"HEL-HAL-{id_counter:04d}",
            "model": m["model"],
            "manufacturer": m["manufacturer"],
            "year": year,
            "engine_type": m["engine_type"],
            "engine_hours": eng_hours,
            "flight_hours": flt_hours,
            "fuel_capacity": fuel,
            "max_speed": speed,
            "range_km": range_km,
            "country": m["country"],
            "status": status
        })
        id_counter += 1

    # Generate remaining helicopters (73 records, total 120)
    for i in range(73):
        m = random.choice(non_hal_models)
        year = random.randint(m["year_range"][0], m["year_range"][1])
        age = 2025 - year
        flt_hours = int(max(50, age * random.uniform(180, 500) + random.uniform(20, 120)))
        eng_hours = int(flt_hours * random.uniform(1.05, 1.20))
        fuel = m["fuel_cap"] + random.randint(-30, 40)
        speed = m["speed"] + random.randint(-8, 10)
        range_km = m["range"] + random.randint(-20, 30)
        status = random.choice(STATUS_CHOICES)
        if year >= 2023:
            status = "Active"
            
        prefix = m["manufacturer"].split()[0][:3].upper()
        rows.append({
            "helicopter_id": f"HEL-{prefix}-{id_counter:04d}",
            "model": m["model"],
            "manufacturer": m["manufacturer"],
            "year": year,
            "engine_type": m["engine_type"],
            "engine_hours": eng_hours,
            "flight_hours": flt_hours,
            "fuel_capacity": fuel,
            "max_speed": speed,
            "range_km": range_km,
            "country": m["country"],
            "status": status
        })
        id_counter += 1

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
        
    return output_path

if __name__ == "__main__":
    generate_sample_dataset()
    print(f"Generated sample dataset at {SAMPLE_CSV_PATH}")
