# FITNEX — Food Scanner AI backend

The scanner UI is already in the FITNEX PWA. Real food recognition is only enabled **after** this Worker has been deployed on an account you control.

## Required setup (Cloudflare)

1. Create or sign in to a Cloudflare account at https://dash.cloudflare.com/.
2. Enable Workers & Workers AI. Review the current free allowance, usage controls, costs and privacy terms first.
3. Cloudflare requires acceptance of the Meta Llama 3.2 11B Vision model license before initial use. See the official docs: https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/ .
4. Copy this directory, then in a terminal with Node.js installed run: `npx wrangler login` and `npx wrangler deploy` from this directory.
5. If your deployment dashboard asks for it, bind **Workers AI** to variable `AI` (the included `wrangler.toml` configures this).
6. Copy your Worker URL, e.g. `https://fitnex-scanner.yourname.workers.dev`.
7. Open https://xvamp07.github.io/fitnex/ → Nutrizione → **Scanner AI** → **Configura riconoscimento AI**. Paste the URL (not an API token) and choose Save.
8. With Internet available, select a food photo and click **Analizza con AI**. Review food names, grams and nutrition per 100 g; only then save to the diary.

## Safety and cost notes

- The app uploads an image **only** when the user clicks Analyse; manual logging works without AI or Internet.
- The Worker does not store the image or log request content intentionally, but image data is processed by the Cloudflare-hosted model. Review Cloudflare's privacy and model terms.
- This endpoint is public after deployment. Restricting browser Origin limits normal cross-site browser calls, **not abuse from scripts**. Apply Cloudflare rate limiting/Turnstile/usage caps before sharing publicly; monitor costs. The app does not have accounts or authentication.
- Never place your Cloudflare API token or other private credentials in GitHub, FITNEX, HTML or public JavaScript.
- The worker returns estimates; a picture cannot measure exact grams, hidden oil, ingredients, or kcal. The values require correction and may be substantially inaccurate.
- If Cloudflare changes model availability or its input protocol, update `worker.js` accordingly and redeploy. This integration has not been tested against a live Cloudflare Worker from this environment.

## API contract

POST `/scan`, JSON body: `{ "image": "data:image/jpeg;base64,..." }`. Response: `{"items":[{"name":"Mela","grams":150,"kcal":52,"protein":0.3,"carbs":13.8,"fat":0.2}]}`.

Only `https://xvamp07.github.io` is allowed as browser Origin (modify `ORIGIN` if you change the GitHub Pages address).
