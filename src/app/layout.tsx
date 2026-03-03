import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "CRMPanel — Multi-Tenant SaaS CRM",
  description: "Production-grade multi-tenant CRM application built with Next.js, Supabase, and TailwindCSS.",
  keywords: ["CRM", "SaaS", "Next.js", "Supabase", "Multi-Tenant"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRMPanel",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialData = null;

  if (user) {
    // Parallelize everything for hydration
    const [contextRes, onboardingRes, membershipsRes] = await Promise.all([
      (supabase as any).rpc('fn_fast_user_context').maybeSingle(),
      supabase.from('user_onboarding').select('is_completed, current_step').eq('user_id', user.id).maybeSingle(),
      supabase.from('members').select('company_id, role, status, companies(id, name, logo_url, status)').eq('user_id', user.id)
    ]);

    const data = contextRes.data;
    const onboarding = onboardingRes.data;

    if (data) {
      const companies = (membershipsRes.data || []).map((m: any) => ({
        id: m.companies?.id,
        name: m.companies?.name,
        logo_url: m.companies?.logo_url,
        status: m.companies?.status,
        role: m.role,
        member_status: m.status
      }));

      initialData = {
        user: {
          id: user.id,
          active_company_id: data.company_id,
          role: data.role,
          full_name: data.full_name,
          avatar_url: data.avatar_url ?? null,
          email: user.email || '',
          onboarding,
        },
        companies
      };
    }
  }

  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider initialData={initialData}>
          <ThemeProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: 'toast-custom',
                duration: 3000,
                style: {
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-0)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                },
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
