---
title: "Kartu Nilai Supplier di Excel: Cara Menilai Harga, Ketepatan, dan Kualitas dalam Satu Tabel"
date: "2026-09-14"
description: "Panduan praktis membuat kartu nilai supplier (supplier scorecard) di Microsoft Excel untuk peritel: nilai harga, ketepatan kirim, dan kualitas barang dalam satu tabel objektif."
tags: ["Pengadaan", "Supplier", "Excel"]
---

### Ringkasan: Apa Itu Kartu Nilai Supplier?

Kartu nilai supplier atau supplier scorecard adalah tabel penilaian sederhana yang menggabungkan harga, ketepatan pengiriman, dan kualitas barang menjadi satu skor akhir per supplier. Untuk peritel, alat ini mengubah keputusan belanja dari sekadar perasaan menjadi angka yang bisa dibandingkan. Anda hanya butuh Microsoft Excel, tiga bulan data pembelian, dan satu jam untuk membuatnya.

### Skenario: Supplier Murah yang Selalu Telat

Pernahkah Anda punya supplier dengan harga paling murah, tetapi barangnya selalu datang telat dua hari? Di atas kertas Anda hemat, tetapi di toko rak kosong dan pelanggan kecewa. Sebaliknya ada supplier yang harganya sedikit lebih mahal, tetapi tidak pernah telat dan barang rusak hampir nol. Mana yang sebenarnya lebih menguntungkan? Tanpa catatan yang rapi, Anda hanya bisa menebak. Dengan kartu nilai supplier, jawabannya terlihat jelas dalam satu angka.

### Konsep: Tiga Pilar Penilaian Supplier

Kartu nilai supplier untuk peritel cukup bertumpu pada tiga pilar utama.

Pertama, harga. Bandingkan harga per unit tiap supplier untuk barang yang sama. Supplier termurah mendapat nilai tertinggi.

Kedua, ketepatan kirim atau on-time delivery. Hitung persen pesanan yang datang sesuai janji. Rumusnya sederhana: jumlah pesanan tepat waktu dibagi total pesanan, dikali seratus. Supplier dengan angka di atas 95 persen layak mendapat nilai penuh.

Ketiga, kualitas barang. Hitung persen barang rusak, kedaluwarsa dekat, atau tidak sesuai pesanan. Semakin kecil angka kerusakan, semakin tinggi nilainya.

Tiga pilar ini diberi bobot sesuai prioritas toko Anda. Contoh yang umum dipakai peritel kecil: harga 40 persen, ketepatan kirim 30 persen, kualitas 30 persen. Kalau toko Anda menjual makanan segar, naikkan bobot kualitas menjadi 40 persen karena barang rusak langsung menjadi rugi.

### Cara Membuatnya di Microsoft Excel

Buat satu file Excel dengan satu sheet bernama Nilai Supplier. Buat kolom: nama supplier, skor harga 1 sampai 5, skor ketepatan 1 sampai 5, skor kualitas 1 sampai 5, lalu kolom skor akhir.

Skor akhir dihitung dengan rumus rata-rata berbobot. Misalnya harga di kolom B, ketepatan di kolom C, kualitas di kolom D, maka skor akhir di kolom E adalah harga dikali 40 persen ditambah ketepatan dikali 30 persen ditambah kualitas dikali 30 persen. Di Excel rumusnya menjadi sama dengan B2 kali 0,4 ditambah C2 kali 0,3 ditambah D2 kali 0,3.

Untuk skor harga, gunakan fungsi RANK agar otomatis. Supplier dengan rata-rata harga terendah mendapat peringkat satu. Untuk ketepatan kirim, gunakan COUNTIFS untuk menghitung pesanan tepat waktu dibagi total pesanan per supplier. Untuk kualitas, gunakan SUMIFS untuk menjumlah barang rusak per supplier dibagi total barang diterima.

Tambahkan conditional formatting: skor akhir di atas 4 beri warna hijau, 3 sampai 4 kuning, di bawah 3 merah. Sekali lihat, Anda tahu supplier mana yang hijau dan perlu dipertahankan, mana yang merah dan perlu diajak bicara.

### Wawasan: Data Membuat Negosiasi Lebih Tenang

Supplier yang baik tidak tersinggung saat dinilai. Justru mereka menghargai pembeli yang punya data. Ketika Anda bisa menunjukkan bahwa ketepatan kirim mereka turun dari 97 persen menjadi 82 persen dalam dua bulan, pembicaraan menjadi fokus pada perbaikan, bukan emosi. Kartu nilai juga melindungi Anda dari jebakan harga murah. Supplier dengan harga termurah tetapi skor akhir rendah biasanya menyimpan biaya tersembunyi: rak kosong, komplain pelanggan, dan jam kerja staf yang terbuang untuk menagih kiriman.

Perbarui kartu ini setiap tiga bulan. Simpan arsip tiap kuartal dalam sheet terpisah bernama Q1, Q2, Q3, Q4. Dalam setahun Anda punya tren yang menunjukkan supplier mana yang membaik dan mana yang makin buruk. Tren empat kuartal jauh lebih meyakinkan daripada satu kejadian telat kemarin.

### Kemenangan Cepat: Mulai dari Lima Supplier Hari Ini

Ambil lima supplier terbesar Anda minggu ini. Nilai ketiganya secara jujur skala 1 sampai 5 untuk harga, ketepatan, dan kualitas berdasarkan ingatan tiga bulan terakhir. Hitung skor akhir dengan bobot 40-30-30. Hasilnya mungkin mengejutkan: supplier langganan Anda belum tentu juara. Minggu depan, ganti ingatan dengan data nyata dari nota dan catatan terima barang. Dalam satu bulan, Anda sudah punya kartu nilai versi pertama yang bisa dipakai untuk negosiasi harga berikutnya.

### FAQ

**Apa itu kartu nilai supplier?**
Kartu nilai supplier adalah tabel penilaian yang menggabungkan harga, ketepatan pengiriman, dan kualitas barang menjadi satu skor akhir agar supplier bisa dibandingkan secara objektif.

**Berapa bobot ideal untuk toko ritel kecil?**
Mulai dari harga 40 persen, ketepatan kirim 30 persen, dan kualitas 30 persen. Sesuaikan jika barang Anda mudah rusak, naikkan bobot kualitas.

**Data apa yang dibutuhkan untuk membuatnya di Excel?**
Tiga data cukup: daftar harga per supplier, tanggal janji dan tanggal terima tiap pesanan, serta jumlah barang rusak atau tidak sesuai per pengiriman.

**Seberapa sering kartu nilai harus diperbarui?**
Perbarui setiap tiga bulan. Interval kuartalan cukup stabil untuk melihat tren dan cukup cepat untuk menangkap penurunan performa.

**Apakah supplier akan tersinggung jika dinilai?**
Umumnya tidak, selama penilaian berbasis data dan disampaikan sebagai ajakan perbaikan. Supplier profesional justru menghargai pembeli yang tertib administrasi.

### Kesimpulan

Kartu nilai supplier di Excel adalah langkah termurah untuk merapikan pengadaan toko Anda. Satu tabel, tiga pilar penilaian, diperbarui tiap kuartal. Keputusan belanja menjadi tenang karena didukung angka, bukan sekadar kebiasaan atau kedekatan personal.
