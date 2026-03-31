---
title: Fixing 10,000 Messy Product Names with a Google Sheets Add-on I Built for Free
date: 2026-03-30
description: I built a simple Google Sheets extension to help doing redundant
  tasks, with help of Mistral AI.
tags: Google Sheets, Javascript
---
As a retail company, product data entry is never a one-person job. A whole team — with different backgrounds, different habits, and different levels of attention to detail — is involved in inputting product data, including the creation of product names.  

Even when every product has a standardized SKU, the actual product *name* can look completely different from one store to another. This happens because each store, each branch, each team member follows slightly different conventions when naming products. Some capitalize everything. Some abbreviate. Some include the color first, others put it last. Some add the storage size, some don't.

There's no malice in it — just the natural entropy that happens when dozens of people type thousands of product names over months and years.  

The same thing happens at our company. We do have unwritten rules about product nomenclature — conventions that most of the team generally follows. But with minimal supervision and high-volume data entry, those conventions drift. Slowly, inconsistency creeps in. Some put variant before size. Others use hyphen. Others put space before gramation.

This is what we're trying to fix right now, together as a team. We're working on standardizing our product nomenclature with a clear goal: make operations smoother and make data analysis actually possible going forward.

Because right now, when I try to run any kind of product-level analysis — sales trends, inventory movement, category performance — the inconsistent naming turns what should be a simple `GROUP BY` into a nightmare of manual mapping.  

But fixing the nomenclature of tens of thousands of products is not a small task. It's time-consuming. It's mentally draining. And perhaps most importantly, doing the same redundant thing over and over again is deeply inefficient.

Inefficiency is a hidden cost — it doesn't show up on a balance sheet, but it costs us in other work that doesn't get done. Every hour I spend doing redundant tasks is an hour I'm not spending on analysis that could actually move the business forward.  

---

## When Regex Wasn't Enough

My first instinct, like any sane person, was to solve this with formulas.  

I started building regex patterns. Google Sheets supports `REGEXREPLACE`, `REGEXMATCH`, and `REGEXEXTRACT`, and for a while, I thought I could brute-force my way through the mess. I wrote patterns to strip extra spaces, normalize casing, remove SKU codes embedded in names, and map common abbreviations.

For one specific product category, it worked.

But then I moved to the next category. Different abbreviations. Different patterns. Different chaos. The regex that worked for some brand didn't work for others. No single regex formula can predict the sheer variety of nomenclature that real humans produce in the wild.  

For products with fundamentally different naming patterns, I'd have to rebuild the regex from scratch. Every. Single. Time.  

```
=REGEXREPLACE(REGEXREPLACE(UPPER(TRIM(A1)),   
  "\s+", " "),   
  "^(.*?)\s*[-–]\s*(BLK|WHT|BLU|RED)\s*[-–]?\s*(\d+)\s*GB.*$",   
  "$1 $3GB $2")  
```

Formulas like this started filling my helper columns. They were fragile, unreadable, and broke the moment a new naming pattern appeared. I spent more time debugging formulas than actually cleaning data.  

That's when I started thinking about AI.  

---

## The Problem with Existing Extensions

Of course, I wasn't the first person to think of using AI inside a spreadsheet. There are plenty of extensions — both on Google Sheets and Microsoft Excel — that offer AI-powered data processing. Some of them are genuinely well-built products.  

But when I started evaluating them, I kept running into the same two walls:  

**a) They require an OpenAI or Claude API key.**  

I don't have either.

Our company doesn't have an enterprise OpenAI account, and getting budget approval for a new API subscription — even a cheap one — involves more questions than I'm willing to deal with for what I initially saw as an experiment.  

**b) They offer a free tier, but it's far from generous.**  

Some extensions give you a handful of free API calls to try the service, then push you toward a monthly subscription. 50 free calls sounds fine until you realize you have 15,000 product names to clean. The free tier gets you through about 0.3% of the job.  

Neither option worked for my situation. I needed something that was practically free to use at scale, didn't require an OpenAI or Claude key, and worked directly inside Google Sheets where my data already lives.  

