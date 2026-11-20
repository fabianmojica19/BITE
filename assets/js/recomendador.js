const formularioRecomendador = document.getElementById("formulario-recomendador");
const campoPreferencia = document.getElementById("preferencia");
const resultado = document.getElementById("resultado-recomendador");
const botonRecomendar = formularioRecomendador.querySelector("button");

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const grupos = {
  pollo: ["pollo", "chicken", "crispy", "empanizado", "empanizada"],
  tocino: ["tocino", "bacon", "tocineta"],
  picante: ["picante", "picantes", "spicy", "jalapeno", "jalapenos", "pique"],
  doble: ["doble", "dos carnes", "mucha carne", "dos tortas"],
  clasica: ["clasica", "clasico", "tradicional", "sencilla", "sencillo"],
  queso: ["queso", "cheddar", "cheese"],
  res: ["res", "carne"],
  cebolla: ["cebolla"],
  tomate: ["tomate"],
  lechuga: ["lechuga"],
  pepinillos: ["pepinillo", "pepinillos"]
};

function contieneFrase(texto, frase) {
  return ` ${texto.replace(/[^a-z0-9]+/g, " ")} `
    .includes(` ${frase} `);
}

const tarjetas = document.querySelectorAll("#menu .menu-bento article");

const menu = Array.from(tarjetas, (tarjeta) => {
  const nombre = tarjeta.querySelector("h3")?.textContent.trim() || "";
  const descripcion =
    tarjeta.querySelector("h3 + p")?.textContent.trim() || "";

  const textoPrecio =
    tarjeta.querySelector(".producto__precio")?.textContent || "";

  const precio = Number(
    textoPrecio.replace(/[^\d.,]/g, "").replace(",", ".")
  );

  const texto = normalizar(`${nombre} ${descripcion}`);

  const etiquetas = Object.keys(grupos).filter((grupo) =>
    grupos[grupo].some((palabra) => contieneFrase(texto, palabra))
  );

  return { nombre, descripcion, precio, etiquetas };
}).filter((producto) =>
  producto.nombre && Number.isFinite(producto.precio) && producto.precio > 0
);

function convertirNumeros(texto) {
  const numeros = {
    cero: 0,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    cien: 100
  };

  return texto.replace(
    /\b[a-z]+\b/g,
    (palabra) => numeros[palabra] ?? palabra
  );
}

function leerPresupuesto(pedido) {
  const texto = convertirNumeros(pedido)
    .replace(/\bb\/\.?/g, "$")
    .replace(/\busd\b/g, "dolares");

  const cantidad = String.raw`\$?\s*(\d+(?:[.,]\d{1,2})?)`;
  const moneda = String.raw`\s*(?:dolares?|balboas?)?`;

  const rango = texto.match(new RegExp(
    String.raw`\b(?:entre|desde|de)\s+${cantidad}${moneda}\s+(?:y|a|hasta)\s+${cantidad}`
  ));

  if (rango) {
    return {
      minimo: Number(rango[1].replace(",", ".")),
      maximo: Number(rango[2].replace(",", ".")),
      estricto: false
    };
  }

  const limite = texto.match(new RegExp(
    String.raw`\b(menos de|hasta|maximo|como maximo|presupuesto(?: de)?|tengo(?: solamente| solo| apenas)?|cuento con|puedo gastar|gastar)\s+${cantidad}`
  ));

  const dinero = texto.match(
    /\$\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:dolares?|balboas?)\b/
  );

  const numeroSolo = texto.trim().match(/^\d+(?:[.,]\d{1,2})?$/);

  const monto = limite?.[2] || dinero?.[1] || dinero?.[2] || numeroSolo?.[0];

  return {
    minimo: 0,
    maximo: monto ? Number(monto.replace(",", ".")) : Infinity,
    estricto: limite?.[1] === "menos de"
  };
}

