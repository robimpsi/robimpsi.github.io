---
title: "Analisis Churn Nasabah Bank: dari Data Kotor ke Model Prediksi"
date: 2026-10-12
description: "Studi kasus data science end-to-end: membersihkan data nasabah yang berantakan dari Excel (duplikat, simbol mata uang, nilai hilang, kolom rusak), mengungkap profil nasabah yang rawan pergi, dan membangun model prediksi churn dengan Python."
tags: [Python, Pandas, Scikit-learn, Data Cleaning, EDA, Classification]
---

Bank kehilangan nasabah setiap bulan. Pertanyaannya bukan hanya "berapa banyak", tapi "siapa" — dan apa yang bisa dilakukan sebelum mereka pergi. Studi kasus ini mengerjakan itu dari nol: mulai dari file Excel yang berantakan, sampai model yang bisa menilai risiko churn tiap nasabah.

## 1. Eksplorasi data awal (EDA)

### Asal data dan gambaran umum

Dataset ini adalah varian publik dari bank customer churn yang umum dipakai untuk latihan prediksi churn (topik: nasabah berhenti menggunakan layanan bank). Data diterima dalam dua bentuk:

- `Bank_Churn_Messy.xlsx` — versi "kotor" yang sengaja dipecah jadi dua sheet, dengan berbagai masalah kualitas data.
- `Bank_Churn.csv` — versi bersih (referensi) berisi 10.000 nasabah × 13 kolom, dipakai sebagai acuan verifikasi.

Struktur database:

```
Bank_Churn_Messy.xlsx
├── Sheet: Customer_Info (10.001 baris — data pribadi)
│     CustomerId · Surname · CreditScore · Geography · Gender · Age · Tenure* · EstimatedSalary
└── Sheet: Account_Info  (10.002 baris — data rekening)
      CustomerId · Balance · NumOfProducts · HasCrCard · Tenure* · IsActiveMember · Exited
      └─ digabung lewat CustomerId (kunci utama nasabah)
Bank_Churn.csv (referensi bersih, 10.000 baris × 13 kolom — untuk QA)
(*) Tenure ada di kedua sheet dan konsisten — dipakai sebagai cross-check saat merge
```

### Data dictionary — deskripsi tiap kolom

| Kolom | Tipe | Deskripsi |
|---|---|---|
| CustomerId | int | ID unik nasabah |
| Surname | str | Nama belakang nasabah |
| CreditScore | int | Skor kredit (rentang ~350-850) |
| Geography | str | Negara: France, Spain, Germany |
| Gender | str | Jenis kelamin: Male / Female |
| Age | int | Usia (18-92 tahun) |
| Tenure | int | Lama menjadi nasabah (tahun, 0-10) |
| Balance | float | Saldo rekening (Euro) |
| NumOfProducts | int | Jumlah produk bank yang digunakan (1-4) |
| HasCrCard | 0/1 | Punya kartu kredit (1 = ya) |
| IsActiveMember | 0/1 | Nasabah aktif (1 = ya) |
| EstimatedSalary | float | Estimasi gaji tahunan (Euro) |
| Exited | 0/1 | **Target**: churn (1 = nasabah pergi) |

### Statistik ringkas

```python
df.describe().T
df.isna().sum()          # 0 missing di versi bersih
df.Exited.value_counts(normalize=True)
# 0 → 79,6%  |  1 → 20,4%
```

- 10.000 nasabah, 13 kolom, tidak ada nilai hilang di versi bersih.
- Churn rate keseluruhan: 20,4% — kelas minoritas tapi cukup besar untuk dipelajari.
- Saldo: 36% nasabah bersaldo 0; median saldo €97rb.
- Umur rata-rata 39 tahun; skor kredit rata-rata 650; tenure rata-rata 5 tahun.
- 70,6% punya kartu kredit; 51,5% nasabah aktif.

## 2. Tujuan analisis

### Problem dataset

