import Image from "next/image";

const photos = {
  hero: "photo-1621905251918-48416bd8575a",
  services: {
    plumber: "photo-1607472586893-edb57bdc0e39",
    electrician: "photo-1621905251918-48416bd8575a",
    "ac-fridge-repair": "photo-1581092160562-40aa08e78837",
    "generator-repair": "photo-1509391366360-2e959784a276",
    "phone-laptop-repair": "photo-1598327105666-5b89351aff97",
    networking: "photo-1558494949-ef010cbdcc31",
    "software-help": "photo-1516321318423-f06f85e504b3",
    "local-dispatch": "photo-1519003722824-194d4455a60c",
    "second-hand-items": "photo-1490481651871-ab68de25d43d",
  },
  marketplace: {
    clothing: "photo-1521572163474-6864f9cf17ab",
    "home-goods": "photo-1600585154340-be6161a56a0c",
    electronics: "photo-1511707171634-5f897ff02aa9",
    books: "photo-1544947950-fa07a98d237f",
    furniture: "photo-1555041469-a586c61ea9bc",
    other: "photo-1490481651871-ab68de25d43d",
  },
} as const;

export type MarketplacePhotoCategory = keyof typeof photos.marketplace;
const serviceAliases: Record<string, keyof typeof photos.services> = {
  "AC and fridge repair": "ac-fridge-repair",
  "Phone and laptop repair": "phone-laptop-repair",
};

export function servicePhotoUrl(service: string) {
  const slug = serviceAliases[service] ?? service.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return unsplashUrl(isServicePhotoSlug(slug) ? photos.services[slug] : photos.hero, 720);
}

export function marketplacePhotoUrl(category: MarketplacePhotoCategory) {
  return unsplashUrl(photos.marketplace[category], 960);
}

export function heroPhotoUrl() {
  return unsplashUrl(photos.hero, 960);
}

function unsplashUrl(photoId: string, width: number) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

function isServicePhotoSlug(slug: string): slug is keyof typeof photos.services {
  return Object.hasOwn(photos.services, slug);
}

export function AppPhoto({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={`app-photo ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        priority={priority}
      />
    </div>
  );
}
