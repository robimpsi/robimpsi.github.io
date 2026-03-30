---
title: Building free AI assistance for Google Sheets to help me doing redundant tasks
date: 2026-03-30
description: I built a simple Google Sheets extension to help doing redundant
  tasks, with help of Mistral AI.
tags: Google Sheets, Javascript
---
Sebagai sebuah perusahaan ritel, proses penginputan data produk tidak dikerjakan seorang diri. Sebuah tim dengan berbagai latar belakang terlibat dalam penginputan data, termasuk dalam pembuatan nama produk.

Meski memiliki SKU unit yang seragam, nomenklatur produk dapat berbeda antara satu toko dengan toko lainnya. Ini karena setiap toko memiliki kebijakan yang berbeda terkait cara nomenklatur produk.

Hal sama terjadi di perusahaan kami. Meski kami sudah memiliki peraturan tak terlihat soal nomenklatur, minim supervisi terkadang membuat nama produk menjadi tidak seragam.

Ini yang sedang coba kami perbaiki bersama. Kami mencoba memperbaiki nomenklatur produk, dengan tujuan memudahkan operasional dan analisa data ke depannya.

Namun memperbaiki nomenklatur puluhan ribu produk bukanlah perkara mudah. Selain memakan waktu, doing redundant task might be inefficient. Inefficiency is a hidden cost; it cost us other stuff that have to be done as well.

I've tried to come up with regex formula, but no single regex formula can predict the various nomenclature that came up. For products with different nomenclatures, I might have to rebuild the regex all over again.

It got me thinking about using AI to help me do this.

Of course there are many extension both on Google Sheets and Microsoft Excel that provide service to help doing tasks on a spreadsheet.

But those extensions either: a) Ask my OpenAI or Claude API key (I don't have both); or b) Let me use free API key, but its free tier is far from generous. 

## Google Sheets App Script came to the rescue

So I spin up my Claude to came up with the javascript function. It can be installed on Apps Script, and uses Mistral and or OpenRouter as its API key.

### Why Mistral?

1) It's free.  
2) I think the task I'm about to assign is easy enough. My main goal here is to fix the nomenclature only; advanced data analysis has not been explored as of now.

&nbsp;

&nbsp;