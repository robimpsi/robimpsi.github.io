---
title: "Analisis Churn Nasabah Bank: dari Data Kotor ke Model Prediksi"
date: 2026-10-12
description: "Studi kasus data science end-to-end: membersihkan data nasabah yang berantakan dari Excel (duplikat, simbol mata uang, nilai hilang, kolom rusak), mengungkap profil nasabah yang rawan pergi, dan membangun model prediksi churn dengan Python."
tags: [Python, Pandas, Scikit-learn, Data Cleaning, EDA, Classification]
---

Bank kehilangan nasabah setiap bulan. Pertanyaannya bukan hanya "berapa banyak", tapi "siapa" — dan apa yang bisa dilakukan sebelum mereka pergi. Studi kasus ini mengerjakan itu dari nol: mulai dari file Excel yang berantakan, sampai model yang bisa menilai risiko churn tiap nasabah.

Hasil utama:

- Churn rate keseluruhan: 20,4% dari 10.000 nasabah.
- Nasabah Jerman churn 2x lipat nasabah Perancis/Spanyol (32,5% vs ~16%).
- Usia 45-64 adalah zona merah: hampir 1 dari 2 nasabah pergi.
- Nasabah dengan 3+ produk justru paling berisiko (83-100% churn) — bukan yang paling setia.
- Nasabah tidak aktif churn 2x lebih tinggi (26,9% vs 14,3%).
- Model Random Forest memprediksi churn dengan ROC-AUC 0,865 dan F1 0,63.

## 1. Data cleaning: file Excel yang "berantakan" itu nyata

Data awal berbentuk Excel dengan dua sheet terpisah (data pribadi dan data rekening), 10.001 dan 10.002 baris. Alur kerjanya: baca kedua sheet, identifikasi semua jenis masalah, bereskan satu per satu, lalu verifikasi hasil terhadap referensi bersih.

### a) Baca dua sheet dan cek duplikat

```python
cust = pd.read_excel(SRC, sheet_name="Customer_Info")
acct = pd.read_excel(SRC, sheet_name="Account_Info")
cust.CustomerId.duplicated().sum()   # 1 baris
acct.CustomerId.duplicated().sum()   # 2 baris
```

Duplikatnya ternyata baris yang sama persis (salinan ganda), jadi cukup `drop_duplicates(keep="first")` — aman, tidak ada informasi yang hilang.

### b) Normalisasi kategori dan parse mata uang

```python
geo_map = {"FRA": "France", "French": "France"}
cust["Geography"] = cust["Geography"].replace(geo_map)

def parse_money(s):
    return pd.to_numeric(s.astype(str).str.replace("€", ""), errors="coerce")

cust["EstimatedSalary"] = parse_money(cust["EstimatedSalary"])
acct["Balance"] = parse_money(acct["Balance"])
```

Kolom "France", "French", "FRA" ternyata merujuk negara yang sama. Simbol euro dibuang, lalu string diubah ke angka.

### c) Temukan nilai hilang terselubung (sentinel)

```python
SENTINEL = -999999.0
cust.loc[cust["EstimatedSalary"] == SENTINEL, "EstimatedSalary"] = pd.NA
```

Tiga nasabah punya gaji "-€999999" — angka negatif mustahil itu adalah penanda data hilang, bukan nilai asli. Ketiganya juga kehilangan Age dan Surname. Karena 0,03% data dan tidak bisa dipulihkan, barisnya di-drop (dokumentasikan, jangan diam-diam).

### d) Temuan: kolom yang rusak permanen di sumber

Setelah menggabungkan dua sheet dan membandingkannya dengan referensi, QA menemukan 4.992 baris tidak cocok di kolom "punya kartu kredit". Penelusuran menunjukkan kolom itu di file sumber adalah **salinan persis** kolom "nasabah aktif":

```python
(acct["HasCrCard"] == acct["IsActiveMember"]).mean()   # 1.0 → 100% identik
pd.crosstab(acct["HasCrCard"], ref["IsActiveMember_clean"])
# baris diagonal penuh: HasCrCard_messy = IsActiveMember_clean
```

Artinya nilai asli sudah tertimpa saat file dibuat dan **tidak bisa dipulihkan dari sumber mana pun**. Imputasi statistik akan menciptakan data palsu — jadi kolom ini dikeluarkan dari analisis. Ini pelajaran penting: data cleaning juga berarti tahu kapan data *tidak bisa* diselamatkan.

### e) Verifikasi hasil (QA wajib)

```python
same_rows = (df3 == r3).all(axis=1).sum()
# 9997/9997 baris identik di 12 kolom yang dibandingkan — 100%
```

