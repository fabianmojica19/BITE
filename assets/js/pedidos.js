(() => {
  const ventana = document.getElementById("hacer-pedido");
  const cerrar = document.getElementById("cerrar-pedido");
  const producto = document.getElementById("pedido-producto");
  const cantidad = document.getElementById("pedido-cantidad");
  const total = document.getElementById("total-pedido");

  const identificadores = {
    "BITE Clásica": "clasica",
    "Doble BITE": "doble",
    "Bacon BITE": "bacon",
    "Spicy BITE": "spicy",
    "Crispy BITE": "crispy"
  };

  const precios = new Map();

  function actualizarTotal() {
    const precio = precios.get(producto.value);
    const unidades = Number(cantidad.value);

    if (precio === undefined) {
      total.textContent = "Selecciona tu hamburguesa.";
      return;
    }

    if (!cantidad.checkValidity() || !Number.isInteger(unidades)) {
      total.textContent = "Elige una cantidad entre 1 y 20.";
      return;
    }

    total.textContent =
      `Total estimado: $${(precio * unidades).toFixed(2)}`;
  }

  const tarjetas = document.querySelectorAll(
    "#menu .menu-bento article"
  );

  tarjetas.forEach((tarjeta) => {
    const nombre = tarjeta.querySelector("h3")?.textContent.trim();
    const identificador = identificadores[nombre];

    const precioTexto =
      tarjeta.querySelector(".producto__precio")?.textContent || "";

    const precio = Number(
      precioTexto.replace(/[^\d.,]/g, "").replace(",", ".")
    );

    if (!identificador || !Number.isFinite(precio) || precio <= 0) {
      return;
    }

    precios.set(identificador, precio);

    const enlaces = tarjeta.querySelectorAll(
      "a.producto__ordenar, a.producto__enlace"
    );

    enlaces.forEach((enlace) => {
      enlace.href = "#hacer-pedido";
      enlace.removeAttribute("target");
      enlace.setAttribute("aria-haspopup", "dialog");
      enlace.setAttribute("aria-controls", "hacer-pedido");

      enlace.addEventListener("click", (evento) => {
        evento.preventDefault();

        producto.value = identificador;
        actualizarTotal();
        ventana.showModal();

        document.documentElement.classList.add("pedido-abierto");
        cantidad.focus();
      });
    });
  });

  producto.addEventListener("change", actualizarTotal);
  cantidad.addEventListener("input", actualizarTotal);

  cerrar.addEventListener("click", () => {
    ventana.close();
  });

  ventana.addEventListener("close", () => {
    document.documentElement.classList.remove("pedido-abierto");
  });
})();
(() => {
  const formulario = document.getElementById("formulario-pedido");
  const boton = document.getElementById("confirmar-pedido");
  const estado = document.getElementById("estado-pedido");
  const producto = document.getElementById("pedido-producto");
  const cantidad = document.getElementById("pedido-cantidad");
  const nombre = document.getElementById("pedido-nombre");
  const telefono = document.getElementById("pedido-telefono");
  const observaciones = document.getElementById("pedido-observaciones");

  const url =
    "https://ivggucipgkiuyhjsgqzg.supabase.co/rest/v1/rpc/crear_pedido_bite";

  const clavePublica =
    "sb_publishable_vPuf7fJPyyBN5XGMzgG26Q_cUJGV0mK";

  const campos = [
    producto,
    cantidad,
    nombre,
    telefono,
    observaciones
  ];

  let enviando = false;
  let envioPendiente = null;

  boton.disabled = false;

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (enviando) return;

    if (!envioPendiente) {
      nombre.value = nombre.value.trim();
      telefono.value = telefono.value.trim();

      if (!formulario.reportValidity()) return;

      const digitos = telefono.value.replace(/\D/g, "");

      if (
        !/^[0-9+() .-]+$/.test(telefono.value) ||
        digitos.length < 7 ||
        digitos.length > 15
      ) {
        estado.textContent = "Escribe un teléfono válido.";
        telefono.focus();
        return;
      }

      envioPendiente = {
        p_solicitud_id: crypto.randomUUID(),
        p_producto_id: producto.value,
        p_cantidad: Number(cantidad.value),
        p_cliente: nombre.value,
        p_telefono: telefono.value,
        p_observaciones: observaciones.value.trim()
      };
    }

    enviando = true;
    boton.disabled = true;
    boton.textContent = "Enviando pedido…";
    estado.textContent = "Estamos registrando tu pedido.";

    campos.forEach((campo) => {
      campo.disabled = true;
    });

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 20000);

    try {
      const respuesta = await fetch(url, {
        method: "POST",
        headers: {
          apikey: clavePublica,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(envioPendiente),
        signal: controlador.signal
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        // Estos errores indican que el pedido fue rechazado.
        if ([400, 401, 403, 404, 409, 422].includes(respuesta.status)) {
          envioPendiente = null;
        }

        throw new Error(
          datos.message || "No se pudo confirmar el pedido."
        );
      }

      if (
        datos.numero === undefined ||
        !Number.isFinite(Number(datos.total))
      ) {
        throw new Error("La confirmación recibida está incompleta.");
      }

      estado.textContent =
        `¡Pedido #${datos.numero} registrado! ` +
        `Total: $${Number(datos.total).toFixed(2)}. ` +
        "Tu pedido está pendiente de atención.";

      envioPendiente = null;
      formulario.reset();

      producto.dispatchEvent(new Event("change"));
    } catch (error) {
      if (envioPendiente) {
        estado.textContent =
          "Todavía no pudimos confirmar la respuesta. " +
          "Pulsa «Reintentar confirmación» para comprobar el mismo envío.";
      } else {
        estado.textContent = error.message;
      }
    } finally {
      clearTimeout(temporizador);
      enviando = false;
      boton.disabled = false;

      boton.textContent = envioPendiente
        ? "Reintentar confirmación"
        : "Confirmar pedido";

      campos.forEach((campo) => {
        campo.disabled = Boolean(envioPendiente);
      });
    }
  });
})();