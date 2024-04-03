#!/bin/sh

set -e

webpack
mkdir -p assets/scan

find node_modules/dynamsoft-*/dist/*.wasm -exec cp {} assets/scan/ \;
cp node_modules/dynamsoft-core/dist/core.worker.js assets/scan/
cp node_modules/dynamsoft-capture-vision-router/dist/cvr.worker.js assets/scan/
cp node_modules/dynamsoft-capture-vision-std/dist/std.js assets/scan/
cp node_modules/dynamsoft-barcode-reader/dist/DBR-PresetTemplates.json assets/scan/