function leerGustos(pedido) {
  const excluidos = new Set();
  let positivo = pedido;

  for (const [grupo, palabras] of Object.entries(grupos)) {
    for (const palabra of palabras) {
      const negacion = new RegExp(
        String.raw`\b(?:sin|nada de|nada|no quiero|no me gusta|no me gustan|que no tenga|que no lleve|que no)\s+${palabra}\b`,
        "g"
      );

      positivo = positivo.replace(negacion, () => {
        excluidos.add(grupo);
        return " ";
      });
    }
  }

  const preferidos = Object.keys(grupos).filter((grupo) =>
    grupos[grupo].some((palabra) => contieneFrase(positivo, palabra))
  );

  return { excluidos, preferidos };
}

function dinero(valor) {
  return `$${valor.toFixed(2)}`;
}

formularioRecomendador.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const pedido = normalizar(campoPreferencia.value.trim());

  if (!pedido) {
    resultado.textContent = "Escribe qué te apetece o cuánto quieres gastar.";
    return;
  }

  if (!menu.length) {
    resultado.textContent = "No pude leer el menú. Recarga la página.";
    return;
  }

  // El catálogo no permite comprobar requisitos dietéticos o alergias.
  if (/\b(alergi[a-z]*|celiac[a-z]*|gluten|lactosa|vegan[a-z]*|vegetarian[a-z]*|halal|kosher)\b/.test(pedido)) {
    resultado.textContent =
      "Para ese requisito alimentario, consulta al local antes de pedir. " +
      "El menú no contiene información suficiente para confirmar una opción adecuada.";
    return;
  }

  const presupuesto = leerPresupuesto(pedido);
  const gustos = leerGustos(pedido);

  if (presupuesto.minimo > presupuesto.maximo) {
    resultado.textContent =
      "Revisa el rango de dinero. Puedes escribir, por ejemplo, «entre 8 y 10 dólares».";
    return;
  }

  const compatibles = menu
    .filter((producto) =>
      !producto.etiquetas.some((etiqueta) => gustos.excluidos.has(etiqueta))
    )
    .sort((a, b) => a.precio - b.precio);

  if (!compatibles.length) {
    resultado.textContent =
      "Las descripciones del menú no muestran una hamburguesa que cumpla esas exclusiones. " +
      "Consulta al local si puede preparar una a tu gusto.";
    return;
  }

  const disponibles = compatibles.filter((producto) => {
    const cumpleMaximo = presupuesto.estricto
      ? producto.precio < presupuesto.maximo
      : producto.precio <= presupuesto.maximo;

    return producto.precio >= presupuesto.minimo && cumpleMaximo;
  });

  if (!disponibles.length) {
    const economica = compatibles[0];
    const diferencia = economica.precio - presupuesto.maximo;

    if (diferencia > 0) {
      resultado.textContent =
        `Con ${dinero(presupuesto.maximo)} todavía no alcanza para una opción compatible. ` +
        `La más económica es ${economica.nombre}, por ${dinero(economica.precio)}. ` +
        `Te faltarían ${dinero(diferencia)}.`;
      return;
    }

    resultado.textContent =
      "No hay una opción compatible dentro del rango que indicaste. " +
      `Como alternativa, ${economica.nombre} cuesta ${dinero(economica.precio)}.`;
    return;
  }

  const quiereEconomica =
    /\b(barat[a-z]*|economic[a-z]*|asequible|ahorrar)\b|poco dinero/.test(pedido);

  const opciones = disponibles.map((producto) => ({
    ...producto,
    puntos: gustos.preferidos.filter((gusto) =>
      producto.etiquetas.includes(gusto)
    ).length
  }));

  opciones.sort((a, b) =>
    quiereEconomica
      ? a.precio - b.precio || b.puntos - a.puntos
      : b.puntos - a.puntos || a.precio - b.precio
  );

  const mejor = opciones[0];
  let motivo = mejor.descripcion;

  if (mejor.puntos < gustos.preferidos.length) {
    motivo =
      "Es una alternativa que cumple el presupuesto y las exclusiones indicadas, " +
      "aunque no reúne todos tus gustos. " + mejor.descripcion;
  } else if (gustos.preferidos.length === 0 || quiereEconomica) {
    motivo =
      "Es la opción más económica que cumple las condiciones indicadas. " +
      mejor.descripcion;
  }

  resultado.textContent =
    `Te sugiero ${mejor.nombre} por ${dinero(mejor.precio)}. ${motivo}`;
});

botonRecomendar.disabled = false;