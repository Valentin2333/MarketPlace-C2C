import { describe, it, expect } from "vitest";
import { pathFromListingImageUrl, LISTING_IMAGES_BUCKET } from "./listingImages";

describe("pathFromListingImageUrl", () => {
  it("extracts the path after the bucket segment", () => {
    const url = `https://example.supabase.co/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/user123/listing456/0-1699999999.jpg`;
    expect(pathFromListingImageUrl(url)).toBe(
      "user123/listing456/0-1699999999.jpg",
    );
  });

  it("returns null when the URL doesn't contain the bucket segment", () => {
    expect(pathFromListingImageUrl("https://example.com/some/other/path.jpg")).toBeNull();
  });
});
