---
title: "Ukur Tepat Waktu Kirim Supplier dan Ekspedisi: Persen Datang Sesuai Janji di Excel"
date: "2026-09-14"
description: "Cara mengukur ketepatan waktu kirim (on-time delivery) supplier dan ekspedisi di Excel agar keterlambatan tercatat dan bisa ditagih perbaikan."
tags: ["Logistik", "Supplier", "Excel"]
---

### Ringkasan: Apa Itu Tepat Waktu Kirim?

Tepat waktu kirim atau on-time delivery adalah persen pesanan yang datang sesuai tanggal janji. Untuk peritel, angka ini menentukan apakah rak terisi dan pelanggan puas. Cara mengukurnya sederhana: catat tanggal janji dan tanggal terima tiap pesanan di Excel, lalu hitung berapa persen yang datang tidak telat. Satu tabel ini cukup untuk menilai supplier dan ekspedisi secara adil.

### Skenario: Janji Senin, Datang Kamis

Pernahkah supplier berjanji barang datang Senin, tetapi baru sampai Kamis tanpa kabar? Anda sudah menolak pelanggan dua hari, staf sudah menelepon tiga kali, dan jawaban yang datang hanya kata sabar. Sebulan kemudian kejadian yang sama terulang, dan Anda lupa sudah berapa kali tepatnya. Tanpa catatan, setiap keterlambatan terasa seperti kejadian pertama. Dengan catatan, pola terlihat: supplier ini telat 4 dari 10 kiriman, alias hanya 60 persen tepat waktu.

### Konsep: Dua Tanggal Menentukan Satu Persen

Pengukuran tepat waktu kirim hanya butuh dua tanggal per pesanan.

Tanggal janji adalah tanggal yang disepakati saat memesan. Minta supplier menyebut tanggal pasti, bukan "dua tiga hari lagi". Tulis tanggalnya di nota pesanan.

Tanggal terima adalah tanggal barang benar-benar sampai dan bisa dijual. Bukan tanggal berangkat dari gudang supplier, bukan tanggal resi dibuat, tetapi tanggal barang ada di tangan Anda.

Pesanan disebut tepat waktu jika tanggal terima sama atau lebih cepat dari tanggal janji. Telat satu hari tetap dihitung telat, karena rak Anda kosong satu hari. Ketegasan ini penting agar datanya jujur.

Rumusnya: tepat waktu kirim sama dengan jumlah pesanan tepat waktu dibagi total pesanan, dikali seratus. Target yang sehat untuk peritel adalah di atas 95 persen untuk supplier utama dan di atas 90 persen untuk ekspedisi.

### Cara Mencatatnya di Microsoft Excel

Buat satu sheet bernama Tepat Waktu. Buat kolom: nomor PO, nama supplier, nama ekspedisi, tanggal janji, tanggal terima, selisih hari, dan status.

Selisih hari dihitung dengan tanggal terima dikurangi tanggal janji. Hasil nol atau negatif berarti tepat waktu atau lebih cepat. Hasil positif berarti telat sekian hari.

Kolom status memakai fungsi IF: jika selisih kurang dari atau sama dengan nol, tulis TEPAT, kalau tidak tulis TELAT. Di bawah tabel, hitung persen tepat waktu dengan COUNTIF status TEPAT dibagi COUNTA semua pesanan, dikali seratus.

Buat dua ringkasan dengan COUNTIFS: satu per supplier, satu per ekspedisi. Tabel ringkasan ini yang dibawa saat negosiasi. Tambahkan conditional formatting agar baris TELAT berwarna merah muda dan selisih di atas 3 hari berwarna merah tua. Keterlambatan parah langsung terlihat tanpa harus membaca satu per satu.

### Wawasan: Keterlambatan yang Tercatat Bisa Ditagih

Supplier dan ekspedisi berubah perilakunya ketika tahu Anda mencatat. Bukan karena takut, tetapi karena pembicaraan menjadi konkret. "Bulan lalu 3 dari 8 kiriman telat, rata-rata 2 hari" jauh lebih kuat daripada "kirimannya sering telat". Dari data ini Anda bisa meminta tiga hal yang wajar: jadwal kirim yang realistis, kabar lebih awal kalau mau telat, dan potongan ongkir untuk keterlambatan parah.

Pisahkan penilaian supplier dan ekspedisi. Seringkali supplier sudah kirim tepat waktu dari gudangnya, tetapi ekspedisi yang menahan barang dua hari. Kalau digabung, supplier yang bagus ikut tercoreng. Dengan kolom terpisah, Anda tahu persis siapa yang harus ditegur: ganti supplier atau ganti ekspedisi.

Simpan arsip per bulan dalam sheet terpisah. Dalam tiga bulan, Anda punya tren yang menunjukkan apakah teguran Anda berdampak. Supplier yang membaik layak diberi porsi order lebih besar. Yang tidak berubah layak diganti, dan Anda punya data untuk menjelaskan keputusan itu ke siapa pun.

### Kemenangan Cepat: Catat 10 Pesanan Berikutnya

Mulai dari pesanan berikutnya hari ini. Tulis tanggal janji yang disebut supplier, lalu tulis tanggal barang benar-benar sampai. Lakukan untuk 10 pesanan. Hitung persennya. Angka pertama ini adalah garis dasar Anda. Bulan depan targetkan naik 10 poin dengan satu tindakan: sampaikan angka bulan ini ke supplier dan ekspedisi Anda, lalu minta komitmen tanggal yang realistis. Pengukuran yang disampaikan hampir selalu memperbaiki perilaku.

### FAQ

**Apa itu tepat waktu kirim?**
Tepat waktu kirim adalah persen pesanan yang tiba sesuai atau sebelum tanggal janji, dihitung dari jumlah pesanan tepat waktu dibagi total pesanan dikali seratus.

**Berapa target tepat waktu yang sehat untuk peritel?**
Targetkan di atas 95 persen untuk supplier utama dan di atas 90 persen untuk ekspedisi. Di bawah 80 persen berarti perlu teguran serius atau penggantian.

**Tanggal apa yang dipakai sebagai patokan?**
Tanggal janji yang disepakati saat memesan dan tanggal barang benar-benar diterima di toko, bukan tanggal berangkat atau tanggal resi.

**Apakah telat satu hari tetap dihitung telat?**
Ya. Telat satu hari berarti rak kosong satu hari. Ketegasan ini menjaga data tetap jujur dan bisa dibandingkan antar bulan.

**Bagaimana memisahkan salah supplier dan salah ekspedisi?**
Catat keduanya di kolom terpisah dan buat ringkasan COUNTIFS masing-masing. Dengan begitu terlihat apakah masalahnya di pengiriman supplier atau di perjalanan ekspedisi.

### Kesimpulan

Satu tabel Excel berisi tanggal janji dan tanggal terima sudah cukup untuk mengubah keterlambatan dari keluhan menjadi data. Ukur, sampaikan angkanya, minta perbaikan. Supplier dan ekspedisi yang bagus akan membaik, yang tidak akan tersaring dengan sendirinya.
