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

Google Sheet juga memiliki Apps Script, yang memungkinkan spreadsheet berfungsi lebih optimal dengan Javascript. Frontend dibuat dengan desain berbasis HTML, sehingga memudahkan kasir beradaptasi dengan tampilannya.

![login page](/images/image-1.png)

![tampilan pos](/images/image-2.png)

![support multiple payments](/images/image-3.png)

![image.png](/images/image-4.png)

### Hasilnya

PoS ini berjalan baik dalam proses simulasi. Karena tidak ada sinkronisasi dengan backend ERP live, proses scan produk dan operasional berjalan jauh lebih cepat dengan PoS yang biasa kami gunakan.

Saya belum menggunakan PoS ini dalam transaksi langsung. Meski demikian, kami cukup tenang mengetahui bahwa kami punya PoS cadangan yang bisa kami gunakan dalam situasi mendesak.

&nbsp;

## 2. I built a customized price checker.

Peak season seperti lebaran adalah momen yang tepat untuk meningkatkan penjualan barang slow moving. Untuk itu, kami memberikan diskon tambahan pada barang-barang slow moving, dengan harapan item-item ini bisa kami keluarkan untuk diputar dengan barang baru.

Peletakan barang diskon spesial ini kami posisikan di tengah area penjualan, sehingga menarik perhatian customer. Kami juga menyediakan pramuniaga tambahan sebagai sarana informasi produk.

Kesulitan yang dirasakan oleh pramuniaga adalah mengingat harga diskon spesial untuk barang-barang yang ada. Kami menyediakan tabel harga, tapi dengan jumlah SKU yang banyak, pramuniaga kesulitan untuk memberikan informasi dengan cepat.

Sebenarnya, ERP yang kami gunakan sudah menyediakan fitur price checker. Akan tetapi, price checker yang disediakan tidak support dengan sistem diskon manual yang kami terapkan untuk produk-produk ini.

Maka saya membuat customized price checker, yang support dengan diskon manual yang ada.

It's built using Google Sheet based UI as well. It's simpler than the PoS one, since it's just displaying product and price fashionably.

![image.png](/images/image-5.png)

One thing that I most proud of is the fuzzy search; if user can't scan the barcode, they can type in the product name and it will show a list of product that might be the one they look for.

![image.png](/images/image-6.png)

![image.png](/images/image-7.png)

&nbsp;

### The Result

It's always feel great to be helpful. This price checker has been used a lot of times. Both sales clerk and cashier using it for the sale items, and they felt it's more fast and convenient than looking at a printed price list.

## 3. I anticipated stocks running out in store

Higher demand means higher frequency of inventory movement. It also means the items in our sales area keeps running out.

But how do we know one item runs out?

Our management system divides SKU by its location; sales area and warehouse. I monitored item in sales area and compared it to its sales frequency. If it goes below the sales frequency, I simply notified the responsible employee to refill stocks.

&nbsp;

&nbsp;

&nbsp;