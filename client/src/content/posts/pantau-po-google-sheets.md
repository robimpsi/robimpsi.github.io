---
title: "Pantau PO Sampai Terima Barang dengan Google Sheets: Status Pesan, Kirim, dan Kurang"
date: "2026-09-15"
description: "Cara membuat tracker purchase order (PO) di Google Sheets: status pesan, kirim, terima, dan selisih kurang barang, lengkap dengan formula siap pakai."
tags: ["Pengadaan", "Google Sheets", "Supply Chain"]
---

### Ringkasan: Apa Itu PO Tracker?

PO tracker adalah satu sheet Google Sheets yang mencatat setiap purchase order dari status ordered, shipped, sampai received, lengkap dengan selisih kurang barang. Untuk tim kecil, alat ini menggantikan chat yang tenggelam dan nota kertas yang hilang. Satu link dibagikan ke staf toko, admin, dan pemilik, semua melihat status yang sama secara real-time.

### Skenario: PO Tenggelam di Chat

Pernahkah Anda memesan barang lewat chat, lalu seminggu kemudian lupa apakah barangnya sudah datang atau belum? Staf gudang bilang belum terima, supplier bilang sudah kirim, dan Anda terjebak di tengah tanpa bukti. Masalahnya bukan orangnya, tetapi tidak ada satu tempat pencatatan yang dilihat semua orang. PO tracker menyelesaikan ini: setiap pesanan punya baris sendiri dengan status yang jelas.

### Konsep: Empat Status Cukup untuk Toko Kecil

Jangan bikin rumit. Empat status ini cukup untuk kebanyakan toko ritel.

Ordered berarti PO sudah dikirim ke supplier. Shipped berarti supplier bilang barang sudah jalan. Received berarti barang sudah sampai dan dihitung. Short berarti barang datang tetapi jumlahnya kurang dari yang dipesan.

Setiap baris PO mencatat nomor PO, tanggal pesan, nama supplier, nama barang, jumlah pesan, jumlah terima, selisih kurang, dan status. Selisih kurang adalah jumlah pesan dikurangi jumlah terima. Kalau hasilnya nol, berarti lengkap. Kalau positif, berarti ada yang kurang dan perlu ditagih.

### Cara Membuatnya di Google Sheets

Buat sheet bernama PO Tracker. Isi header di baris 1: PO Number, Order Date, Supplier, Item, Qty Ordered, Qty Received, Shortage, Status.

Selisih kurang di kolom G dihitung otomatis:

```
=IF(F2="", "", E2-F2)
```

Artinya kalau kolom terima masih kosong, selisih dikosongkan dulu agar tidak menakutkan. Begitu angka terima diisi, selisih langsung muncul.

Status di kolom H bisa diisi manual lewat dropdown, atau otomatis dengan formula:

```
=IF(F2="", IF(C2<>"", "Ordered", ""), IF(F2>=E2, "Received", "Short"))
```

Artinya kalau belum ada angka terima tetapi supplier sudah diisi, statusnya Ordered. Kalau angka terima sudah sama atau lebih dari pesanan, statusnya Received. Kalau kurang, statusnya Short.

Untuk status Shipped, tambahkan kolom Ship Date. Kalau kolom itu terisi tetapi barang belum datang, ubah formula status agar menampilkan Shipped. Tambahkan conditional formatting: Ordered kuning, Shipped biru, Received hijau, Short merah. Satu layar, semua status terbaca dalam sedetik. Kalau PO sudah lewat seminggu dari tanggal pesan tanpa kabar, tandai follow up dan telepon supplier hari itu juga, jangan tunggu sampai stok habis baru panik.

Gunakan data validation untuk kolom Supplier dan Item agar pengetikan konsisten. Nama supplier yang kadang disingkat kadang lengkap akan merusak rekap nanti. Buat sheet kedua bernama Master berisi daftar supplier dan barang, lalu arahkan dropdown ke sana.

### Wawasan: Transparansi Mengurangi Saling Salah

Nilai terbesar PO tracker bukan formulanya, tetapi transparansinya. Ketika supplier tahu Anda mencatat setiap selisih, kekurangan barang jarang terulang. Ketika staf tahu pemilik bisa melihat status kapan saja, update menjadi rajin tanpa disuruh. Google Sheets cocok untuk ini karena gratis, bisa dibuka di HP, dan riwayat perubahannya tercatat otomatis lewat version history. Kalau ada yang mengubah angka, ketahuan siapa dan kapan.

Pisahkan hak akses dengan benar. Staf gudang boleh edit kolom Qty Received saja lewat protected ranges. Kolom harga dan supplier biarkan hanya admin dan pemilik yang bisa ubah. Caranya lewat menu Data lalu Protect sheets and ranges. Transparan bukan berarti semua orang bisa ubah semua hal.

Arsipkan tiap bulan dengan menduplikasi sheet menjadi PO-2026-09, PO-2026-10, dan seterusnya. Sheet aktif selalu ringan, arsip tetap bisa dibuka kalau ada komplain dua bulan kemudian.

### Kemenangan Cepat: Lacak 5 PO Aktif Minggu Ini

Ambil lima pesanan yang sedang berjalan minggu ini. Masukkan ke sheet baru dengan format di atas. Bagikan linknya ke staf gudang dan minta mereka mengisi kolom terima saat barang datang. Dalam satu minggu Anda akan merasakan bedanya: tidak ada lagi tanya jawab barang sudah sampai atau belum, jawabannya tinggal buka link.

### FAQ

**Apa itu PO tracker?**
PO tracker adalah lembar pencatatan purchase order yang menampilkan status tiap pesanan dari ordered, shipped, received, sampai short dalam satu tempat yang bisa dilihat tim.

**Kenapa pakai Google Sheets bukan Excel?**
Karena bisa dibuka bersamaan oleh banyak orang secara real-time, gratis, bisa diakses dari HP, dan setiap perubahan tercatat di version history.

**Formula apa yang paling penting di PO tracker?**
Formula selisih yaitu jumlah pesan dikurangi jumlah terima, dan formula status otomatis berbasis IF yang mengubah angka menjadi label Ordered, Received, atau Short.

**Bagaimana mencegah staf salah ubah data?**
Gunakan protected ranges agar staf gudang hanya bisa edit kolom penerimaan, dan gunakan dropdown data validation agar nama supplier dan barang konsisten.

**Seberapa sering arsip harus dibuat?**
Buat arsip per bulan dengan menduplikasi sheet. Sheet aktif tetap ringan, data lama tetap aman untuk komplain atau audit.

### Kesimpulan

Satu Google Sheets berisi nomor PO, status, dan selisih kurang sudah cukup untuk menertibkan pengadaan toko kecil. Mulai dari lima PO aktif minggu ini, bagikan ke tim, dan biarkan transparansi yang bekerja.
