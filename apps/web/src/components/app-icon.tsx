import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Armchair,
  Bike,
  BookOpen,
  BadgeCheck,
  Bell,
  Bolt,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  House,
  Laptop,
  MapPin,
  Menu,
  MessageCircle,
  MessagesSquare,
  Network,
  Package,
  Recycle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Shirt,
  ShoppingBag,
  Smartphone,
  Snowflake,
  Star,
  UserRound,
  UsersRound,
  Wallet,
  WifiOff,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  armchair: Armchair,
  bike: Bike,
  "book-open": BookOpen,
  "badge-check": BadgeCheck,
  bell: Bell,
  bolt: Bolt,
  briefcase: BriefcaseBusiness,
  calendar: CalendarDays,
  camera: Camera,
  check: Check,
  "clipboard-list": ClipboardList,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  help: CircleHelp,
  "circle-help": CircleHelp,
  clock: Clock3,
  code: Code2,
  home: House,
  laptop: Laptop,
  "map-pin": MapPin,
  menu: Menu,
  message: MessageCircle,
  "messages-square": MessagesSquare,
  network: Network,
  package: Package,
  recycle: Recycle,
  search: Search,
  "shield-check": ShieldCheck,
  sliders: SlidersHorizontal,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  smartphone: Smartphone,
  snowflake: Snowflake,
  star: Star,
  user: UserRound,
  users: UsersRound,
  wallet: Wallet,
  "wifi-off": WifiOff,
  wrench: Wrench,
  close: X,
  zap: Zap,
};

export type AppIconName = keyof typeof icons;

export function getAppIconName(name: string): AppIconName {
  return Object.hasOwn(icons, name) ? name as AppIconName : "help";
}

type AppIconProps = {
  name: AppIconName;
  size?: 16 | 20;
  className?: string;
};

export function AppIcon({ name, size = 20, className }: AppIconProps) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" className={className} size={size} strokeWidth={1.75} />;
}
