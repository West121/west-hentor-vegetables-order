export function getCollapsedFlyoutTop(
  anchorTop: number,
  flyoutHeight: number,
  viewportHeight: number,
  edgeGap = 12,
) {
  const maximumTop = Math.max(
    edgeGap,
    viewportHeight - flyoutHeight - edgeGap,
  );

  return Math.min(Math.max(anchorTop, edgeGap), maximumTop);
}
