---
title: "Titik Pesan Ulang Tanpa Tebakan: Kapan Harus Pesan Stok Lagi dari Sisa dan Jualan Harian"
date: "2026-09-14"
description: "Cara menghitung titik pesan ulang (reorder point) di Excel dari sisa stok dan rata-rata jualan harian agar tidak kehabisan dan tidak menumpuk."
tags: ["Stok", "Supply Chain", "Excel"]
---

### Ringkasan: Apa Itu Titik Pesan Ulang?

Titik pesan ulang atau reorder point adalah angka sisa stok yang menjadi sinyal untuk memesan lagi. Untuk peritel, rumusnya sederhana: kalikan rata-rata jualan harian dengan lama barang datang dalam hari, lalu tambah stok pengaman. Hasilnya adalah batas bawah yang kalau tersentuh, pesanan harus segera dibuat. Anda hanya butuh Excel, data jualan harian, dan catatan lama kirim supplier.

### Skenario: Rak Kosong Padahal Baru Pesan

Pernahkah Anda memesan barang hari Senin, tetapi barang datang hari Jumat sementara stok habis hari Rabu? Dua hari rak kosong, pelanggan pulang kecewa. Atau sebaliknya: takut kehabisan, Anda pesan terlalu banyak, gudang penuh, uang kas macet di barang yang tidak bergerak. Kedua masalah ini punya akar yang sama: pesanan dibuat berdasarkan perasaan, bukan berdasarkan angka sisa dan kecepatan jualan.

### Konsep: Tiga Angka yang Menentukan Kapan Pesan

Titik pesan ulang untuk peritel cukup dihitung dari tiga angka.

Pertama, rata-rata jualan harian. Jumlahkan penjualan 30 hari terakhir, bagi 30. Inilah kecepatan barang keluar dari toko Anda.

Kedua, lama barang datang atau lead time. Hitung rata-rata selisih tanggal pesan dan tanggal terima dari tiga pengiriman terakhir supplier tersebut. Kalau supplier A rata-rata 4 hari, pakai angka 4.

Ketiga, stok pengaman atau safety stock. Cadangan untuk jaga-jaga kalau jualan tiba-tiba naik atau kiriman telat. Untuk awal, pakai dua hari jualan sebagai cadangan. Artinya stok pengaman sama dengan rata-rata jualan harian dikali dua.

Rumus akhirnya: titik pesan ulang sama dengan rata-rata jualan harian dikali lama barang datang, ditambah stok pengaman. Contoh: jualan 10 pcs per hari, kiriman 4 hari, cadangan 2 hari. Maka titik pesan ulang adalah 10 dikali 4 ditambah 20, sama dengan 60 pcs. Saat sisa menyentuh 60, pesan lagi hari itu juga.

### Cara Menghitungnya di Microsoft Excel

Buat satu sheet bernama Titik Pesan. Buat kolom: nama barang, sisa stok, rata-rata jualan harian, lama kirim dalam hari, stok pengaman, titik pesan ulang, dan status.

Rata-rata jualan harian dihitung dengan AVERAGE dari kolom penjualan 30 hari. Stok pengaman dihitung dengan rata-rata harian dikali 2. Titik pesan ulang dihitung dengan rata-rata harian dikali lama kirim ditambah stok pengaman.

Kolom status memakai fungsi IF: jika sisa stok kurang dari atau sama dengan titik pesan ulang, tulis PESAN SEKARANG, kalau tidak tulis AMAN. Tambahkan conditional formatting agar baris PESAN SEKARANG berwarna merah muda. Setiap pagi buka file ini, filter yang merah, langsung buat pesanan.

Untuk toko dengan banyak barang, urutkan berdasarkan status merah terlebih dahulu, lalu berdasarkan nilai barang termahal. Barang mahal yang mau habis dipesan duluan karena risikonya paling besar kalau kosong. Barang murah yang habis bisa ditunda sehari tanpa drama, tetapi susu formula atau beras yang kosong langsung mengusir pelanggan ke toko sebelah.

### Wawasan: Stok Pengaman Adalah Harga Ketenangan

Banyak pemilik toko menolak stok pengaman karena dianggap menumpuk modal. Padahal biaya rak kosong lebih mahal: pelanggan yang kecewa jarang kembali, dan staf membuang waktu menjelaskan barang kosong. Dua hari cadangan adalah kompromi yang sehat untuk kebanyakan toko ritel. Kalau supplier Anda sering telat, naikkan menjadi tiga atau empat hari, tetapi catat alasannya: cadangan besar karena supplier tidak bisa diandalkan adalah sinyal untuk mencari supplier cadangan, bukan untuk menumpuk terus.

Perbarui rata-rata jualan setiap awal bulan. Barang musiman seperti sirup saat puasa atau payung saat hujan perlu angka khusus musim, jangan pakai rata-rata tahunan. Pisahkan barang cepat dan lambat: barang yang laku di atas 5 pcs per hari dihitung mingguan, barang lambat cukup bulanan.

### Kemenangan Cepat: Mulai dari 20 Barang Terlaris

Ambil 20 barang terlaris minggu ini. Hitung rata-rata jualan hariannya dari nota 30 hari terakhir. Tanyakan ke supplier berapa lama biasanya barang datang. Hitung titik pesan ulangnya dengan rumus di atas. Tempel angka itu di rak atau di file Excel kasir. Dalam dua minggu, hitung berapa kali rak kosong terjadi. Bandingkan dengan dua minggu sebelumnya. Hampir selalu turun, karena untuk pertama kalinya pesanan punya alarm yang bunyi tepat waktu.

### FAQ

**Apa itu titik pesan ulang?**
Titik pesan ulang adalah batas sisa stok yang menjadi sinyal untuk memesan lagi, dihitung dari rata-rata jualan harian dikali lama kirim ditambah stok pengaman.

**Data apa yang dibutuhkan untuk menghitungnya?**
Tiga data cukup: penjualan harian 30 hari terakhir, rata-rata lama barang datang dari supplier, dan sisa stok saat ini.

**Berapa stok pengaman yang ideal untuk toko kecil?**
Mulai dari dua hari jualan. Naikkan jika supplier sering telat atau barangnya cepat habis saat musim ramai.

**Apakah rumus ini cocok untuk semua barang?**
Cocok untuk barang yang dijual rutin. Untuk barang musiman, hitung rata-rata khusus musim tersebut, bukan rata-rata tahunan.

**Seberapa sering angka ini harus diperbarui?**
Perbarui rata-rata jualan setiap awal bulan, dan lama kirim setiap ada perubahan supplier atau pola keterlambatan baru.

### Kesimpulan

Titik pesan ulang mengubah pesanan stok dari tebakan menjadi alarm otomatis. Satu rumus sederhana di Excel, diperbarui tiap bulan, dan rak kosong berkurang tanpa membuat gudang penuh. Mulai dari 20 barang terlaris, rasakan bedanya dalam dua minggu.
