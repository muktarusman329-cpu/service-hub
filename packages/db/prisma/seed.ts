import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();
const roleKeys = ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "USER"] as const;
const permissions = [
  ["admin.access", "Access admin workspace"], ["users.read", "View user accounts"],
  ["users.manage", "Suspend and reactivate accounts"], ["roles.read", "View roles and permissions"], ["roles.manage", "Manage roles and permissions"],
  ["roles.manage", "Manage role assignments"], ["audit.read", "Read audit events"],
  ["technician.approve", "Approve technician accounts"], ["privacy.requests.manage", "Review data subject requests"], ["profile.read.own", "Read own profile"],
  ["profile.manage.own", "Manage own profile"],
  ["catalog.manage", "Manage service categories, services and guidance"],
  ["marketplace.manage", "Review marketplace listings"],
  ["technician.review", "Review technician applications"],
  ["technician.reject", "Reject applications or request changes"], ["technician.suspend", "Suspend or reactivate technicians"],
  ["kyc.view", "View masked identity data and documents"], ["kyc.view_sensitive", "Reveal identity numbers with an audit reason"],
  ["jobs.manage", "Review and manage service requests"], ["bookings.manage", "Review bookings and status history"], ["chat.moderate", "Review flagged messages and access conversations for moderation"]
] as const;

