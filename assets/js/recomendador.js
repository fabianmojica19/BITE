const tarjetas = document.querySelectorAll("#menu .menu-bento article");

const catalogoBite = Array.from(tarjetas, (tarjeta) => ({
  nombre: tarjeta.querySelector("h3").textContent.trim(),
  precio: Number(
    tarjeta.querySelector(".producto__precio").textContent.trim().replace("$", "")
  )
}));

const formularioRecomendador = document.getElementById("formulario-recomendador");
const campoPreferencia = document.getElementById("preferencia");
const resultado = document.getElementById("resultado-recomendador");
const botonRecomendar = formularioRecomendador.querySelector("button");

function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Lee los ingredientes de cada tarjeta del menú.
const menu = catalogoBite.map((producto, indice) => {
  const descripcion = tarjetas[indice]
    .querySelector("h3 + p")
    .textContent.trim();

  return {
    ...producto,
    descripcion,
    palabras: new Set(normalizar(`${producto.nombre} ${descripcion}`).match(/[a-z]+/g))
  };
});

formularioRecomendador.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const pedido = normalizar(campoPreferencia.value.trim());

  // «Menos de» excluye el límite. «Hasta» y «máximo» lo incluyen.
  const monto = pedido.match(
    /(?:\$\s*|(?:menos de|hasta|maximo|presupuesto de)\s+)(\d+(?:[.,]\d{1,2})?)/
  );
  const limite = monto ? Number(monto[1].replace(",", ".")) : Infinity;
  const limiteEstricto = /\bmenos de\s*\$?\s*\d/.test(pedido);

  const fraseSinPicante = /\b(?:sin picante|nada picante|que no pique)\b/g;
  const pedidoPositivo = pedido.replace(fraseSinPicante, " ");
  const evitaPicante = pedidoPositivo !== pedido;

  const disponibles = menu.filter((producto) => {
    const cumplePrecio = limiteEstricto
      ? producto.precio < limite
      : producto.precio <= limite;

    const esPicante = producto.palabras.has("picante")
      || producto.palabras.has("jalapenos");

    return cumplePrecio && !(evitaPicante && esPicante);
  });

  if (disponibles.length === 0) {
    resultado.textContent = "Ninguna hamburguesa del menú entra en ese presupuesto.";
    return;
  }

  const ignorar = new Set([
    "quiero", "algo", "con", "una", "que", "por", "para", "menos", "hasta",
    "maximo", "presupuesto", "dolares", "hamburguesa", "bite", "del", "las"
  ]);
  const gustos = [...new Set(pedidoPositivo.match(/[a-z]{3,}/g) || [])]
    .filter((palabra) => !ignorar.has(palabra));

  const opciones = disponibles.map((producto) => ({
    ...producto,
    puntos: gustos.filter((palabra) => producto.palabras.has(palabra)).length
  }));

  opciones.sort((a, b) => b.puntos - a.puntos || a.precio - b.precio);
  const mejor = opciones[0];

  if (mejor.puntos === 0 && gustos.length > 0) {
    resultado.textContent =
      "No encontré ese gusto dentro de tu presupuesto. Prueba con pollo, tocino o picante.";
    return;
  }

  const motivo = mejor.puntos > 0
    ? mejor.descripcion
    : "Es la opción más económica dentro de tu presupuesto.";

  resultado.textContent =
    `Te recomiendo ${mejor.nombre} por $${mejor.precio.toFixed(2)}. ${motivo}`;
});

botonRecomendar.disabled = false;