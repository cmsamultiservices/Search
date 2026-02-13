"use client";

import Link from "next/link";
import { Home, FileText } from "lucide-react";
import { SettingsDialog } from "@/components/settings-dialog";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/documents", label: "Documentos", icon: FileText },
  ];

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Navegación izquierda */}
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors duration-200 ${isActive(link.href)
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline text-sm">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Configuración - lado derecho */}
          <div className="flex items-center">
            <SettingsDialog />
          </div>
        </div>
      </div>
    </header>
  );
}
