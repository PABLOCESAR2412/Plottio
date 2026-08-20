import re

with open('src/components/VehiculosView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handleSaveCreate logic
old_logic = '''		const newVeh = await createVehiculoMut({
			usuarioId: currentUser.id as Id<"usuarios">,
			placa: placa.trim().toUpperCase(),
			categoria,
			marca: marca.trim(),
			modelo: modelo.trim(),
			anio: a\\u00f1o.trim() || "2025",
			numeroSerie:
				numeroSerie.trim() || S/N-\,
			propietarioId,
			propietarioTipo,
			estado,
			sucursalId: currentUser?.sucursalId
				? (currentUser.sucursalId as Id<"sucursales">)
				: undefined,
		});

		setIsCreateOpen(false);
		if (newVeh) {
			setSelectedVehiculoId(newVeh._id);
		}

		setAlertConfig({
			isOpen: true,
			title: "Vehículo Añadido",
			message: El vehículo con placa "\" se registró exitosamente.,
			type: "success",
		});'''
old_logic = old_logic.replace('a\\u00f1o', 'año')

new_logic = '''		try {
			const newVeh = await createVehiculoMut({
				usuarioId: currentUser.id as any,
				placa: placa.trim().toUpperCase(),
				categoria,
				marca: marca.trim(),
				modelo: modelo.trim(),
				anio: año.trim() || "2025",
				numeroSerie:
					numeroSerie.trim() || S/N-,
				propietarioId,
				propietarioTipo,
				estado,
				sucursalId: currentUser?.sucursalId
					? (currentUser.sucursalId as any)
					: undefined,
			});

			setIsCreateOpen(false);
			if (newVeh) {
				setSelectedVehiculoId(newVeh._id);
			}

			setAlertConfig({
				isOpen: true,
				title: "Vehículo Añadido",
				message: El vehículo con placa "" se registró exitosamente.,
				type: "success",
			});
		} catch (error: any) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: error.data || error.message || "No se pudo crear el vehículo",
				type: "error",
			});
		}'''

# Note: Python string matching can be tricky with formatting. Let's use regex.
import re
content = re.sub(
    r'const newVeh = await createVehiculoMut\(\{.*?\}\);.*?type: "success",\n\t\t\}\);',
    new_logic,
    content,
    flags=re.DOTALL
)

with open('src/components/VehiculosView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