---

## Google Sheets Apps Script Came to the Rescue

So I turned to Claude and asked it to help me build a custom Apps Script solution. Google Sheets has a built-in scripting environment called Apps Script. It's JavaScript-based, it's free, and it lets you create custom functions that behave just like native spreadsheet formulas.  

The idea was straightforward: write a script that takes cell content, sends it to an AI model with a prompt, and returns the cleaned result. Install it once, and then call it from any cell with `=MAI(A1, "Standardize this product name")`.  

For the AI provider, I chose Mistral and OpenRouter.  

### Why Mistral?

Two reasons:  

1. **It's free.** Mistral offers a free tier for their API that is surprisingly generous for lightweight tasks. You can sign up, get an API key, and start making calls without entering a credit card.
2. **The task is simple enough.** I'm not asking the AI to write a novel or perform complex reasoning. I'm asking it to look at a messy product name and rewrite it in a standard format. That's a straightforward text transformation task — exactly what smaller, cheaper models excel at. Advanced data analysis with AI is something I want to explore eventually, but right now, fixing nomenclature is the priority.

OpenRouter serves as a backup and an expansion path. It gives access to over 200 models through a single API endpoint, so if I ever need a different model for a more complex task, the infrastructure is already there.  

---

## How the Code Works

The entire add-on lives inside Google Sheets' Apps Script editor. No external servers, no hosting costs, no infrastructure to maintain. Here's how the key pieces fit together.  

### The Core Formula

The main function is called `MAI`. It takes a cell reference and a prompt, calls the AI model, and returns the result directly into the cell:  

```javascript
/**  
  *Process cell content with an AI prompt.*  
**   
  *@param  {any}    input     Cell or range to process.*  
**  @param  {string} prompt    Instruction for the AI.  
  *@param  {string} provider  "mistral" or "openrouter" (optional).*  
**  @param  {string} model     Model identifier (optional).  
  *@param  {any}    version   Change to force a fresh API call (optional).*  
**  @return {string} The AI-generated response.  
  *@customfunction*  
** /  
function AI(input, prompt, provider, model, version) {  
  if (!input) return '⚠️ Empty input cell.';  
  if (!prompt) return '⚠️ No prompt provided.';  
  
  // Flatten range input into a string  
  if (Array.isArray(input)) {  
    input = [input.map](http://input.map)(function(row) {  
      return Array.isArray(row) ? row.join('\t') : String(row);  
    }).join('\n');  
  }  
  
  provider = (provider || getUserSetting_('DEFAULT_PROVIDER') || 'mistral')  
    .toString().toLowerCase().trim();  
  
  // Check cache to avoid redundant API calls  
  var cache    = CacheService.getUserCache();  
  var cacheRaw = provider + '|' + (model || '') + '|' + input + '|' + prompt;  
  var cacheKey = 'ai_' + Utilities.base64Encode(  
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, cacheRaw)  
  );  
  var cached = cache.get(cacheKey);  
  if (cached) return cached;  
  
  // Route to the right provider  
  var result;  
  if (provider === 'mistral') {  
    result = callMistral_(input, prompt, model);  
  } else {  
    result = callOpenRouter_(input, prompt, model);  
  }  
  
  // Cache result for 6 hours  
  cache.put(cacheKey, result, 21600);  
  return result;  
}  
```

The `@customfunction` annotation tells Google Sheets to expose this as a formula. Once saved, you type `=MAI(` in any cell and it appears in autocomplete alongside `AVERAGE` and `VLOOKUP`. It feels native.  

### Talking to Mistral

The function that actually communicates with Mistral's API is clean and focused:  

