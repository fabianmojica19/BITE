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
    await mostrarPedidos();
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
const cerrarSesion = document.getElementById("cerrar-sesion");

cerrarSesion.addEventListener("click", async () => {
  cerrarSesion.disabled = true;

  try {
    const { error } = await cliente.auth.signOut({ scope: "local" });
    if (error) throw error;

    document.getElementById("panel-consultas").hidden = true;
    document.getElementById("lista-consultas").replaceChildren();
    formulario.reset();
    versionPedidos++;
    document.getElementById("panel-pedidos").hidden = true;
    document.getElementById("lista-pedidos").replaceChildren();
    estado.textContent = "Sesión cerrada.";
    document.getElementById("correo-admin").focus();
  } catch {
    estado.textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
  } finally {
    cerrarSesion.disabled = false;
  }
});
let versionPedidos = 0;

const panelPedidos = document.getElementById("panel-pedidos");
const listaPedidos = document.getElementById("lista-pedidos");
const avisoPedidos = document.getElementById("aviso-pedidos");
const actualizarPedidos = document.getElementById("actualizar-pedidos");

const estadosPedido = {
  pendiente: "Pendiente",
  "en preparacion": "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

async function mostrarPedidos() {
  const versionActual = ++versionPedidos;

  panelPedidos.hidden = false;
  actualizarPedidos.disabled = true;
  listaPedidos.replaceChildren();
  avisoPedidos.textContent = "Cargando pedidos…";

  try {
    const { data, error } = await cliente
      .from("pedidos_bite")
      .select(
        "id, numero, creado_en, cliente, telefono, producto_nombre, cantidad, total, observaciones, estado"
      )
      .order("creado_en", { ascending: false });

    if (versionActual !== versionPedidos) return;
    if (error) throw error;

    avisoPedidos.textContent = data.length
      ? `Pedidos recibidos: ${data.length}`
      : "Todavía no hay pedidos.";

    for (const pedido of data) {
      const tarjeta = document.createElement("li");
      const titulo = document.createElement("h3");
      const fecha = document.createElement("p");
      const clientePedido = document.createElement("p");
      const detalle = document.createElement("p");
      const notas = document.createElement("p");
      const etiqueta = document.createElement("label");
      const selector = document.createElement("select");
      const guardar = document.createElement("button");
      const mensaje = document.createElement("p");

      tarjeta.dataset.estado = pedido.estado;

      titulo.textContent = `Pedido #${pedido.numero}`;

      fecha.textContent = new Date(pedido.creado_en).toLocaleString(
        "es-PA",
        {
          timeZone: "America/Panama",
          dateStyle: "medium",
          timeStyle: "short"
        }
      );

      clientePedido.textContent =
        `${pedido.cliente} · Teléfono: ${pedido.telefono}`;

      detalle.textContent =
        `${pedido.cantidad} × ${pedido.producto_nombre} · ` +
        `Total: $${Number(pedido.total).toFixed(2)}`;

      notas.textContent = pedido.observaciones
        ? `Observaciones: ${pedido.observaciones}`
        : "Sin observaciones.";

      selector.id = `estado-pedido-${pedido.id}`;
      etiqueta.htmlFor = selector.id;
      etiqueta.textContent = "Estado del pedido";

      for (const [valor, texto] of Object.entries(estadosPedido)) {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        selector.append(opcion);
      }

      selector.value = pedido.estado;
      guardar.type = "button";
      guardar.textContent = "Guardar estado";
      mensaje.setAttribute("role", "status");

      guardar.addEventListener("click", async () => {
        const nuevoEstado = selector.value;

        if (nuevoEstado === pedido.estado) {
          mensaje.textContent = "Ese estado ya está guardado.";
          return;
        }

        guardar.disabled = true;
        selector.disabled = true;
        mensaje.textContent = "Guardando…";

        try {
          const { data: actualizado, error: errorEstado } = await cliente
            .from("pedidos_bite")
            .update({ estado: nuevoEstado })
            .eq("id", pedido.id)
            .eq("estado", pedido.estado)
            .select("estado")
            .single();

          if (versionActual !== versionPedidos) return;
          if (errorEstado) throw errorEstado;

          pedido.estado = actualizado.estado;
          selector.value = actualizado.estado;
          tarjeta.dataset.estado = actualizado.estado;

          mensaje.textContent =
            `Estado guardado: ${estadosPedido[actualizado.estado]}.`;
        } catch {
          if (versionActual !== versionPedidos) return;

          selector.value = pedido.estado;
          mensaje.textContent =
            "No se pudo confirmar el cambio. Pulsa «Actualizar pedidos» " +
            "para consultar el estado guardado.";
        } finally {
          guardar.disabled = false;
          selector.disabled = false;
        }
      });

      tarjeta.append(
        titulo,
        fecha,
        clientePedido,
        detalle,
        notas,
        etiqueta,
        selector,
        guardar,
        mensaje
      );

      listaPedidos.append(tarjeta);
    }
  } catch (error) {
    if (versionActual !== versionPedidos) return;

    avisoPedidos.textContent =
      `No se pudieron cargar los pedidos: ${error.message}`;
  } finally {
    if (versionActual === versionPedidos) {
      actualizarPedidos.disabled = false;
    }
  }
}

actualizarPedidos.addEventListener("click", mostrarPedidos);