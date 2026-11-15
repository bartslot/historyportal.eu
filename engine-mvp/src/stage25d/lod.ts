// Far vegetation draws its low-detail copy (Asset.lod: tools/lod_svg.py, a simplified watercolour with an ink outline
// and its bottom faded out). Bart 11-15: "Make lod's for the grass and bushes, shrubs, blocking layers that are further
// away: less detail". Picked by distance from the camera, with a gap between the two edges so a picture standing near
// the edge never flickers between its two copies while the camera moves.

/** Farther than this from the camera (metres): the low copy. */
export const LOD_FAR_M = 40
/** Nearer than this: the painting again. Between the two a picture keeps the copy it has. */
export const LOD_NEAR_M = 34

/** Does a picture `distance` metres from the camera draw its low copy, when it drew it before (`wasLow`)? */
export const lodLow = (wasLow: boolean, distance: number): boolean =>
  wasLow ? distance > LOD_NEAR_M : distance > LOD_FAR_M