```javascript
function callMistral_(input, prompt, model) {  
  var apiKey = getUserSetting_('MISTRAL_API_KEY');  
  if (!apiKey) throw new Error('Mistral API key not set. Check Settings.');  
  
  model = model || 'mistral-small-latest';  
  
  var body = {  
    model: model,  
    messages: [  
      {  
        role: 'system',  
        content: 'You are a concise assistant embedded in Google Sheets. '  
               + 'Return ONLY the requested result — no explanations, '  
               + 'no markdown, no extra text.'  
      },  
      {  
        role: 'user',  
        content: prompt + '\n\n---\nINPUT:\n' + input  
      }  
    ],  
    temperature: 0.2,  
    max_tokens: 2048  
  };  
  
  var response = UrlFetchApp.fetch(  
    '[https://api.mistral.ai/v1/chat/completions](https://api.mistral.ai/v1/chat/completions)', {  
      method: 'post',  
      contentType: 'application/json',  
      headers: { 'Authorization': 'Bearer ' + apiKey },  
      payload: JSON.stringify(body),  
      muteHttpExceptions: true  
    }  
  );  
  
  var json = JSON.parse(response.getContentText());  
  return json.choices[0].message.content.trim();  
}  
```

Two things are worth highlighting here.  

The **system prompt** tells the model to return *only* the result. Without this, language models tend to be chatty — they'll explain what they did, add caveats, wrap things in markdown. Inside a spreadsheet cell, I don't want an explanation. I want, say, "Apple iPhone 14 Pro Max 256GB Black" and nothing else.  

The **temperature is set to 0.2**. Temperature controls randomness. For creative writing, you'd crank it up. For data cleanup, you want the opposite — consistency. The same messy input should always produce the same clean output. Low temperature makes that happen.  

### Caching: The Silent Money Saver

In a product catalog, the same product name often appears dozens or hundreds of times. Without caching, each occurrence would trigger a separate API call — wasteful and slow. The caching layer ensures each unique input-prompt combination hits the API exactly once:  

```javascript
var cacheRaw = provider + '|' + (model || '') + '|' + input + '|' + prompt;  
var cacheKey = 'ai_' + Utilities.base64Encode(  
  Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, cacheRaw)  
);  
var cached = cache.get(cacheKey);  
if (cached) return cached;  
```

If similar naming pattern appears 200 times in the spreadsheet, the AI processes it once and serves the cached result for the other 199. The cache persists for six hours — more than enough for a working session.  

And if I refine my prompt and want fresh results, I just bump a version number:  

```
=MAI(A1, "Standardize this product name", , , 2)  
```

Changing that last parameter from `1` to `2` generates a new cache key, forcing a fresh API call.  

### Batch Processing: Cleaning Thousands at Once

For our catalog cleanup, processing one cell at a time wouldn't cut it. I built `MAI_BATCH`, which sends an entire range to the model in a single API call:  

```javascript
function MAI_BATCH(range, prompt, provider, model, version) {  
  // Normalize to 2D array  
  if (!Array.isArray(range)) range = [[range]];  
  
  // Build numbered list from all cells  
  var items = [];  
  for (var r = 0; r < range.length; r++) {  
    var val = range[r][0];  
    if (val) items.push((items.length + 1) + '. ' + String(val));  
  }  
  
  var batchPrompt =  
    prompt + '\n\n'  
    + 'Apply the above instruction to EACH numbered item below. '  
    + 'Return ONLY the results as a numbered list. '  
    + 'One result per line. No extra text.\n\n'  
    + items.join('\n');  
  
  // Single API call for the entire batch  
  var result = callMistral_('(batch)', batchPrompt, model);  
  
  // Parse numbered results back into rows  
  var lines = result.split('\n');  
  var output = [];  
  for (var i = 0; i < lines.length; i++) {  
    var line = lines[i].trim().replace(/^\d+[\.\)\-\:]\s*/, '');  
    if (line) output.push([line]);  
  }  
  
  return output;  
}  
```

One formula in one cell:  

```
=MAI_BATCH(A1:A50, "Standardize each product name to: Brand Model Size Shade Number Variant ")  
```

Fifty product names cleaned. One API call. Results spill down automatically into the cells below. The cost is practically zero.  

### Secure Key Storage

Since this was built to be shared with the team, API key security mattered. Each user's key is stored in Google's `UserProperties` — a storage space scoped to the individual user that no one else can access:  

