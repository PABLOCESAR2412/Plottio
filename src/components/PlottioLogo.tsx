interface PlottioLogoProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	showName?: boolean;
}

const SIZE = {
	sm: { icon: "h-7 w-7", name: "text-sm" },
	md: { icon: "h-10 w-10", name: "text-xl" },
	lg: { icon: "h-12 w-12", name: "text-3xl" },
} as const;

function LogoMark({ iconClass }: { iconClass: string }) {
	return (
		<div
			className={`shrink-0 rounded-[22%] bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_color-mix(in_oklch,var(--primary),transparent_30%)] flex items-center justify-center ${iconClass}`}
			aria-hidden="true"
		>
			<svg viewBox="0 0 64 64" className="h-full w-full p-[12%]" fill="none">
				<title>Plottio</title>
				{/* Furgón de rotulación: una silueta limpia con una película de vinilo en movimiento. */}
				<path
					d="M7 43.5h3.8l3.1-12.1c.7-2.8 3.2-4.8 6.1-4.8h13.6c2.2 0 4.2.8 5.8 2.3l4.2 4.1h6.1c2.8 0 5.1 2.3 5.1 5.1v5.4h-3.9"
					stroke="currentColor"
					strokeWidth="4.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M18.9 32.7h15.5l4.1 4H16.8l2.1-4z"
					fill="var(--plottio-logo-window)"
				/>
				{/* Banda de vinilo que envuelve la carrocería. */}
				<path
					d="M13.2 42.8c8.6-1.4 15.9-5.1 22.1-11.2l3.7 3.6c-6.5 6.4-14.1 10.6-23 12.4l-2.8-4.8z"
					fill="var(--plottio-accent)"
				/>
				{/* Ruedas */}
				<circle cx="21" cy="45" r="5.8" stroke="currentColor" strokeWidth="4" />
				<circle cx="21" cy="45" r="2.1" fill="currentColor" />
				<circle cx="46" cy="45" r="5.8" stroke="currentColor" strokeWidth="4" />
				<circle cx="46" cy="45" r="2.1" fill="currentColor" />
			</svg>
		</div>
	);
}

export default function PlottioLogo({
	size = "md",
	className = "",
	showName = true,
}: PlottioLogoProps) {
	const s = SIZE[size];
	return (
		<div className={`flex items-center gap-3 min-w-0 ${className}`}>
			<LogoMark iconClass={s.icon} />
			{showName && (
				<span
					className={`font-black tracking-widest text-foreground truncate ${s.name}`}
				>
					PLOTTIO
				</span>
			)}
		</div>
	);
}
