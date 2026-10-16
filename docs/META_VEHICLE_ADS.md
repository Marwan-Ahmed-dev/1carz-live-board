# Meta Automotive Inventory Ads — 1Carz

## Feed URL

After setting `META_VEHICLE_FEED_KEY` in Vercel env and redeploying:

```
https://1carz.com/api/meta/vehicle-feed?key=YOUR_SECRET
```

- Returns UTF-8 CSV of **active** cars only (sold/reserved/inactive drop out automatically).
- `vehicle_id` = Firestore car document id (same as Pixel `content_ids`).

## Customer checklist (Commerce Manager / Ads)

1. Commerce Manager → **Add Catalog** → type **Vehicles** (not E-commerce).
2. Data source → **Scheduled feed** → paste the URL above → fetch daily.
3. Events Manager → connect Pixel `1141855108516047` to the catalog.
4. Confirm `ViewContent` on `https://1carz.com/car/{id}` sends `content_ids: [vehicle_id]` and `content_type: vehicle`.
5. Ads Manager → Sales or Traffic → **Advantage+ catalog ads** → select catalog + product set.
6. Creative: Carousel with `{{vehicle.year}} {{vehicle.make}} {{vehicle.model}}` and `{{vehicle.price}}`.
7. Run two campaigns: broad prospecting + retarget site visitors (last 30 days).

## Admin note

New/edited cars must fill **make / model / year / mileage (km)** in the car form. Legacy cars without those fields are filled via title parsing in the feed (may need manual cleanup for best ad quality).