- File sumber berantakan: duplikat, simbol mata uang di kolom angka, label negara ganda ("France"/"French"/"FRA"), nilai hilang terselubung (-€999999), dan data pribadi terbelah dari data rekening. Analisis apa pun tidak bisa dimulai sebelum data dibersihkan.
- Pertanyaan bisnis di baliknya: churn nasabah adalah kebocoran pendapatan. Bank perlu tahu nasabah seperti apa yang rawan pergi, dan apakah risiko itu bisa dikenali lebih awal.

### Pertanyaan yang dijawab

1. Seberapa besar masalah churn di dataset ini?
2. Siapa nasabah yang paling mungkin churn — profil demografi dan perilaku apa yang membedakan mereka?
3. Faktor mana yang paling berpengaruh terhadap churn?
4. Seberapa akurat churn bisa diprediksi dari data yang tersedia?

### Goal yang ingin dicapai

1. Menghasilkan dataset bersih yang terverifikasi (bukan sekadar "dibersihkan", tapi terbukti cocok dengan referensi).
2. Menemukan segmen nasabah risiko tinggi yang bisa jadi target program retensi.
3. Membangun model prediksi dengan performa yang diukur jujur (ROC-AUC, F1) — bukan sekadar akurasi.

## 3. Proses langkah demi langkah

### 3.1 Data cleaning

Data awal berbentuk Excel dengan dua sheet terpisah, 10.001 dan 10.002 baris. Alurnya: baca kedua sheet, identifikasi semua jenis masalah, bereskan satu per satu, lalu verifikasi terhadap referensi bersih.

**a) Baca dua sheet dan cek duplikat**

```python
cust = pd.read_excel(SRC, sheet_name="Customer_Info")
acct = pd.read_excel(SRC, sheet_name="Account_Info")
cust.CustomerId.duplicated().sum()   # 1 baris
acct.CustomerId.duplicated().sum()   # 2 baris
```

Duplikatnya ternyata baris yang sama persis (salinan ganda), jadi cukup `drop_duplicates(keep="first")` — aman, tidak ada informasi yang hilang.

**b) Normalisasi kategori dan parse mata uang**

```python
geo_map = {"FRA": "France", "French": "France"}
cust["Geography"] = cust["Geography"].replace(geo_map)

def parse_money(s):
    return pd.to_numeric(s.astype(str).str.replace("€", ""), errors="coerce")

cust["EstimatedSalary"] = parse_money(cust["EstimatedSalary"])
acct["Balance"] = parse_money(acct["Balance"])
```

Kolom "France", "French", "FRA" ternyata merujuk negara yang sama. Simbol euro dibuang, lalu string diubah ke angka.

**c) Temukan nilai hilang terselubung (sentinel)**

```python
SENTINEL = -999999.0
cust.loc[cust["EstimatedSalary"] == SENTINEL, "EstimatedSalary"] = pd.NA
```

Tiga nasabah punya gaji "-€999999" — angka negatif mustahil itu adalah penanda data hilang, bukan nilai asli. Ketiganya juga kehilangan Age dan Surname. Karena 0,03% data dan tidak bisa dipulihkan, barisnya di-drop (didokumentasikan, bukan diam-diam).

**d) Temuan: kolom yang rusak permanen di sumber**

Setelah menggabungkan dua sheet dan membandingkannya dengan referensi, QA menemukan 4.992 baris tidak cocok di kolom "punya kartu kredit". Penelusuran menunjukkan kolom itu di file sumber adalah **salinan persis** kolom "nasabah aktif":

```python
(acct["HasCrCard"] == acct["IsActiveMember"]).mean()   # 1.0 → 100% identik
pd.crosstab(acct["HasCrCard"], ref["IsActiveMember_clean"])
# baris diagonal penuh: HasCrCard_messy = IsActiveMember_clean
```

