<?php
require __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$filePath = __DIR__ . '/../07. Database Report FG Juli 26.xlsx';

if (!file_exists($filePath)) {
    echo "File not found: $filePath\n";
    exit(1);
}

echo "File exists, size: " . filesize($filePath) . " bytes\n";

$reader = IOFactory::createReaderForFile($filePath);
$reader->setReadDataOnly(true);

$sheetNames = $reader->listWorksheetNames($filePath);
echo "Sheets (" . count($sheetNames) . "):\n";
foreach ($sheetNames as $idx => $name) {
    echo "  [$idx] $name\n";
}

$spreadsheet = $reader->load($filePath);
foreach ($sheetNames as $name) {
    $sheet = $spreadsheet->getSheetByName($name);
    $highestRow = $sheet->getHighestRow();
    $highestCol = $sheet->getHighestColumn();
    echo "\n--- Sheet: $name ($highestRow rows, highest col: $highestCol) ---\n";
    
    // Sample first 5 rows
    $maxRows = min(5, $highestRow);
    for ($r = 1; $r <= $maxRows; $r++) {
        $rowVals = [];
        for ($c = 'A'; $c <= min($highestCol, 'Z'); $c++) {
            $val = $sheet->getCell($c . $r)->getValue();
            if ($val !== null && $val !== '') {
                $rowVals[$c] = substr(strval($val), 0, 30);
            }
        }
        echo "Row $r: " . json_encode($rowVals, JSON_UNESCAPED_UNICODE) . "\n";
    }
}

