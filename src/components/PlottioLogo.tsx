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
			<svg
				viewBox="0 0 64 64"
				className="h-full w-full p-[12%]"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Plottio</title>
				<path
					d="M 22 14 L 22 50"
					stroke="currentColor"
					strokeWidth="10"
					strokeLinecap="round"
				/>
				<path
					d="M 22 18 L 36 18 C 43.7 18 50 24.3 50 32 C 50 39.7 43.7 46 36 46 L 22 46"
					stroke="currentColor"
					strokeWidth="10"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
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