```javascript
function getUserSetting_(key) {  
  return PropertiesService.getUserProperties().getProperty(key);  
}  
```

Not the sheet owner. Not collaborators. Not even me as the script developer. Each team member stores their own key, uses their own quota, and their credentials stay private.  

---

For our full catalog cleanup — roughly >10,000 product names — I processed them in batches of 50 over the course of an afternoon. The total API cost was negligible. The time savings compared to my regex-and-VLOOKUP approach was measured in *days*, not hours.  

But the real win isn't just speed. It's accuracy. The AI handles edge cases that my regex formulas never could — abbreviations it's never seen before, unexpected misspellings, inconsistent punctuation. It understands *intent* in a way that pattern matching simply cannot. "BT Spkr" becomes "Bluetooth Speaker" not because I wrote a mapping table, but because the model understands what those abbreviations mean.

## Perhaps the caveat is I still have to babysit them sometimes.   

## What I Want to Build Next

This started as a quick fix for a specific problem, but it's opened up possibilities I didn't expect. Here's what's on my list.  

### Prompt Templates for the Team

Right now, every team member has to type the full prompt in every formula. I want to build a template system where we define standard prompts once and reference them by shorthand:  

```
=MAI(A1, "#product_name")     ← uses our saved nomenclature prompt  
=MAI(A1, "#extract_brand")    ← pulls just the brand name  
=MAI(A1, "#categorize")       ← assigns a product category  
```

This would ensure everyone on the team uses the same prompt, producing consistent results across the board. No more "my formula says it differently than yours."  

### Multi-Column Extraction

Sometimes I don't just want a cleaned name — I want it broken into structured fields. Brand in one column, model in another, storage, color, each in their own cell. Something like:  

```
=MAI_SPLIT(A1, "Brand, Model, Storage, Color")  
```

That returns four columns from a single messy input. The foundation is already there with the `AI_FILL` function, but I want to refine it for single-row parsing.  

### Automated Chunking for Large Datasets

Google Sheets custom functions have a 30-second timeout. That limits `MAI_BATCH` to about 50 rows per call. For our 12,000-row catalog, I had to manually process 240 batches. I want to build a sidebar-based processor that automatically chunks large ranges, processes them sequentially outside the custom function timeout, and writes results directly to the sheet. Apps Script supports time-based triggers and `SpreadsheetApp.getRange().setValues()`, so this is technically feasible — just needs building.  

### Usage Tracking

Since each API call has a cost — however tiny — I want a simple dashboard that tracks usage per user per session. Not for billing purposes, but for awareness. Something that says "today you cleaned 2,000 names for $0.04" so the team understands the economics and feels comfortable using it freely.  

### Exploring More Complex Analysis

Right now, I'm only using the AI for text transformation — clean this name, fix this format. But the same infrastructure could support sentiment analysis on customer reviews, automated product description generation, or even anomaly detection in sales data. The function signature stays the same — `=MAI(A1, "your prompt")` — only the prompt changes. The ceiling is much higher than where I'm currently operating.  

## The Takeaway

This project started because I had a real operational problem — inconsistent product names across a retail catalog — and the existing solutions either didn't fit my tech stack or didn't fit my budget. The combination of Google Apps Script, Mistral's free API tier, and a few hours of building produced a tool that genuinely changed how our team handles data cleanup.  

It's not a polished commercial product. The UI is functional, not beautiful. Even the error handling is not graceful. It still needs some babysit.

But it works. It lives inside the spreadsheet where our data already is. It costs practically nothing to run. And it turned a multi-day manual chore into something that takes an afternoon.  

If you're a data analyst, an inventory manager, or anyone who deals with messy product data in spreadsheets — and you're tired of regex formulas that break every time a new naming pattern shows up — consider building your own. The API keys are free or nearly free. The scripting environment is built into Google Sheets.

And the satisfaction of watching 10,000 messy product names snap into clean, standardized format with a single formula is worth every minute of setup.  

Inefficiency is a hidden cost. This is my one way to stop paying for it.
