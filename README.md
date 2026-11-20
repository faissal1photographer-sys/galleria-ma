# Galleria.ma

Galleria's static storefront includes separate home, candle, photo frame, Amber and Oud pages. Customers can shop in French, English or Arabic. The cart and language preference are shared across pages.

## Catalog and checkout

- Villa Nova by Galleria Amber mini costs 99 MAD. Oud large costs 149 MAD.
- Customers order a photograph with a walnut, white or black frame in Small or 50 × 70 cm. Confirm Small dimensions, frame prices and delivery in WhatsApp.
- Checkout opens a WhatsApp draft with the selected items, quantities and city. The customer taps Send to place the request.
- The assets are web-optimized copies of Galleria's supplied photography.

Update the catalog or order number in `catalog.js`.

## Preview and publish

Run `python3 -m http.server 8000` from this folder and open `http://localhost:8000`. The site requires no build step.

On GitHub, go to **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, choose **main** and **/(root)**, and save. Pages will show the public website URL after deployment. To use `galleria.ma`, connect that domain in Pages and configure DNS at the domain provider.
