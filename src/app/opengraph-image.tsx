import { createSocialImageResponse } from "@/lib/metadata-art";

export const alt = "Leyendo preview";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function OpenGraphImage() {
  return createSocialImageResponse(size);
}
