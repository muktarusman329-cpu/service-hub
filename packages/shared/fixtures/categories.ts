export const categories = [
  {
    id: "cat-1",
    slug: "home-services",
    name: "Home services",
    iconKey: "home",
    sortOrder: 1,
    isActive: true,
    services: [
      { id: "srv-1", slug: "plumber", name: "Plumber", iconKey: "wrench" },
      { id: "srv-2", slug: "electrician", name: "Electrician", iconKey: "bolt" },
      { id: "srv-3", slug: "ac-fridge-repair", name: "AC and fridge repair", iconKey: "snowflake" },
      { id: "srv-4", slug: "generator-repair", name: "Generator repair", iconKey: "zap" },
    ],
  },
  {
    id: "cat-2",
    slug: "it-support",
    name: "IT support",
    iconKey: "laptop",
    sortOrder: 2,
    isActive: true,
    services: [
      { id: "srv-5", slug: "phone-laptop-repair", name: "Phone and laptop repair", iconKey: "smartphone" },
      { id: "srv-6", slug: "networking", name: "Networking", iconKey: "network" },
      { id: "srv-7", slug: "software-help", name: "Software help", iconKey: "code" },
    ],
  },
  {
    id: "cat-3",
    slug: "delivery-errands",
    name: "Delivery and errands",
    iconKey: "bike",
    sortOrder: 3,
    isActive: true,
    services: [
      { id: "srv-8", slug: "local-dispatch", name: "Local dispatch rider", iconKey: "bike" },
    ],
  },
  {
    id: "cat-4",
    slug: "thrift-second-hand",
    name: "Thrift and second-hand",
    iconKey: "recycle",
    sortOrder: 4,
    isActive: false,
    services: [
      { id: "srv-9", slug: "second-hand-items", name: "Student and household items", iconKey: "shopping-bag" },
    ],
  },
] as const;
