# EUR/USD Candle Bot — Vercel সেটআপ (Android থেকেও করা যাবে)

## ফাইল
- `index.html` — মোবাইল উপযোগী UI, ক্যান্ডেল চার্ট, ট্রেন্ড ও history
- `api/candles.js` — Vercel serverless backend; API key browser-এ প্রকাশ করে না
- `vercel.json` — Function configuration
- `.gitignore` — `.env`/secret ফাইল Git-এ যাওয়া আটকায়

## গুরুত্বপূর্ণ নিরাপত্তা
আগে যে Alpha Vantage key চ্যাটে প্রকাশ করেছেন, সেটি rotate/revoke করে নতুন key নিন। নতুন key HTML বা GitHub-এ লিখবেন না।

## Vercel-এ deploy
1. এই ZIP extract করুন।
2. GitHub-এ নতুন private repository বানান এবং সব project ফাইল upload করুন. `api` ফোল্ডারের ভেতরের `candles.js`-সহ folder structure ঠিক রাখুন।
3. Vercel-এ লগইন → Add New → Project → GitHub repository import → Deploy।
4. Vercel Project → Settings → Environment Variables খুলুন।
5. Name: `ALPHA_VANTAGE_API_KEY`
   Value: আপনার নতুন Alpha Vantage key
   Environment: Production (প্রয়োজন হলে Preview-ও)
   Save করুন।
6. Deployments → সর্বশেষ deployment → Redeploy করুন। Environment variable পরিবর্তনের পর redeploy জরুরি।
7. `https://আপনার-project.vercel.app/` খুলুন। `Fetch now` চাপুন।
8. Backend সরাসরি পরীক্ষা: `https://আপনার-project.vercel.app/api/candles?interval=1min`

## Error হলে
- `Server is missing ALPHA_VANTAGE_API_KEY`: Vercel env var নাম/value/environment ঠিক করে redeploy।
- `premium endpoint` / `Information` / `Note`: Alpha Vantage-এর plan-এ FX_INTRADAY অনুমোদিত কি না documentation/account-এ যাচাই করুন। Key থাকলেই endpoint free হবে না।
- `Invalid API call` / `Error Message`: API response এবং supported interval যাচাই করুন।
- `429`/quota message: API request limit অতিক্রম হয়েছে; অপেক্ষা করুন, auto refresh বন্ধ করুন।
- `Unexpected Alpha Vantage response format`: API-এর response shape বদলেছে বা error object এসেছে; backend error message দেখুন।

## API ও ডেটার সীমাবদ্ধতা
Alpha Vantage FX_INTRADAY-এর অ্যাক্সেস/interval আপনার plan অনুযায়ী সীমিত হতে পারে। `FX_INTRADAY` response-এ `Time Series FX (1min)` ধরনের object প্রত্যাশা করা হয়, তবে code response key dynamically খোঁজে এবং অপ্রত্যাশিত response হলে error দেখায়।
এই ডেটা Quotex-এর নিজস্ব feed নয়; Quotex-এর candle-এর সঙ্গে হুবহু মেলে এমন নিশ্চয়তা নেই। Auto refresh 60 সেকেন্ডে চলে এবং API quota বাঁচাতে বারবার refresh করবেন না।

## Local HTML কেন কাজ করবে না?
`index.html` সরাসরি `content://` থেকে খুললে `/api/candles` route থাকবে না। Vercel-এ পুরো project deploy করে online URL থেকে খুলতে হবে। API key browser JavaScript-এ নয়, Vercel Environment Variables-এ থাকে।
