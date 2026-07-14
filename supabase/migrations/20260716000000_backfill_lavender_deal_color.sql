-- The lavender deal-card swatch was originally #c6adf5, which — due to a quirk in the
-- luminance formula underweighting blue — got assigned white text despite dark text
-- actually reading far better against it. Any deal that already had this literal hex
-- saved (from picking "Lavender" in the color picker, or the deterministic per-deal
-- default) needs to move to the current canonical value so it resolves to the new
-- explicit dark-text override in src/lib/deal-card-colors.ts instead of falling
-- through to the generic (wrong, for this hue) heuristic.
update public.deals
set color = '#bd9ff2'
where color = '#c6adf5';
