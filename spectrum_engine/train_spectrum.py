
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from train_spectrum_led import train_spectrum_led_model

def train_spectrum_model():
    return train_spectrum_led_model(300)

if __name__ == "__main__":
    res = train_spectrum_model()
    print(json.dumps(res, indent=2))
