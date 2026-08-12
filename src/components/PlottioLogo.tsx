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
			className={`shrink-0 rounded-[22%] bg-primary text-primary-foreground shadow-md flex items-center justify-center ${iconClass}`}
			aria-hidden="true"
		>
			<svg viewBox="0 0 64 64" className="h-full w-full p-[12%]" fill="none">
				<title>Plottio</title>
				{/* Carrocería de la furgoneta */}
				<path
					d="M6 46c0-3.4 2.2-5.6 5.2-6.2l2.6-9.6c.9-3.4 3.8-5.4 7.6-5.4h11.8l7.2 6.6h8.6c3 0 5 2 5 5v8.6h-2.2a5.6 5.6 0 0 1-11.2 0h-16.4"
					stroke="currentColor"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{/* Cabina / ventana */}
				<path
					d="M23.5 28.5v-4.5h5.4l3.2 3.8-2.2 2.6h-6.4v-1.9z"
					fill="currentColor"
					opacity="0.55"
				/>
				{/* Franja de vinilo */}
				<path
					d="M20 46 40 20v-3.4L19.6 46h.4z"
					fill="var(--plottio-accent, #f59e0b)"
				/>
				{/* Ruedas */}
				<circle
					cx="21.5"
					cy="48"
					r="6.2"
					stroke="currentColor"
					strokeWidth="4.5"
				/>
				<circle cx="21.5" cy="48" r="2.6" fill="currentColor" />
				<circle
					cx="44.5"
					cy="48"
					r="6.2"
					stroke="currentColor"
					strokeWidth="4.5"
				/>
				<circle cx="44.5" cy="48" r="2.6" fill="currentColor" />
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
