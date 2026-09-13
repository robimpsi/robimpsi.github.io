---
title: "Bersihkan File Harga Supplier dengan Power Query: Gabung Tiga File Beda Format Jadi Satu Tabel"
date: "2026-09-15"
description: "Tutorial Power Query untuk admin pengadaan: gabungkan tiga file pricelist supplier yang formatnya beda-beda menjadi satu tabel rapi tanpa copy paste manual."
tags: ["Pengadaan", "Power Query", "Excel"]
---

### Ringkasan: Apa Itu Data Cleaning dengan Power Query?

Power Query adalah fitur Excel untuk mengambil, membersihkan, dan menggabungkan file berantakan menjadi satu tabel rapi yang bisa di-refresh sekali klik. Untuk admin pengadaan, ini berarti tiga file pricelist supplier dengan format berbeda bisa digabung tanpa copy paste manual. Sekali susun langkahnya, bulan depan tinggal tekan Refresh dan tabel terbaru langsung jadi.

### Skenario: Tiga Supplier, Tiga Format Menyebalkan

Pernahkah Anda menerima pricelist supplier A dalam Excel rapi, supplier B dalam Excel dengan header ganda dan baris kosong di mana-mana, dan supplier C dalam CSV yang tanggalnya berantakan? Tugas Anda membandingkan harga barang yang sama dari ketiganya. Cara lama: copy paste satu per satu, betulkan manual, makan waktu dua jam, dan bulan depan ulangi lagi dari nol. Power Query memutus lingkaran ini.

### Konsep: Lima Langkah Pembersihan Standar

Hampir semua file supplier kotor dengan pola yang sama, jadi langkah pembersihannya bisa dihafal.

Pertama, promote headers yaitu mengangkat baris pertama menjadi nama kolom. Kedua, remove blank rows untuk membuang baris kosong sisa format cetak. Ketiga, change type untuk memaksa kolom harga menjadi decimal dan kolom tanggal menjadi date. Keempat, trim and clean untuk membuang spasi ganda di nama barang. Kelima, unpivot kalau ada file yang menyusun harga per bulan melebar ke kanan, putar menjadi format panjang agar bisa digabung.

Setelah tiap file bersih dengan struktur kolom yang sama, langkah terakhir adalah append queries yaitu menumpuk ketiganya menjadi satu tabel. Tambahkan kolom sumber berisi nama supplier agar ketahuan harga siapa dari mana.

### Cara Mengerjakannya di Power Query

Simpan tiga file di satu folder misalnya C Pricelist. Di Excel pilih Data lalu Get Data lalu From Folder. Power Query menampilkan daftar file, pilih Combine lalu Combine and Transform. Editor terbuka dengan contoh gabungan.

Di dalam Power Query Editor, langkahnya berurutan di panel Applied Steps. Contoh kodenya dalam bahasa M untuk satu file:

```m
let
    Source = Excel.Workbook(File.Contents("C:\Pricelist\supplier-b.xlsx"), null, true),
    Sheet1 = Source{[Item="Sheet1",Kind="Sheet"]}[Data],
    Headers = Table.PromoteHeaders(Sheet1, [PromoteAllScalars=true]),
    NoBlanks = Table.SelectRows(Headers, each not List.IsEmpty(List.RemoveMatchingItems(Record.FieldValues(_), {"", null}))),
    Typed = Table.TransformColumnTypes(NoBlanks, {{"Item", type text}, {"Price", type number}, {"Date", type date}}),
    Trimmed = Table.TransformColumns(Typed, {{"Item", Text.Trim, type text}}),
    AddSource = Table.AddColumn(Trimmed, "Supplier", each "Supplier B")
in
    AddSource
```

Jangan takut dengan kode M. Anda tidak perlu mengetiknya manual, semua langkah di atas bisa diklik dari ribbon Transform dan Add Column, lalu Power Query menulis kodenya sendiri. Yang penting Anda paham urutannya: angkat header, buang kosong, kunci tipe data, rapikan teks, tandai sumber.

Untuk menggabung ketiganya, pilih Home lalu Append Queries dan pilih ketiga query. Hasilnya satu tabel dengan kolom Item, Price, Date, dan Supplier. Klik Close and Load ke Excel sebagai tabel. Bulan depan, timpa file lama dengan file baru yang nama dan formatnya sama, buka Excel, tekan Refresh All, selesai dalam sepuluh detik.

### Wawasan: Otomatisasi Kecil Mengalahkan Lembur Besar

Dua jam copy paste per bulan berarti 24 jam setahun hilang untuk pekerjaan yang bisa di-refresh sepuluh detik. Power Query juga mengurangi salah ketik karena tidak ada lagi pengetikan ulang. Dan yang paling penting untuk karier Anda: skill ini langka di level admin. Banyak admin bisa Excel untuk rumus, sedikit yang bisa Power Query untuk otomatisasi. Satu tabel refreshable di portofolio membedakan Anda dari seratus pelamar lain.

Simpan file sumber dengan aturan nama yang konsisten seperti pricelist-supplierA-2026-09.xlsx. Power Query dari folder membaca semua file di dalamnya, jadi nama konsisten mencegah file nyasar ikut kegabung. Buat query backup dengan menduplikasi query utama sebelum menambah langkah eksperimental, agar kalau salah tinggal hapus tanpa mengulang dari awal.

Dokumentasikan tiap langkah dengan klik kanan step lalu Rename menjadi bahasa manusia seperti Buang baris kosong cetakan. Tiga bulan kemudian saat Anda lupa, nama langkah yang jelas menyelamatkan Anda dari membaca ulang kode M.

### Kemenangan Cepat: Gabungkan Dua File Minggu Ini

Ambil dua file pricelist yang paling sering Anda bandingkan. Masukkan ke satu folder. Ikuti langkah Combine dari folder di atas, bersihkan sampai append. Targetnya satu tabel rapi berisi harga keduanya berdampingan. Begitu berhasil sekali, file ketiga dan keempat hanya pengulangan. Minggu depan, pamerkan tombol Refresh ke atasan Anda.

### FAQ

**Apa itu Power Query?**
Power Query adalah fitur Excel untuk mengambil dan membersihkan data dari banyak file menjadi satu tabel rapi yang bisa di-refresh otomatis setiap ada file baru.

**Apakah harus bisa coding bahasa M?**
Tidak. Semua langkah bisa diklik dari menu, Power Query yang menulis kode M-nya. Memahami urutan langkah lebih penting daripada menghafal sintaks.

**Bagaimana cara menggabungkan tiga file beda format?**
Bersihkan tiap file sampai kolomnya sama lewat promote headers, buang baris kosong, dan kunci tipe data, lalu tumpuk dengan Append Queries dan tambah kolom Supplier.

**Apa yang terjadi kalau file bulan depan formatnya berubah?**
Refresh akan error di langkah yang berubah. Periksa Applied Steps, perbaiki langkah yang merah, dan refresh ulang. Error yang terpusat di satu langkah jauh lebih mudah dibetulkan daripada file copy paste manual.

**Berapa waktu yang dihemat dibanding copy paste?**
Pembersihan manual tiga file biasanya makan satu sampai dua jam per bulan. Dengan query yang sudah jadi, refresh bulan berikutnya hanya butuh hitungan detik.

### Kesimpulan

Power Query mengubah pekerjaan bulanan yang membosankan menjadi sekali susun dan tinggal refresh. Satu folder, lima langkah bersih, satu tombol. Mulai dari dua file minggu ini, rasakan sepuluh detik yang menggantikan dua jam.
