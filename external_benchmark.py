"""
================================================================================
ROLLYN SPECTRUM AI - EXTERNAL MANUAL & AUTOMATED BENCHMARK SUITE
================================================================================
Script ini dirancang untuk dijalankan oleh Anda dan tim Anda dari komputer mana pun
di jaringan lokal untuk menguji performa, latensi, dan kepatuhan keselamatan SPECTRUM AI.
"""

import sys
import time
import json

try:
    import requests
except ImportError:
    print("[ERROR] Library 'requests' belum terpasang. Jalankan: pip install requests")
    sys.exit(1)

# Ganti BASE_URL jika server berjalan di port atau IP tertentu (misal: http://192.168.1.100 atau http://localhost)
BASE_URL = "http://127.0.0.1:8000" if len(sys.argv) < 2 else sys.argv[1]

print("=" * 80)
print("       ROLLYN SPECTRUM AI - EXTERNAL BENCHMARKING CLIENT")
print("=" * 80)
print(f"Target Server URL : {BASE_URL}")
print(f"Timestamp         : {time.strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# ------------------------------------------------------------------------------
# 1. TEST KONEKSI KE SERVER
# ------------------------------------------------------------------------------
print("\n[STEP 1] Memeriksa status konektivitas endpoint SPECTRUM AI...")
sample_url = f"{BASE_URL}/api/v1/spectrum/sample-rolls"

try:
    resp = requests.get(sample_url, timeout=5)
    if resp.status_code != 200:
        # Coba port 80 (Laragon default vhost)
        if ":8000" in BASE_URL:
            BASE_URL = "http://localhost"
            sample_url = f"{BASE_URL}/api/v1/spectrum/sample-rolls"
            resp = requests.get(sample_url, timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"  [OK] Server merespons (Status: {resp.status_code})")
        print(f"  [OK] Dataset riil ditemukan: {data.get('total_in_dataset', 0):,} roll tersedia.")
        sample_rolls = data.get("samples", [])
    else:
        print(f"  [FAIL] Server merespons dengan status HTTP {resp.status_code}")
        sample_rolls = []
except Exception as e:
    print(f"  [ERROR] Tidak dapat terhubung ke {BASE_URL}: {e}")
    print("  Pastikan server Laravel aktif (misal: 'php artisan serve' atau via Laragon).")
    sample_rolls = []

# ------------------------------------------------------------------------------
# 2. UJI KESELAMATAN GRAVITASI (ZERO-TOLERANCE AUDIT)
# ------------------------------------------------------------------------------
print("\n[STEP 2] Menguji Aturan Keselamatan Gravitasi K3 (Zero-Tolerance Safety)...")
heavy_payload = {
    "no_roll": "TEST-HEAVY-2TON",
    "weight": 1850,  # 1.85 Ton (Beban Sangat Berat)
    "grade": "SPECTA - TK4",
    "gsm": 420,
    "jop": "JOP-SAFETY-AUDIT"
}

recommend_url = f"{BASE_URL}/api/v1/spectrum/recommend"
try:
    t0 = time.perf_counter()
    resp = requests.post(recommend_url, json=heavy_payload, timeout=5)
    dur_ms = (time.perf_counter() - t0) * 1000

    if resp.status_code == 200:
        rec = resp.json().get("recommendation", {})
        slot = rec.get("recommendedSlot", {})
        slot_code = slot.get("code")
        tier = slot.get("tier")
        confidence = rec.get("confidence")

        print(f"  Input Roll       : 1.850 kg (Beban Berat)")
        print(f"  Rekomendasi Slot : {slot_code} (Tier {tier})")
        print(f"  Confidence Score : {confidence}%")
        print(f"  Waktu Respon     : {dur_ms:.2f} ms")

        if tier in [1, 2]:
            print("  Status Audit K3  : [PASSED] Roll berat ditempatkan dengan aman di fondasi lantai!")
        else:
            print("  Status Audit K3  : [CRITICAL VIOLATION] Roll berat dialokasikan ke Tier 3 atau 4!")
    else:
        print(f"  [FAIL] HTTP Status: {resp.status_code}")
except Exception as e:
    print(f"  [ERROR] {e}")

# ------------------------------------------------------------------------------
# 3. BENCHMARK LATENSI BERULANG (THROUGHPUT TEST - 50 REQUESTS)
# ------------------------------------------------------------------------------
TEST_COUNT = 50
print(f"\n[STEP 3] Menjalankan Benchmark Melalui Jaringan ({TEST_COUNT} Permintaan Beruntun)...")

latencies = []
success_count = 0

for i in range(TEST_COUNT):
    # Ambil data acak atau rotasi dari sample rolls
    roll = sample_rolls[i % len(sample_rolls)] if sample_rolls else {
        "no_roll": f"BENCH-{i+1:03d}",
        "weight": 1000 + (i * 5),
        "grade": "SPECTA - LY3",
        "gsm": 500,
        "jop": "JOP-0726-00001"
    }

    t_req = time.perf_counter()
    try:
        r = requests.post(recommend_url, json=roll, timeout=5)
        d_ms = (time.perf_counter() - t_req) * 1000
        latencies.append(d_ms)
        if r.status_code == 200:
            success_count += 1
    except Exception:
        pass

    # Print progress bar
    progress = int(((i + 1) / TEST_COUNT) * 40)
    bar = "=" * progress + "-" * (40 - progress)
    sys.stdout.write(f"\r  Progress: [{bar}] {i+1}/{TEST_COUNT} roll")
    sys.stdout.flush()

print("\n")

if latencies:
    latencies.sort()
    avg_lat = sum(latencies) / len(latencies)
    p50 = latencies[int(len(latencies) * 0.50)]
    p95 = latencies[int(len(latencies) * 0.95)]
    min_lat = min(latencies)
    max_lat = max(latencies)
    throughput = 1000.0 / avg_lat

    print("=" * 80)
    print("                    HASIL BENCHMARK EKSTERNAL")
    print("=" * 80)
    print(f"Total Permintaan Berhasil : {success_count} / {TEST_COUNT} ({(success_count/TEST_COUNT)*100:.1f}%)")
    print(f"Latensi Rata-rata         : {avg_lat:.2f} ms (Roundtrip Network + AI)")
    print(f"Latensi Tercepat (Min)    : {min_lat:.2f} ms")
    print(f"Latensi Median (p50)      : {p50:.2f} ms")
    print(f"Latensi Percentile 95     : {p95:.2f} ms")
    print(f"Latensi Maksimal          : {max_lat:.2f} ms")
    print(f"Estimasi Throughput       : {throughput:.1f} permintaan / detik")
    print("=" * 80)
    print("STATUS: BENCHMARK SUKSES DAN SIAP DIUJI OLEH SELURUH TIM ANDA!")
    print("=" * 80)

