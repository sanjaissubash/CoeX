import type { Metadata } from "next"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { WorkspaceInitializer } from "@/components/providers/workspace-initializer"
import ToasterProvider from "@/components/ui/Toaster"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "CoeX",
  description: "Project Knowledge & Context Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <WorkspaceInitializer>
            <ToasterProvider>
            <div className="flex h-screen flex-col md:flex-row">
              <MobileHeader />
              <div className="flex-1 flex">
                <Sidebar />
                <main className="flex-1 overflow-auto pt-12 md:pt-0">
                  {children}
                </main>
              </div>
            </div>
            </ToasterProvider>
          </WorkspaceInitializer>
        </ThemeProvider>
      </body>
    </html>
  )
}
