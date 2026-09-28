<?php
$t = microtime(true);
$engineDir = 'C:\\laragon\\www\\rollyn\\spectrum_engine';
$cmd = 'start "" /B cmd /c "cd /d ' . escapeshellarg($engineDir) . ' && python -m uvicorn app:app --host 127.0.0.1 --port 8001 > NUL 2>&1"';
pclose(popen($cmd, "r"));
echo "Done in " . (microtime(true) - $t) . PHP_EOL;
