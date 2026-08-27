import easyocr
import sys
import io

# Redirect stdout to avoid tqdm crashing the non-interactive terminal
sys.stdout = io.StringIO()

try:
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    print("SUCCESS: EasyOCR models downloaded and loaded.", file=sys.stderr)
except Exception as e:
    print(f"FAILED: {e}", file=sys.stderr)
