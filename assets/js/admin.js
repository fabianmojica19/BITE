const urlProyecto = "https://ivggucipgkiuyhjsgqzg.supabase.co";
const clavePublica = "sb_publishable_vPuf7fJPyyBN5XGMzgG26Q_cUJGV0mK";
const cliente = window.supabase.createClient(urlProyecto, clavePublica);
const formulario = document.getElementById("formulario-login");
const boton = formulario.querySelector('button[type="submit"]');
const estado = document.getElementById("estado-login");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (boton.disabled) return;

  const correo = document.getElementById("correo-admin").value.trim();
  const campoClave = document.getElementById("clave-admin");

  boton.disabled = true;
  estado.textContent = "Comprobando acceso…";

  try {
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo,
      password: campoClave.value
    });

    if (error) {
      estado.textContent = "No se pudo iniciar sesión. Revisa tu correo y contraseña.";
      return;
    }

    if (data.user.id !== "e5a0a78f-5baf-4fb6-8422-a33096cbf531") {
      await cliente.auth.signOut();
      estado.textContent = "Esta cuenta no tiene acceso de administración.";
      return;
    }

    campoClave.value = "";
    estado.textContent = "Sesión iniciada. Bienvenido al panel de BITE.";
    await mostrarConsultas();
  } catch {
    estado.textContent = "No se pudo conectar con Supabase. Revisa tu conexión.";
  } finally {
    boton.disabled = false;
  }
});

boton.disabled = false;
async function mostrarConsultas() {
  const panel = document.getElementById("panel-consultas");
  const aviso = document.getElementById("aviso-consultas");
  const lista = document.getElementById("lista-consultas");

  panel.hidden = false;
  lista.replaceChildren();
  aviso.textContent = "Cargando consultas…";

  const { data, error } = await cliente
    .from("consultas")
    .select("id, nombre, correo, mensaje, estado")
    .order("creada_en", { ascending: false });

  if (error) {
    aviso.textContent = `No se pudieron cargar las consultas: ${error.message}`;
    return;
  }

  aviso.textContent = data.length
    ? `Consultas recibidas: ${data.length}`
    : "Todavía no hay consultas.";

  for (const consulta of data) {
    const fila = document.createElement("li");
    const nombre = document.createElement("strong");
    const mensaje = document.createElement("p");
    const detalle = document.createElement("p");

    nombre.textContent = consulta.nombre;
    mensaje.textContent = consulta.mensaje;
    detalle.textContent = `${consulta.correo} · Estado: ${consulta.estado}`;

    fila.append(nombre, mensaje, detalle);

    if (consulta.estado === "pendiente") {
      const atender = document.createElement("button");
      atender.type = "button";
      atender.textContent = "Marcar como atendida";

      atender.addEventListener("click", async () => {
        atender.disabled = true;
        atender.textContent = "Guardando…";

        try {
          const { error } = await cliente
            .from("consultas")
            .update({ estado: "atendida" })
            .eq("id", consulta.id)
            .select("id")
            .single();

          if (error) throw error;

          detalle.textContent = `${consulta.correo} · Estado: atendida`;
          atender.remove();
          aviso.textContent = `Consulta de ${consulta.nombre} marcada como atendida.`;
        } catch {
          aviso.textContent = "No se pudo confirmar el cambio. Recarga el panel para comprobar el estado.";
          atender.disabled = false;
          atender.textContent = "Marcar como atendida";
        }
      });

      fila.append(atender);
    }

    lista.append(fila);
  }
}