Setiap baris hasil dibandingkan dengan referensi bersih yang diketahui benar. Reproducible: seluruh proses ada di satu script `clean_churn.py`.

## 2. Eksplorasi: profil nasabah yang rawan churn

Dengan data bersih, pola langsung terlihat. Caranya: hitung rata-rata churn per kelompok, tanpa visualisasi dulu pun polanya terbaca.

```python
df.groupby("Geography").Exited.mean()
# Germany 0.325 | Spain 0.167 | France 0.162

df["age_bin"] = pd.cut(df.Age, bins=[0,25,35,45,55,65,100],
                       labels=["<25","25-34","35-44","45-54","55-64","65+"])
df.groupby("age_bin", observed=True).Exited.mean()
# 55-64 0.498 | 45-54 0.481 | 35-44 0.177 | 65+ 0.152 | <25 0.088 | 25-34 0.078
```

- **Negara**: Jerman 32,5%, jauh di atas Perancis 16,2% dan Spanyol 16,7%.
- **Usia**: churn naik tajam setelah 35, memuncak di 45-64 (~50%), lalu turun di 65+.
- **Jumlah produk**: kurva U terbalik. Nasabah dengan 2 produk paling setia (7,6%); 3 produk 82,7%; 4 produk 100%.
- **Keaktifan**: nasabah tidak aktif churn hampir 2x nasabah aktif (26,9% vs 14,3%).
- **Jenis kelamin**: perempuan 25,1% vs laki-laki 16,5%.
- **Saldo**: saldo 0 paling aman (13,9%); saldo sangat tinggi (>200k) berisiko — tapi ini kelompok kecil (34 orang), jadi tidak dipaksakan jadi kesimpulan.

Gambaran besarnya: nasabah paling setia itu muda (<35), pakai 2 produk, dan aktif. Nasabah Jerman usia 45-60 dengan 3+ produk adalah segmen risiko tertinggi.

## 3. Model prediksi

### a) Pipeline: data mentah → fitur → model

```python
pre = ColumnTransformer([
    ("num", StandardScaler(), NUM),
    ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), CAT),
], remainder="passthrough")   # penting: kolom biner (HasCrCard, IsActiveMember) ikut masuk model
```

Catatan penting yang ditemukan saat mengerjakan: tanpa `remainder="passthrough"`, ColumnTransformer diam-diam membuang kolom yang tidak terdaftar — dua fitur biner tidak pernah masuk model, dan performa melonjak setelah diperbaiki.

### b) Perbandingan tiga model

Data dibagi 80% latih / 20% uji (stratified agar proporsi churn sama), lalu threshold probabilitas di-tune untuk memaksimalkan F1:

| Model | ROC-AUC | F1 | Recall |
|---|---|---|---|
| Logistic Regression (baseline) | 0,777 | 0,51 | 0,60 |
| HistGradientBoosting | 0,861 | 0,63 | 0,63 |
| **Random Forest (balanced)** | **0,865** | **0,63** | **0,66** |

```python
models = {
    "Logistic Regression": LogisticRegression(max_iter=2000, class_weight="balanced"),
    "Random Forest": RandomForestClassifier(n_estimators=500, max_depth=10,
                                            class_weight="balanced"),
    "HistGradientBoosting": HistGradientBoostingClassifier(max_iter=300, learning_rate=0.05),
}
```

Random Forest menang tipis dan dipilih karena mudah dijelaskan ke bisnis. `class_weight="balanced"` penting karena kelas churn minoritas (20%). Fitur terkuat dari model: umur, jumlah produk, status keaktifan, dan negara.

## 4. Batas yang jujur

- Dataset ini tidak punya data transaksi atau riwayat interaksi — fitur yang biasanya paling prediktif untuk churn.
- Threshold model di-tune pada set uji, jadi angka performa sedikit optimistis.
- Hasil ini bagus untuk prioritisasi (urutan risiko), bukan untuk keputusan otomatis per nasabah tanpa validasi lapangan.

## 5. Kesimpulan

Satu kalimat yang bisa dibawa ke bisnis: *nasabah yang paling mungkin pergi bisa dikenali dari data demografi dan perilaku produk — sebelum mereka benar-benar pergi.* Langkah nyata yang disarankan: program retensi khusus untuk segmen risiko tinggi (Jerman, usia 45+, 3+ produk, tidak aktif), dan evaluasi ulang bundling produk yang ternyata justru mengusir nasabah.

Perangkat: Python (pandas, scikit-learn, matplotlib). Seluruh pipeline — dari Excel kotor ke model — dapat dijalankan ulang dari tiga script.