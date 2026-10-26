"use client";

import { useState } from "react";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(0);

  if (!images.length) {
    return (
      <div className="productMainImage">
        <span>🧩</span>
      </div>
    );
  }

  return (
    <div className="productGallery">
      <div className="productMainImage">
        <img
          src={images[activeImage]}
          alt={productName}
        />
      </div>

      {images.length > 1 && (
        <div className="productThumbnails">
          {images.map((image, index) => (
            <button
              type="button"
              key={image}
              className={
                index === activeImage
                  ? "productThumbnail active"
                  : "productThumbnail"
              }
              onClick={() => setActiveImage(index)}
            >
              <img
                src={image}
                alt={`${productName} rasm ${index + 1}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}