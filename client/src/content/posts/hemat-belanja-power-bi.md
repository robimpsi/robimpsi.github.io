---
title: "Hemat Belanja Terlihat dengan Power BI: Selisih Harga Lama Lawan Harga Baru Jadi Grafik"
date: "2026-09-15"
description: "Cara membangun dashboard procurement savings di Power BI: visualisasikan selisih harga lama lawan harga baru per supplier agar hasil negosiasi terlihat bos."
tags: ["Pengadaan", "Power BI", "Dashboard"]
---

### Ringkasan: Apa Itu Procurement Savings Dashboard?

Procurement savings dashboard adalah satu layar Power BI yang menunjukkan berapa uang berhasil dihemat dari negosiasi harga: harga lama dikurangi harga baru, dikali volume belanja. Untuk admin dan analis, dashboard ini mengubah kerja tak terlihat menjadi grafik yang bisa ditunjukkan ke pemilik. Anda butuh tiga tabel sederhana: daftar harga lama, daftar harga baru, dan data pembelian.

### Skenario: Hemat Banyak, Tidak Ada yang Tahu

Pernahkah Anda berhasil menurunkan harga gula dari supplier Rp500 per kilo, tetapi tidak ada yang menyadari karena angkanya tenggelam di nota? Setahun kemudian pemilik bertanya apa hasil kerja bagian pengadaan, dan Anda hanya bisa menjawab dengan cerita. Tanpa visual, penghematan terasa abstrak. Dengan dashboard, satu angka besar di layar berkata jujur: Rp14 juta hemat tahun ini.

### Konsep: Tiga Angka Pembentuk Savings

Savings atau penghematan dihitung dari tiga angka per barang.

Old price adalah harga sebelum negosiasi. New price adalah harga setelah negosiasi berhasil. Quantity adalah volume yang dibeli dengan harga baru selama periode berjalan.

Rumus dasarnya dalam DAX measure:

```dax
Total Savings = SUMX(Purchases, Purchases[Qty] * (Purchases[Old_Price] - Purchases[New_Price]))
```

SUMX dipakai karena selisih harga tiap barang berbeda, jadi perkalian harus dihitung per baris dulu baru dijumlahkan. Jangan pakai perkalian total rata-rata, hasilnya akan meleset.

Dua measure pendamping yang wajib ada:

```dax
Savings % = DIVIDE([Total Savings], SUMX(Purchases, Purchases[Qty] * Purchases[Old_Price]))
```

```dax
Avg Discount per Unit = AVERAGEX(Purchases, Purchases[Old_Price] - Purchases[New_Price])
```

Savings persen menunjukkan efisiensi relatif, sedangkan rata-rata diskon per unit berguna untuk membandingkan kategori barang yang volumenya beda jauh.

### Cara Membangunnya di Power BI

Siapkan model dengan tiga tabel. Tabel Products berisi kode barang dan nama barang. Tabel Suppliers berisi kode dan nama supplier. Tabel Purchases berisi tiap transaksi: tanggal, kode barang, kode supplier, Qty, Old_Price, New_Price. Relasikan Purchases ke Products dan Suppliers lewat kode masing-masing dengan relasi satu ke banyak.

Buat halaman dashboard berisi empat visual. Pertama, card besar Total Savings sebagai angka utama. Kedua, bar chart savings per supplier agar terlihat siapa yang paling banyak memberi penurunan harga. Ketiga, line chart savings per bulan untuk melihat tren negosiasi sepanjang tahun. Keempat, table detail berisi barang, supplier, harga lama, harga baru, volume, dan savings per baris untuk audit.

Tambahkan slicer bulan dan kategori barang. Dengan slicer, pemilik bisa bertanya berapa hemat kategori minuman bulan lalu, dan jawabannya muncul dalam sekali klik. Tambahkan conditional formatting pada tabel: savings negatif berwarna merah karena artinya harga baru justru lebih mahal dan perlu dijelaskan.

Gunakan Power Query di dalam Power BI untuk membersihkan data sebelum divisualkan. Bersihkan nama supplier yang ganda, ubah tipe kolom harga menjadi decimal, dan buang baris nota batal. Dashboard yang datanya kotor akan langsung kehilangan kepercayaan, seindah apa pun grafiknya.

### Wawasan: Yang Terlihat Akan Dipertahankan

Dashboard savings mengubah posisi bagian pengadaan di mata pemilik. Selama ini pengadaan dianggap bagian belanja, padahal dengan data ia adalah bagian penghasil. Ketika grafik menunjukkan Rp14 juta hemat dalam setahun, anggaran untuk perbaikan sistem jadi mudah disetujui. Sebaliknya kalau tren savings menurun tiga bulan berturut-turut, itu sinyal awal untuk meninjau ulang kontrak supplier sebelum kebocoran makin besar.

Hati-hati dengan jebakan angka. Savings hanya valid kalau kualitas dan volume sebanding. Harga turun tetapi barang rusak naik bukan penghematan, melainkan kerugian yang tertunda. Selalu tampilkan kartu pendamping berisi return rate atau komplain agar grafik hemat tidak berdiri sendiri tanpa konteks kualitas.

Refresh data sebulan sekali sudah cukup untuk toko kecil. Jadwalkan refresh otomatis lewat Power BI Service atau cukup publish ulang file setiap awal bulan. Konsistensi jadwal lebih penting daripada kecanggihan visual.

### Kemenangan Cepat: Satu Card dari 10 Barang

Ambil 10 barang dengan volume belanja terbesar bulan lalu. Catat harga lama dan harga barunya. Masukkan ke Power BI Desktop, buat satu measure Total Savings seperti contoh di atas, tampilkan dalam satu card. Tunjukkan angka itu ke pemilik minggu ini. Kalau angkanya positif dan besar, Anda baru saja membuktikan nilai kerja pengadaan dalam satu layar.

### FAQ

**Apa itu procurement savings dashboard?**
Dashboard yang menampilkan total penghematan dari negosiasi harga, dihitung dari selisih harga lama dan baru dikali volume, divisualkan per supplier dan per bulan.

**DAX measure apa yang wajib ada?**
Total Savings dengan SUMX per baris, Savings persen dengan DIVIDE, dan rata-rata diskon per unit dengan AVERAGEX.

**Tabel apa saja yang dibutuhkan?**
Tiga tabel cukup: Products, Suppliers, dan Purchases yang berisi tanggal, kode barang, kode supplier, Qty, Old_Price, dan New_Price.

**Kenapa harus pakai SUMX bukan perkalian biasa?**
Karena selisih harga tiap barang berbeda, perkalian harus dihitung per baris transaksi dulu baru dijumlahkan agar hasilnya akurat.

**Seberapa sering dashboard harus di-refresh?**
Sebulan sekali cukup untuk toko kecil. Yang penting jadwalnya konsisten agar tren bisa dibandingkan antar bulan.

### Kesimpulan

Dashboard savings di Power BI membuat hasil negosiasi terlihat dan bisa dipertahankan. Satu card angka, satu grafik supplier, satu tren bulanan. Mulai dari 10 barang terbesar, buktikan nilainya minggu ini.
