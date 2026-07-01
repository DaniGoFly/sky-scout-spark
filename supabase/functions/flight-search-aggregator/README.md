# flight-search-aggregator

Provider-based flight search backend.

```
frontend ──► flight-search-aggregator ──► [ aviasales ]
                                      ──► [ kiwi     ]  (disabled)
                                      ──► [ amadeus  ]  (future)
                                      ──► [ duffel   ]  (future)
```

All adapters implement `FlightProvider` (see `types.ts`) and return the same
`NormalizedFlight` shape. The aggregator:

1. Fans out `searchFlights` to every enabled provider in parallel.
2. Calls each provider's `normalizeResults`.
3. Merges, dedupes by segment fingerprint, sorts (best / cheapest / fastest).
4. Routes `click` actions back to the originating provider via id prefix
   (`aviasales:...`, `kiwi:...`).

## Adding a provider

1. Create `providers/<name>.ts` exporting a `FlightProvider`.
2. Register it in `providers/registry.ts` with `enabled: true`.
3. Optionally override at runtime with env `PROVIDERS_ENABLED="aviasales,kiwi"`.

The aggregator's response shape is stable — no frontend changes required.