async function main() {
  const configuredPhone = process.env.SEED_SUPER_ADMIN_PHONE?.trim() || null;
  const phoneDigits = configuredPhone?.replace(/\D/g, "") || "";
  const phone = !configuredPhone ? null : phoneDigits.startsWith("0") && phoneDigits.length === 11 ? `+234${phoneDigits.slice(1)}` : phoneDigits.startsWith("234") && phoneDigits.length === 13 ? `+${phoneDigits}` : configuredPhone.startsWith("+") ? `+${phoneDigits}` : phoneDigits.length === 10 ? `+234${phoneDigits}` : configuredPhone;
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase() || null;
  if (!phone && !email) throw new Error("Set SEED_SUPER_ADMIN_PHONE or SEED_SUPER_ADMIN_EMAIL before seeding.");

  const roleRows = await Promise.all(roleKeys.map((key) => prisma.role.upsert({
    where: { key }, update: {}, create: { key, name: key.replaceAll("_", " "), isSystem: true }
  })));
  const permissionRows = await Promise.all(permissions.map(([key, description]) => prisma.permission.upsert({
    where: { key }, update: { description }, create: { key, description }
  })));
  const roleByKey = new Map(roleRows.map((role) => [role.key, role]));
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission]));
  const allPermissions = permissions.map(([key]) => key);
  const rolePermissions: Record<(typeof roleKeys)[number], string[]> = {
    SUPER_ADMIN: allPermissions,
    ADMIN: ["admin.access", "users.read", "users.manage", "roles.read", "catalog.manage", "marketplace.manage", "technician.review", "technician.approve", "technician.reject", "technician.suspend", "kyc.view", "jobs.manage", "bookings.manage", "chat.moderate"],
    TECHNICIAN: ["profile.read.own", "profile.manage.own"],
    USER: ["profile.read.own", "profile.manage.own"]
  };
  for (const roleKey of roleKeys) {
    const desiredIds = rolePermissions[roleKey].map((key) => permissionByKey.get(key)!.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: roleByKey.get(roleKey)!.id, permissionId: { notIn: desiredIds } } });
    for (const permissionKey of rolePermissions[roleKey]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleByKey.get(roleKey)!.id, permissionId: permissionByKey.get(permissionKey)!.id } },
        update: {}, create: { roleId: roleByKey.get(roleKey)!.id, permissionId: permissionByKey.get(permissionKey)!.id }
      });
    }
  }

  const city = await prisma.city.upsert({ where: { slug: "minna" }, update: { name: "Minna", isActive: true }, create: { name: "Minna", slug: "minna" } });
  const defaults: Array<[string, unknown]> = [
    ["matching.top_n", 10], ["matching.technician_hourly_limit", 3], ["request.expiry_hours", 24], ["quote.expiry_hours", 24],
    ["booking.max_active_per_technician", 3], ["booking.allow_overlapping", false], ["booking.auto_complete_hours", 48],
    ["booking.cancel_user_before_start_hours", 24], ["booking.cancel_technician_window_hours", 24], ["message.max_per_minute", 20]
  ];
  for (const [key, valueJson] of defaults) await prisma.setting.upsert({
    where: { scopeType_scopeId_key: { scopeType: "GLOBAL", scopeId: "global", key } },
    update: {}, create: { scopeType: "GLOBAL", scopeId: "global", key, valueJson: valueJson as never }
  });
  const areas = ["Bosso", "Tunga", "Chanchaga", "Maitumbi", "Kpakungu", "Gidan Kwano", "Keteren Gwari", "Barkin Sale", "Dutsen Kura"];
  for (const name of areas) {
    const slug = name.toLowerCase().replaceAll(" ", "-");
    await prisma.area.upsert({ where: { cityId_slug: { cityId: city.id, slug } }, update: { name, isActive: true }, create: { cityId: city.id, name, slug } });
  }

  const catalog = [
    { slug: "home-services", name: "Home services", iconKey: "home", sortOrder: 1, enabled: true, services: [
      ["plumber", "Plumber", 5000, 25000], ["electrician", "Electrician", 5000, 20000],
      ["ac-fridge-repair", "AC and fridge repair", 10000, 60000], ["generator-repair", "Generator repair", 8000, 50000]
    ] },
    { slug: "it-support", name: "IT support", iconKey: "laptop", sortOrder: 2, enabled: true, services: [
      ["phone-laptop-repair", "Phone and laptop repair", 5000, 40000], ["networking", "Networking", 10000, 60000], ["software-help", "Software help", 5000, 25000]
    ] },
    { slug: "delivery-errands", name: "Delivery and errands", iconKey: "bike", sortOrder: 3, enabled: true, services: [
      ["local-dispatch", "Local dispatch rider", 1000, 5000]
    ] },
    { slug: "thrift-second-hand", name: "Thrift and second-hand", iconKey: "recycle", sortOrder: 4, enabled: false, services: [
      ["second-hand-items", "Student and household items", 500, 100000]
    ] }
  ] as const;
  for (const item of catalog) {
    const category = await prisma.category.upsert({ where: { slug: item.slug }, update: { name: item.name, iconKey: item.iconKey, sortOrder: item.sortOrder, isActive: true, marketplaceOnly: !item.enabled }, create: { slug: item.slug, name: item.name, iconKey: item.iconKey, sortOrder: item.sortOrder, marketplaceOnly: !item.enabled } });
    await prisma.cityCategoryFlag.upsert({ where: { cityId_categoryId: { cityId: city.id, categoryId: category.id } }, update: { enabled: item.enabled }, create: { cityId: city.id, categoryId: category.id, enabled: item.enabled } });
    for (const [serviceSlug, name, minPrice, maxPrice] of item.services) {
      const service = await prisma.service.upsert({ where: { categoryId_slug: { categoryId: category.id, slug: serviceSlug } }, update: { name, sortOrder: item.services.findIndex((entry) => entry[0] === serviceSlug), isActive: true }, create: { categoryId: category.id, slug: serviceSlug, name, sortOrder: item.services.findIndex((entry) => entry[0] === serviceSlug) } });
      await prisma.cityService.upsert({ where: { cityId_serviceId: { cityId: city.id, serviceId: service.id } }, update: { isActive: item.enabled }, create: { cityId: city.id, serviceId: service.id, isActive: item.enabled } });
      await prisma.priceGuidance.upsert({ where: { cityId_serviceId: { cityId: city.id, serviceId: service.id } }, update: { minPrice, maxPrice, label: "Guide only — final price is agreed with the technician" }, create: { cityId: city.id, serviceId: service.id, minPrice, maxPrice, label: "Guide only — final price is agreed with the technician" } });
    }
  }

  const legacyPhoneCandidates = configuredPhone ? [configuredPhone.replace(/\D/g, ""), configuredPhone.replace(/\D/g, "").replace(/^234/, "0")] : [];
  const existingUser = email
    ? await prisma.user.findUnique({ where: { email } })
    : await prisma.user.findFirst({ where: { OR: [{ phoneE164: { in: [...new Set([phone!, ...legacyPhoneCandidates])] } }, { roles: { some: { role: { key: "SUPER_ADMIN" } } } }] } });
  const user = existingUser
    ? await prisma.user.update({ where: { id: existingUser.id }, data: { email: email ?? existingUser.email, phoneE164: phone ?? existingUser.phoneE164, status: "ACTIVE", ...(email ? { emailVerifiedAt: new Date() } : {}), ...(phone ? { phoneVerifiedAt: new Date() } : {}) } })
    : await prisma.user.create({ data: { email, phoneE164: phone, displayName: "ServiceHub Super Admin", status: "ACTIVE", emailVerifiedAt: email ? new Date() : null, phoneVerifiedAt: phone ? new Date() : null } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roleByKey.get("SUPER_ADMIN")!.id } }, update: {}, create: { userId: user.id, roleId: roleByKey.get("SUPER_ADMIN")!.id } });
  console.log(`Seed completed: ${roleRows.length} roles, ${permissionRows.length} permissions, ${areas.length} Minna areas, ${catalog.length} categories, SUPER_ADMIN created from environment configuration.`);
}

main().finally(() => prisma.$disconnect());
