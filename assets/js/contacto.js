const urlProyecto = "https://ivggucipgkiuyhjsgqzg.supabase.co";
const clavePublica = "sb_publishable_vPuf7fJPyyBN5XGMzgG26Q_cUJGV0mK";
const formulario = document.getElementById("formulario-contacto");
const boton = formulario.querySelector('button[type="submit"]');
const estado = document.getElementById("estado-consulta");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (boton.disabled) return;

  const datos = new FormData(formulario);
  const consulta = {
    nombre: datos.get("nombre").trim(),
    correo: datos.get("correo").trim(),
    mensaje: datos.get("mensaje").trim()
  };

  if (!consulta.nombre || !consulta.mensaje) {
    estado.textContent = "Escribe tu nombre y tu consulta.";
    return;
  }

  boton.disabled = true;
  estado.textContent = "Enviando consulta…";

  try {
    const respuesta = await fetch(`${urlProyecto}/rest/v1/consultas`, {
      method: "POST",
      headers: {
        "apikey": clavePublica,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(consulta)
    });

    if (respuesta.ok) {
      formulario.reset();
      estado.textContent = "Gracias. Recibimos tu consulta.";
    } else {
      const detalle = await respuesta.json();
      estado.textContent = `Error ${respuesta.status}: ${detalle.message || detalle.error || "Sin detalle"}`;
    }
  } catch {
    estado.textContent = "No se pudo confirmar el envío. Revisa tu conexión.";
  } finally {
    boton.disabled = false;
  }
});

boton.disabled = false;