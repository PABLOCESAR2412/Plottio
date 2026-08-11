import type React from "react";

export function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={`animate-pulse rounded-md bg-muted ${className || ""}`}
			{...props}
		/>
	);
}

export function TableSkeleton() {
	return (
		<div className="w-full h-full p-6 space-y-6 bg-background">
			{/* Header Skeleton */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-32 rounded-lg" />
			</div>

			{/* Toolbar / Search Skeleton */}
			<div className="flex flex-col sm:flex-row gap-4">
				<Skeleton className="h-10 flex-1 max-w-sm rounded-lg" />
				<Skeleton className="h-10 w-24 rounded-lg" />
			</div>

			{/* Table Skeleton */}
			<div className="border border-border rounded-lg overflow-hidden bg-card">
				<div className="grid grid-cols-4 gap-4 p-4 border-b border-border bg-muted/50">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-16" />
				</div>
				{[...Array(5)].map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: lista estática de placeholders
						key={i}
						className="grid grid-cols-4 gap-4 p-4 border-b border-border last:border-0"
					>
						<div className="flex items-center gap-3">
							<Skeleton className="h-10 w-10 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-24" />
							</div>
						</div>
						<div className="flex items-center">
							<Skeleton className="h-4 w-28" />
						</div>
						<div className="flex items-center">
							<Skeleton className="h-6 w-20 rounded-full" />
						</div>
						<div className="flex items-center justify-end gap-2">
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