Artinya nilai asli sudah tertimpa saat file dibuat dan **tidak bisa dipulihkan dari sumber mana pun**. Imputasi statistik akan menciptakan data palsu — jadi kolom ini dikeluarkan dari analisis. Pelajaran penting: data cleaning juga berarti tahu kapan data *tidak bisa* diselamatkan.

**e) Verifikasi hasil (QA wajib)**

```python
same_rows = (df3 == r3).all(axis=1).sum()
# 9997/9997 baris identik di 12 kolom yang dibandingkan — 100%
```

Setiap baris hasil dibandingkan dengan referensi bersih yang diketahui benar. Reproducible: seluruh proses ada di satu script `clean_churn.py`.

### 3.2 Eksplorasi pola churn

Dengan data bersih, hitung churn rate per kelompok. Tanpa visualisasi dulu pun polanya terbaca:

```python
df.groupby("Geography").Exited.mean()
# Germany 0.325 | Spain 0.167 | France 0.162

df["age_bin"] = pd.cut(df.Age, bins=[0,25,35,45,55,65,100],
                       labels=["<25","25-34","35-44","45-54","55-64","65+"])
df.groupby("age_bin", observed=True).Exited.mean()
# 55-64 0.498 | 45-54 0.481 | 35-44 0.177 | 65+ 0.152 | <25 0.088 | 25-34 0.078
```

![Churn rate per fitur utama](/images/churn-eda.png)

Polanya dirangkum di bagian Temuan.

### 3.3 Model prediksi

**a) Pipeline: data mentah → fitur → model**

```python
pre = ColumnTransformer([
    ("num", StandardScaler(), NUM),
    ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), CAT),
], remainder="passthrough")   # penting: kolom biner ikut masuk model
```

Catatan penting yang ditemukan saat mengerjakan: tanpa `remainder="passthrough"`, ColumnTransformer diam-diam membuang kolom yang tidak terdaftar — dua fitur biner tidak pernah masuk model, dan performa melonjak setelah diperbaiki.

**b) Perbandingan tiga model**

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

`class_weight="balanced"` penting karena kelas churn minoritas (20%). Random Forest menang tipis dan dipilih karena mudah dijelaskan ke bisnis.

![Kurva ROC ketiga model](/images/churn-model-roc.png)

![Feature importance Random Forest](/images/churn-model-importance.png)

### 3.4 Eksplorasi lanjutan: interaksi fitur, SHAP, dan ekonomi model

Analisis satu-variabel dan model dasar sudah selesai. Lapisan berikutnya: apakah efek fitur saling menumpuk (A), bisa tidaknya model dijelaskan per nasabah (B), dan apakah model benar-benar bernilai uang (C).

**a) Interaksi fitur: siapa segmen paling berisiko?**

```python
piv = df.pivot_table(index="Geography", columns="age_bin", values="Exited", aggfunc="mean")
#            <25   25-34   35-44   45-54   55-64    65+
# France   0.059   0.054   0.144   0.416   0.463   0.099
# Germany  0.156   0.129   0.284   0.648   0.663   0.300
# Spain    0.089   0.081   0.135   0.388   0.386   0.113
```

![Interaksi fitur: negara × usia, dan produk × keaktifan](/images/churn-interaction.png)

Penemuan penting dari heatmap: **efek Jerman muncul di semua kelompok umur** (rasio churn Jerman vs Perancis konsisten ~2x di setiap baris). Artinya negara dan usia adalah risiko yang *menumpuk*, bukan saling menggantikan — nasabah Jerman tetap lebih berisiko bahkan di usia 25-34.

Lalu siapa segmen paling bahaya? Bukan yang 3+ produk (jumlahnya sedikit):

```python
seg = (df.groupby(["Geography","age_bin","prod_bin","active_lbl"], observed=True)
         .Exited.agg(["size","mean"]))
seg[seg["size"]>=30].sort_values("mean", ascending=False).head(3)
# Jerman  55-64  1 produk  Tidak aktif   n=50   churn 96%
# Perancis 55-64 1 produk  Tidak aktif   n=66   churn 94%
# Jerman  45-54  1 produk  Tidak aktif   n=176  churn 84%
```

