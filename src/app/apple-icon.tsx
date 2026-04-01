import { createAppleIconResponse } from "@/lib/metadata-art";

export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180,
};

export default function AppleIcon() {
  return createAppleIconResponse(size);
}
