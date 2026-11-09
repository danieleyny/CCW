# V2 Navy & Champagne repair audit

## Root-cause notes

- **Hero route:** the previous V2 route layered a separate gold road over the
  map. It read as a highlighter stroke and could not preserve the road's 3D
  shading. V2 now uses the supplied, pixel-matched base and gold WebPs: the
  gold image is revealed only through a spline-and-ring mask in the image's
  live content rect. Nothing outside the road or reached rings changes.
- **Closing CTA:** the previous path was hidden below 640px and used fixed
  coordinates. It therefore measured as 0×0 on some mobile layouts and could
  not reliably meet the CTA. The V2 path now measures the live canvas, copy,
  and button geometry after layout; it starts with an intersection observer
  using a 200px root margin.

## Section review

| Section | Matches written V2 brief | Deviation found | Fixed |
| --- | --- | --- | --- |
| Hero | ✓ | Synthetic gold stroke crossed rings; timing was too fast | ✓ |
| What you get | ✓ | None in review | ✓ |
| Five phases | ✓ | None in review | ✓ |
| Training | ✓ | None in review | ✓ |
| Your complete file | ✓ | None in review | ✓ |
| What it actually takes | ✓ | None in review | ✓ |
| Candor | ✓ | None in review | ✓ |
| Pricing | ✓ | None in review | ✓ |
| Promise | ✓ | None in review | ✓ |
| Guides | ✓ | None in review | ✓ |
| Closing CTA | ✓ | Mobile canvas hidden; static fixed route | ✓ |
| Footer | ✓ | None in review | ✓ |

The original repair brief's PDF and path PNG were not present in its attachment
directory. The later gold-swap kit supplied the pixel-matched base/gold maps
and 13.5-second animation reference used for the replacement hero review.