Pola yang paling konsisten justru: **1 produk + tidak aktif + usia 45+ = bom waktu** (84-96% churn). Nasabah 2 produk selalu paling aman di semua kombinasi — "two products" adalah pelindung terkuat, dan 3+ produk berisiko tinggi tapi jarang (n kecil).

**b) SHAP: menjelaskan keputusan model per nasabah**

Random Forest adalah kotak hitam. SHAP (TreeExplainer) menghitung kontribusi tiap fitur terhadap prediksi satu nasabah:

```python
explainer = shap.TreeExplainer(pipe.named_steps["clf"])
sv = explainer.shap_values(Xtr_t)[1]   # kelas churn
```

![SHAP summary plot](/images/churn-shap.png)

Ranking SHAP mengkonfirmasi feature importance (umur > jumlah produk > keaktifan > negara Jerman), tapi dengan nilai tambah: model bisa menjawab "mengapa nasabah ini di-flag" — misalnya *"karena usia 58 (kontribusi +0,18), tidak aktif (+0,07), dan tinggal di Jerman (+0,05)"*. Ini yang membuat model bisa dipakai tim retensi dengan percaya diri, bukan sekadar skor.

**c) Ekonomi model: apakah model bernilai uang?**

Uji yang paling jujur: bandingkan net value model vs kontak acak, dengan asumsi nilai nasabah = estimasi gaji tahunan (yang bisa diselamatkan kalau tidak churn) dan biaya kontak per nasabah:

```python
for t in thrs:
    flagged = proba >= t
    value = test.loc[flagged & (test.y==1), "salary"].sum()
    cost = flagged.sum() * CONTACT_COST
    net = value - cost
# baseline acak: kontak n orang acak -> n * (P(churn)*gaji_rata2 - biaya)
```

![Cost-benefit threshold dan pendapatan berisiko per segmen](/images/churn-economics.png)

Hasilnya mengejutkan dan jujur: **dengan nilai = estimasi gaji, model tidak mengalahkan kontak acak** (gap €-527 ribu di semua biaya kontak). Penyebabnya: EstimatedSalary nyaris tidak berkorelasi dengan churn, jadi "nilai yang diselamatkan" model sama saja dengan acak. Pelajaran penting: model yang akurat secara statistik (AUC 0,865) belum tentu menang secara finansial — ROI bergantung pada asumsi nilai nasabah yang sebenarnya (LTV, margin bank), yang tidak tersedia di dataset ini.

Yang tetap berguna: **dengan kapasitas kontak terbatas** (misal hanya budget untuk 200 nasabah), model mengurutkan risiko jauh lebih baik dari acak — itulah fungsi utamanya sebagai alat prioritisasi. Dan peta pendapatan berisiko (gaji churner per segmen) menunjukkan Jerman 45-54 (€29,7 juta) dan Perancis 35-54 (€57,9 juta gabungan) sebagai area nilai terbesar.

## 4. Temuan

### Profil nasabah risiko tinggi

