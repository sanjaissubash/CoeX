import Link from "next/link"
import { Plus, Search } from "lucide-react"

export function DashboardHeader() {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">What should you work on next?</p>
			</div>
			<div className="flex gap-3">
				<Link
					href="/search"
					className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 hover:bg-secondary/80 transition-colors"
				>
					<Search className="h-4 w-4" />
					Search
				</Link>
				<Link
					href="/projects/create"
					className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90 transition-opacity"
				>
					<Plus className="h-4 w-4" />
					New
				</Link>
			</div>
		</div>
	)
}
