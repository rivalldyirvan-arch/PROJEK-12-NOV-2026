@echo off
cd /d "e:\IRVAN PC\PROJEK\PROJEK 12 NOV 2026"
git add -A
git commit -m "fix: Perbaiki perhitungan jurnal dan tampilan Net Dibayar untuk pengajuan PR-202611-003 serta normalisasi PPN/PPh"
del "%~f0"
