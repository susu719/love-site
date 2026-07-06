import { gps } from "exifr";

export type PhotoLocation = {
  latitude: number;
  longitude: number;
};

export async function readPhotoLocation(
  file: File,
): Promise<PhotoLocation | null> {
  const location = await gps(file);

  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    return null;
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
  };
}
