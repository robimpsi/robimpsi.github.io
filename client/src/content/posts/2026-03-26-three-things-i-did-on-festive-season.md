---
title: Three Things I Did On Festive Season
date: 2026-03-26
description: Here is how I contribute on my work for the recent festive season.
tags: Festive Season, Analysis
---
Ramadhan di Indonesia selalu ditunggu tunggu, tidak hanya oleh masyarakat tapi juga bisnis yang terlibat langsung dengan konsumen.

Di Indonesia, festive season seperti Ramadhan menyimpan lonjakan daya beli yang kuat. Data dari blabla menunjukkan adanya peningkatan konsumsi sebesar blabla %. Ini diperkuat juga dengan fenomena mudik dan ditutup dengan berlebaran.

Ini diperkuat juga dengan data yang kami miliki pada tahun lalu. Dibandingkan dengan bulan biasanya, pada festive season terjadi lonjakan volume transaksi sebesar blabla%.  

Ini yang membuat kami, selaku ritel non franchise terbesar di Provinsi Bengkulu, sangat mengantisipasi lonjakan pembelian yang datang pada tahun ini.

&nbsp;

## Anticipating in Serving Customers

Pada tahun lalu, di malam peak festive season, kami mengalami server down. ERP yang kami gunakan tidak mampu menampung kapasitas transaksi yang jauh di atas normal.

IT Consultant yang mengelola ERP sudah berusaha menangani transaksi sebisa mungkin. Meski demikian, volume customer yang terus menerus masuk ke toko dan transaksi yang macet menciptakan situasi bottleneck, yang membuat customer memilih membatalkan belanja.

Setidaknya kami kehilangan 20% target omzet di malam itu.

&nbsp;

Untuk mengantisipasi hal tersebut terjadi kembali, ada tiga hal yang saya lakukan.

## 1. I built a Google Sheet based PoS as Our PoS Backup

Tahun ini saya sempat membuat PoS sederhana dengan beberapa fungsi macro dan formula. Spreadsheet ini memiliki beberapa worksheet:

1. Worksheet untuk login kasir
2. PoS interface dengan UI dan pilihan metode pembayaran, serta subtotal transaksi dan kembalian
3. Worksheet untuk data transaksi produk
4. Worksheet untuk log pembayaran
5. Worksheet untuk cucian kasir

Secara workflow, spreadsheet ini bisa digunakan layaknya point of sales biasa. Kasir hanya perlu melakukan login dengan username dan PIN yang sudah disediakan, menginput modal awal, lalu bisa melakukan transaksi seperti PoS yang biasa digunakan.

Pengoperasian seperti metode pembayaran ganda, retur, serta laporan kasir bisa dilakukan di PoS ini.

Worksheet ini berjalan cukup baik. Tetapi, PoS sederhana ini tidak bisa mencetak struk dan harus didownload dulu sebelum digunakan. Padahal, mesin PoS yang kami gunakan tidak terinstall perangkat lunak pengolah spreadsheet.

Untuk itu, saya memindahkan spreadsheet ini ke dalam Google Sheet.

### Kenapa Google Sheet?

Google Sheet bisa digunakan di semua mesin PoS dengan browser support. Asalkan seluruh PoS punya akses ke Sheet, maka semua PoS bisa melakukan transaksi dalam satu backend.

Google Sheet juga memiliki Apps Script, yang memungkinkan backend bisa difungsikan dengan Javascript. Frontend dibuat dengan desain berbasis HTML, sehingga memudahkan kasir beradaptasi dengan tampilannya.

&nbsp;

### Hasilnya

PoS ini berjalan baik dalam proses simulasi. Karena tidak ada sinkronisasi dengan backend ERP live, proses scan produk dan operasional berjalan jauh lebih cepat dengan PoS yang biasa kami gunakan.

Saya belum menggunakan PoS ini dalam transaksi langsung. Meski demikian, kami cukup tenang mengetahui bahwa kami punya PoS cadangan yang bisa kami gunakan dalam situasi mendesak.

&nbsp;

## 2. I built a customized price checker.

Saya ju