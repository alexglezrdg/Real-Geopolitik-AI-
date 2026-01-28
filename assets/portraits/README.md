# Portrait Assets - Instructions

This folder is ready to receive portrait images for deterministic composition mode.

## Quick Add

Drop PNG files here with these names:

- `trump.png` - Donald Trump
- `putin.png` - Vladimir Putin
- `xi_jinping.png` - Xi Jinping
- `petro.png` - Gustavo Petro
- `lula_da_silva.png` - Lula da Silva
- `marco_rubio.png` - Marco Rubio
- `nato.png` - NATO logo
- `generic_leader.png` - Generic leader fallback

## Requirements

- **Format**: PNG (transparent background recommended) or JPG
- **Size**: At least 800px width
- **Aspect**: Portrait orientation (9:16 or similar)
- **Quality**: High resolution for clean composition

## Testing

After adding a portrait:

```bash
npm run dev -- --live
```

Check logs for:
```
[IMG] mode: COMPOSED
[IMG] entity: trump
[IMG] portrait: trump.png
```

## No Files? No Problem

System works normally with DALL·E FULL mode when no portraits are present.
