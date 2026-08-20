import re

# Fix ClientesView.tsx
with open('src/components/ClientesView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_logic_clientes = '''		try {
			const newClient = await createClienteMut({
				usuarioId: currentUser.id as Id<"usuarios">,
				nombre: nombre.trim(),
				telefono: telefono.trim(),
				identificacion: identificacion.trim(),
				email: email.trim(),
				direccion: direccion.trim(),
				notas: notas.trim(),
				empresaId: empresaId || undefined,
				tipo_cliente: empresaId ? "Empresa" : "Natural",
				sucursalId: currentUser?.sucursalId
					? (currentUser.sucursalId as Id<"sucursales">)
					: undefined,
			});

			setIsCreateOpen(false);
			if (newClient) {
				setSelectedClienteId(newClient);
			}

			setAlertConfig({
				isOpen: true,
				title: "Cliente Añadido",
				message: El cliente "\" se registró exitosamente.,
				type: "success",
			});
		} catch (error: any) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: error.data || error.message || "No se pudo crear el cliente",
				type: "error",
			});
		}'''

content = re.sub(
    r'const newClient = await createClienteMut\(\{.*?\}\);.*?type: "success",\n\t\t\}\);',
    new_logic_clientes,
    content,
    flags=re.DOTALL
)
with open('src/components/ClientesView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix EmpresasView.tsx
with open('src/components/EmpresasView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_logic_empresas = '''		try {
			await createEmpresaMut({
				usuarioId: currentUser.id as Id<"usuarios">,
				nombre: nombre.trim(),
				ruc: ruc.trim(),
				razonSocial: razonSocial.trim(),
				direccion: direccion.trim(),
				telefono: telefono.trim(),
				email: email.trim(),
				logoUrl: uploadedLogoUrl,
			});

			setIsCreateOpen(false);
			setAlertConfig({
				isOpen: true,
				title: "Empresa Añadida",
				message: La empresa "\" se registró exitosamente.,
				type: "success",
			});
		} catch (error: any) {
			setAlertConfig({
				isOpen: true,
				title: "Error",
				message: error.data || error.message || "No se pudo crear la empresa",
				type: "error",
			});
		}'''

content = re.sub(
    r'await createEmpresaMut\(\{.*?\}\);.*?type: "success",\n\t\t\}\);',
    new_logic_empresas,
    content,
    flags=re.DOTALL
)
with open('src/components/EmpresasView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
