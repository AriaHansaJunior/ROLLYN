import {
    X,
    LayoutDashboard,
    Warehouse,
    Package,
    MapPin,
    TruckIcon,
    Eye,
    Target,
    FileText,
    ClipboardList,
    BarChart2,
    Settings,
    Users,
    User,
    ChevronRight,
    Layers,
    Sparkles,
    History,
} from "lucide-react";
import { Link, usePage } from "@inertiajs/react";

const navSections = [
    {
        label: "Main",
        items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Warehouse",
        items: [
            { id: "warehouse-map", label: "Warehouse Map", icon: MapPin },
            { id: "roll-inventory", label: "Roll Inventory", icon: Package },
            { id: "slot-status", label: "Slot Status", icon: Layers },
        ],
    },
    {
        label: "Production",
        items: [
            { id: "incoming-roll", label: "Incoming Roll", icon: TruckIcon },
            { id: "ocr-monitoring", label: "OCR Monitoring", icon: Eye },
        ],
    },
    {
        label: "Orders",
        items: [
            { id: "target-order", label: "Target Order", icon: Target },
            { id: "jop", label: "Job Order Production (JOP)", icon: ClipboardList },
            { id: "shipment-history", label: "Shipment History", icon: History },
        ],
    },
    {
        label: "Reports",
        items: [{ id: "reports", label: "Reports", icon: BarChart2 }],
    },
    {
        label: "Administration",
        items: [
            { id: "user-management", label: "User Management", icon: Users },
            {
                id: "recommendation-logs",
                label: "Recommendation Logs",
                icon: Sparkles,
            },
            { id: "profile", label: "Profile", icon: User },
        ],
    },
];

interface SidebarProps {
    activePage: string;
    collapsed: boolean;
    mobileOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({
    activePage,
    collapsed,
    mobileOpen,
    onClose,
}: SidebarProps) {
    const { props } = usePage();
    const authUser = (props.auth as any)?.user;
    const userRole = (authUser?.role ?? "admin").toLowerCase();

    // Role-Based UI Visibility — frontend-only, not backend authorization
    // Admin: full access
    // Production: OCR only (incoming-roll) -> Sidebar is hidden entirely in MainLayout
    // QC: scan & check outgoing/reject (roll-inventory) -> Sidebar is hidden entirely in MainLayout
    // PPIC: operational minus OCR & User Management (dashboard, warehouse-map, roll-inventory, slot-status, target-order, jop, reports, profile)
    const roleAllowedItems: Record<string, string[] | null> = {
        admin: null, // null = all items visible
        production: ["incoming-roll"],
        qc: ["roll-inventory"], // Removed 'reports'
        ppic: [
            "dashboard",
            "warehouse-map",
            "roll-inventory",
            "slot-status",
            "target-order",
            "jop",
            "shipment-history",
            "reports",
        ], // Removed 'user-management'
    };

    const allowedItems = roleAllowedItems[userRole] ?? null;

    return (
        <>
            {}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 sm:hidden"
                    style={{ display: "block", backdropFilter: "blur(2px)" }}
                    onClick={onClose}
                />
            )}

            <aside
                style={{
                    width: collapsed && !mobileOpen ? 56 : 280,
                    minWidth: collapsed && !mobileOpen ? 56 : 280,
                    display: "flex",
                    flexDirection: "column",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    height: "100vh",
                    zIndex: 40,
                    transition:
                        "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                className={`bg-white/60 max-sm:bg-white backdrop-blur-2xl border-r border-white/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${
                    mobileOpen
                        ? "max-sm:translate-x-0"
                        : "max-sm:-translate-x-full"
                }`}
            >
                {/* Header/Logo Sidebar */}
                <div
                    style={{
                        padding: "0 12px",
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                    }}
                    className="group cursor-default"
                >
                    <img 
                        src="/images/logo-rollyn.png" 
                        alt="Rollyn Logo" 
                        style={{ width: 32, height: 32, objectFit: 'contain' }} 
                        className="drop-shadow-sm transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    {(!collapsed || mobileOpen) && (
                        <span
                            style={{
                                fontWeight: 800,
                                fontSize: 16,
                                color: "#1e293b",
                                letterSpacing: "0.04em",
                            }}
                            className="transition-colors duration-300 group-hover:text-blue-600 drop-shadow-sm"
                        >
                            ROLLYN
                        </span>
                    )}
                    {mobileOpen && (
                        <button
                            className="max-sm:flex hidden ml-auto"
                            onClick={onClose}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: 4,
                            }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Nav Links */}
                <nav
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "8px 8px",
                        paddingTop: 8,
                    }}
                >
                    {navSections.map((section) => {
                        const filteredItems = section.items.filter((item) => {
                            if (allowedItems === null) return true; // Admin: all visible
                            return allowedItems.includes(item.id);
                        });

                        if (filteredItems.length === 0) return null;

                        return (
                            <div
                                key={section.label}
                                style={{ marginBottom: 12 }}
                            >
                                {(!collapsed || mobileOpen) && (
                                    <div
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: "#64748b",
                                            letterSpacing: "0.1em",
                                            textTransform: "uppercase",
                                            padding: "0 8px",
                                            marginBottom: 2,
                                        }}
                                    >
                                        {section.label}
                                    </div>
                                )}
                                {filteredItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activePage === item.id;
                                    return (
                                        <Link
                                            key={item.id}
                                            href={`/${item.id}`}
                                            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                            style={{
                                                width: "100%",
                                                justifyContent:
                                                    collapsed && !mobileOpen
                                                        ? "center"
                                                        : "flex-start",
                                                minHeight: 36,
                                            }}
                                            onClick={() =>
                                                mobileOpen && onClose()
                                            }
                                            title={
                                                collapsed && !mobileOpen
                                                    ? item.label
                                                    : undefined
                                            }
                                        >
                                            <Icon
                                                size={18}
                                                style={{ flexShrink: 0 }}
                                            />
                                            {(!collapsed || mobileOpen) && (
                                                <span
                                                    style={{
                                                        flex: 1,
                                                        textAlign: "left",
                                                    }}
                                                >
                                                    {item.label}
                                                </span>
                                            )}
                                            {(!collapsed || mobileOpen) &&
                                                isActive && (
                                                    <ChevronRight
                                                        size={14}
                                                        style={{ opacity: 0.6 }}
                                                    />
                                                )}
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                {}
                {(!collapsed || mobileOpen) && (
                    <div
                        style={{
                            padding: "12px 16px",
                            borderTop: "1px solid rgba(0,0,0,0.05)",
                            fontSize: 11,
                            color: "#64748b",
                        }}
                    >
                        ROLLYN v1.0.0 &copy; 2026 All Rights Reserved
                    </div>
                )}
            </aside>
        </>
    );
}