- **Negara**: Jerman 32,5%, jauh di atas Perancis 16,2% dan Spanyol 16,7% — hampir 2x lipat. Efek Jerman konsisten di semua kelompok umur (risiko menumpuk, bukan saling menggantikan).
- **Usia**: churn naik tajam setelah 35, memuncak di 45-64 (~50%), lalu turun di 65+. Usia 25-34 justru paling aman (7,8%).
- **Jumlah produk**: kurva U terbalik. Nasabah dengan 2 produk paling setia (7,6%); 3 produk 82,7%; 4 produk 100%. Nasabah yang "over-bundled" justru kabur. Di semua kombinasi, 2 produk selalu paling aman.
- **Interaksi (temuan baru)**: segmen paling berbahaya justru *1 produk + tidak aktif + usia 45+* (84-96% churn) — bukan yang 3+ produk (n kecil).
- **Keaktifan**: nasabah tidak aktif churn hampir 2x nasabah aktif (26,9% vs 14,3%).
- **Jenis kelamin**: perempuan 25,1% vs laki-laki 16,5%.
- **Saldo**: saldo 0 paling aman (13,9%); saldo >200k churn 55,9% — tapi ini kelompok kecil (34 orang), jadi tidak dipaksakan jadi kesimpulan.
- **Skor kredit**: <400 = 100% churn (19 orang, n kecil); di atas 500 relatif rata ~20%.
- **Tenure**: hampir tidak berpengaruh — flat 17-23% di semua tingkat.

Gambaran besarnya: nasabah paling setia itu muda (<35), pakai 2 produk, dan aktif. Nasabah Jerman usia 45-60 dengan 3+ produk adalah segmen risiko tinggi — tapi yang benar-benar "bom waktu" (84-96%) adalah nasabah 1 produk, tidak aktif, usia 45+.

### Performa model

- Random Forest (balanced): ROC-AUC 0,865, F1 0,63 — dengan threshold 0,56 model menangkap 66% nasabah yang benar-benar churn (recall), dan 61% prediksinya tepat sasaran (precision).
- Fitur terkuat (SHAP mengkonfirmasi): umur, jumlah produk, status keaktifan, dan negara Jerman. SHAP memungkinkan menjelaskan keputusan per nasabah ("kenapa di-flag") — krusial untuk dipakai tim bisnis.
- **Ekonomi (temuan kunci)**: model akurat secara statistik TAPI tidak mengalahkan kontak acak secara finansial ketika nilai nasabah = estimasi gaji (gap €-527 ribu). EstimatedSalary nyaris tidak berkorelasi dengan churn. Nilai model yang sebenarnya: **prioritisasi** — mengurutkan siapa yang paling berisiko untuk kapasitas kontak terbatas, dan memetakan pendapatan berisiko per segmen (Jerman 45-54 = €29,7 juta; Perancis 35-54 = €57,9 juta gabungan).

### Satu kalimat untuk bisnis

*Nasabah yang paling mungkin pergi bisa dikenali dari data demografi dan perilaku produk — sebelum mereka benar-benar pergi.* Rekomendasi turunannya: program retensi khusus untuk segmen risiko tinggi (Jerman, usia 45+, 3+ produk, tidak aktif — dan terutama 1 produk + tidak aktif + usia 45+), dan evaluasi ulang bundling produk yang ternyata justru mengusir nasabah.

## 5. Keterbatasan

- **Tidak ada data transaksi atau riwayat interaksi** — fitur yang biasanya paling prediktif untuk churn tidak tersedia.
- **Threshold model di-tune pada set uji**, jadi angka performa sedikit optimistis terhadap data baru.
- **Satu kolom (HasCrCard) rusak permanen di sumber** dan tidak bisa dipakai — model kehilangan satu fitur yang berpotensi relevan.
- **Analisis ekonomi masih asumsi sederhana**: nilai nasabah diproksikan dengan estimasi gaji (padahal LTV/margin bank yang sebenarnya tidak diketahui), dan biaya kontak diasumsikan flat. Di data nyata, analisis ROI butuh data biaya retensi & nilai nasabah aktual.
- Dataset ini **varian publik untuk latihan** — distribusi dan perilaku nasabah bank sungguhan bisa berbeda, jadi hasilnya butuh validasi ulang sebelum dipakai di produksi.
- Hasil bagus untuk mengurutkan risiko, **bukan** untuk keputusan otomatis per nasabah tanpa validasi lapangan.

Perangkat: Python (pandas, scikit-learn, matplotlib, shap). Seluruh pipeline — dari Excel kotor ke model — dapat dijalankan ulang dari tiga script.