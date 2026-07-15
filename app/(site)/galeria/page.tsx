import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { galleryPhotos } from "@/lib/gallery/photos";
import { GalleryGrid } from "./GalleryGrid";

export const metadata: Metadata = { title: "Galería" };

export default function GaleriaPage() {
  return (
    <>
      <PageHero
        eyebrow="PISÁO en imágenes"
        title="Galería"
        description="Fotografía de alto contraste de la terraza, la cocina y la experiencia PISÁO."
      />
      <Container className="py-16">
        <GalleryGrid photos={galleryPhotos} />
      </Container>
    </>
  );
}
