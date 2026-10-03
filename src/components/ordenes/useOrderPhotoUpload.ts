import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface UseOrderPhotoUploadProps {
	usuarioId?: string;
	onSuccess: (message: string) => void;
	onError: (error: string) => void;
}

export function useOrderPhotoUpload({
	usuarioId,
	onSuccess,
	onError,
}: UseOrderPhotoUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const generateUploadUrlMut = useMutation(
		api.organizacion.generateLogoUploadUrl,
	);
	const addFotoMut = useMutation(api.ordenes.addFoto);

	const uploadPhoto = async (orderId: string, file: File) => {
		if (!orderId || !usuarioId) return;
		setIsUploading(true);
		try {
			const bitmap = await createImageBitmap(file);
			const canvas = document.createElement("canvas");
			let width = bitmap.width;
			let height = bitmap.height;
			const MAX_WIDTH = 1920;
			const MAX_HEIGHT = 1080;
			if (width > height) {
				if (width > MAX_WIDTH) {
					height *= MAX_WIDTH / width;
					width = MAX_WIDTH;
				}
			} else {
				if (height > MAX_HEIGHT) {
					width *= MAX_HEIGHT / height;
					height = MAX_HEIGHT;
				}
			}
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Could not get canvas context");
			ctx.drawImage(bitmap, 0, 0, width, height);

			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(b) => {
						if (b) resolve(b);
						else reject(new Error("Failed to convert image to WebP"));
					},
					"image/webp",
					0.8,
				);
			});

			const uploadUrl = await generateUploadUrlMut();
			const response = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": "image/webp" },
				body: blob,
			});

			if (!response.ok) throw new Error("Error al subir archivo a Convex");
			const { storageId } = await response.json();

			await addFotoMut({
				usuarioId: usuarioId as Id<"usuarios">,
				ordenId: orderId as Id<"ordenesTrabajo">,
				storageId: storageId as Id<"_storage">,
			});

			onSuccess("Se cargó una foto de instalación en el timeline de la orden.");
		} catch (err) {
			onError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setIsUploading(false);
		}
	};

	return {
		isUploading,
		uploadPhoto,
	};
}
