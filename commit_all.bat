@echo off
cd /d "e:\IRVAN PC\PROJEK\PROJEK 12 NOV 2026"
git add -A
git commit -m "feat: Tambahkan kolom PPN di tabel pembelian, pengakuan akrual hutang saat disetujui, pengakuan PPh saat pelunasan di modul pajak, dan tampilan jurnal ganda berdampingan jika lunas"
del "%~f0"
