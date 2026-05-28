import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import "./styles.css";

const PAYMENT_LINK = "https://mpago.la/22NbHX7";
const CATALOG_BUCKET = "admin-catalog-images";
const CART_STORAGE_KEY = "consultation_catalog_cart";

const consultationClient = {
  nombre: "Diego Paredes",
  correo: "consulta@soonest.pe"
};

const columns = [
  { key: "codigo", label: "Código" },
  { key: "repuesto", label: "Repuesto" },
  { key: "categoria", label: "Categoría" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" },
  { key: "anio", label: "Año" },
  { key: "proveedor", label: "Proveedor" },
  { key: "rotacion", label: "Rotación" },
  { key: "estado", label: "Estado" }
];

const filterFields = ["categoria", "marca", "estado"];

const fieldLabels = Object.fromEntries(
  columns.map((column) => [column.key, column.label])
);

const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#0f172a" offset="0"/>
          <stop stop-color="#16a34a" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="900" height="620" fill="url(#g)"/>
      <circle cx="690" cy="120" r="120" fill="rgba(255,255,255,0.12)"/>
      <circle cx="170" cy="520" r="160" fill="rgba(255,255,255,0.10)"/>
      <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="54" fill="white" font-weight="800">ImportSmart ML</text>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="26" fill="rgba(255,255,255,0.78)">Repuesto sin imagen</text>
    </svg>
  `);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPriceValue(row) {
  const raw = row?.precio ?? row?.costo ?? "0";
  const clean = String(raw).replace(",", ".").replace(/[^\d.]/g, "");
  const number = Number.parseFloat(clean);

  return Number.isFinite(number) ? number : 0;
}

function formatPrice(row) {
  const raw = row?.precio ?? row?.costo;

  if (!raw) return "Consultar";

  if (String(raw).toLowerCase().includes("us$")) return String(raw);
  if (String(raw).toLowerCase().includes("s/")) return String(raw);

  return `US$ ${raw}`;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `US$ ${amount.toFixed(2)}`;
}

function createOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(100000 + Math.random() * 900000);

  return `ORD-${year}${month}-${random}`;
}

function downloadCsv(filename, rows) {
  const headers = columns.map((column) => column.label).join(",");

  const body = rows
    .map((row) =>
      columns
        .map((column) =>
          `"${String(row[column.key] ?? "").replaceAll('"', '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob([headers + "\n" + body], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function badgeClass(value) {
  const text = normalize(value);

  if (
    text.includes("alta") ||
    text.includes("activo") ||
    text.includes("aprob") ||
    text.includes("listo") ||
    text.includes("produccion") ||
    text.includes("producción") ||
    text.includes("validado") ||
    text.includes("operativa") ||
    text.includes("rentable") ||
    text.includes("bajo") ||
    text.includes("normal")
  ) {
    return "success";
  }

  if (
    text.includes("pend") ||
    text.includes("revision") ||
    text.includes("revisión") ||
    text.includes("medio") ||
    text.includes("media") ||
    text.includes("observ") ||
    text.includes("pruebas") ||
    text.includes("generacion") ||
    text.includes("generación")
  ) {
    return "warning";
  }

  if (
    text.includes("rechaz") ||
    text.includes("critico") ||
    text.includes("crítico") ||
    text.includes("alto") ||
    text.includes("no leido") ||
    text.includes("no leído") ||
    text.includes("sobrestock")
  ) {
    return "danger";
  }

  return "neutral";
}

function resolveImageUrl(image) {
  if (!image) return null;

  if (typeof image === "string") return image;

  const directUrl =
    image.image_url ||
    image.url ||
    image.public_url ||
    image.publicUrl ||
    image.src;

  if (directUrl) return directUrl;

  if (image.storage_path) {
    const { data } = supabase.storage
      .from(CATALOG_BUCKET)
      .getPublicUrl(image.storage_path);

    return data?.publicUrl ?? null;
  }

  return null;
}

function getRowImages(row) {
  const images = Array.isArray(row?.images) ? row.images : [];
  const urls = images.map(resolveImageUrl).filter(Boolean);

  return urls.length > 0 ? urls : [FALLBACK_IMAGE];
}

export default function ConsultationCatalogViewPage() {
  const [rows, setRows] = useState([]);
  const [imageIndexes, setImageIndexes] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState(() =>
    Object.fromEntries(filterFields.map((field) => [field, "Todos"]))
  );

  const [modal, setModal] = useState(null);

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  });

  const [paymentScreen, setPaymentScreen] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  async function loadCatalog() {
    setLoading(true);

    const { data: parts, error: partsError } = await supabase
      .from("admin_catalog_parts")
      .select("*")
      .order("id", { ascending: false });

    if (partsError) {
      console.error("Error cargando catálogo:", partsError);
      showToast("No se pudo cargar el catálogo de repuestos");
      setLoading(false);
      return;
    }

    const activeParts = (parts ?? []).filter(
      (part) => normalize(part.estado) === "activo"
    );

    const partIds = activeParts.map((item) => item.id);
    let imagesByPart = {};

    if (partIds.length > 0) {
      const { data: images, error: imagesError } = await supabase
        .from("admin_catalog_part_images")
        .select("*")
        .in("part_id", partIds);

      if (imagesError) {
        console.warn("No se pudieron cargar imágenes del catálogo:", imagesError);
      } else {
        imagesByPart = (images ?? []).reduce((acc, image) => {
          const partId =
            image.part_id ||
            image.catalog_part_id ||
            image.repuesto_id;

          if (!partId) return acc;
          if (!acc[partId]) acc[partId] = [];

          acc[partId].push(image);
          return acc;
        }, {});

        Object.keys(imagesByPart).forEach((partId) => {
          imagesByPart[partId].sort((a, b) => {
            const aOrder = a.position ?? a.orden ?? a.order ?? a.id ?? 0;
            const bOrder = b.position ?? b.orden ?? b.order ?? b.id ?? 0;

            return aOrder - bOrder;
          });
        });
      }
    }

    const mappedRows = activeParts.map((part) => ({
      ...part,
      images: imagesByPart[part.id] ?? []
    }));

    setRows(mappedRows);
    setLoading(false);
  }

  const optionsByFilter = useMemo(() => {
    return Object.fromEntries(
      filterFields.map((field) => [
        field,
        ["Todos", ...new Set(rows.map((row) => row[field]).filter(Boolean))]
      ])
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = normalize(search);

    return rows.filter((row) => {
      const matchesText =
        !term ||
        normalize(
          `${row.codigo ?? ""} ${row.repuesto ?? ""} ${row.categoria ?? ""} ${row.marca ?? ""} ${row.modelo ?? ""} ${row.anio ?? ""} ${row.region ?? ""} ${row.proveedor ?? ""} ${row.costo ?? ""} ${row.precio ?? ""} ${row.rotacion ?? ""} ${row.estado ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantity || 1), 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + getPriceValue(item) * Number(item.quantity || 1),
      0
    );
  }, [cart]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function moveImage(rowId, total, direction) {
    setImageIndexes((prev) => {
      const current = prev[rowId] ?? 0;
      const next = (current + direction + total) % total;

      return {
        ...prev,
        [rowId]: next
      };
    });
  }

  function addToCart(row) {
    if (normalize(row.estado) !== "activo") {
      showToast("Este repuesto no está disponible para compra");
      return;
    }

    setCart((prev) => {
      const exists = prev.find((item) => item.id === row.id);

      if (exists) {
        return prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                quantity: Number(item.quantity || 1) + 1
              }
            : item
        );
      }

      return [
        ...prev,
        {
          ...row,
          quantity: 1
        }
      ];
    });

    showToast("Agregado al carrito correctamente");
  }

  function updateCartQuantity(id, quantity) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity
            }
          : item
      )
    );
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast("Producto retirado del carrito");
  }

  function clearCart() {
    setCart([]);
    showToast("Carrito limpiado");
  }

  async function handlePayNow() {
    if (cart.length === 0) {
      showToast("Agrega productos antes de pagar");
      return;
    }

    setCreatingOrder(true);

    const orderNumber = createOrderNumber();

    const normalizedItems = cart.map((item) => {
      const quantity = Number(item.quantity || 1);
      const price = getPriceValue(item);

      return {
        product: item,
        quantity,
        price,
        subtotal: price * quantity
      };
    });

    const total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);

    const orderPayload = {
      order_number: orderNumber,
      cliente_nombre: consultationClient.nombre,
      cliente_correo: consultationClient.correo,
      total,
      moneda: "USD",
      estado: "Pendiente de pago",
      metodo_pago: "Mercado Pago",
      payment_link: PAYMENT_LINK,
      mensaje: `Nuevo pedido generado por ${consultationClient.nombre}`,
      leido_admin: false
    };

    const { data: order, error: orderError } = await supabase
      .from("consultation_marketplace_orders")
      .insert([orderPayload])
      .select()
      .single();

    if (orderError) {
      console.error("Error creando orden:", orderError);
      showToast("No se pudo generar la orden de pago");
      setCreatingOrder(false);
      return;
    }

    const itemsPayload = normalizedItems.map((item) => ({
      order_id: order.id,
      producto_id: item.product.id ?? null,
      codigo: item.product.codigo ?? "",
      repuesto: item.product.repuesto ?? "",
      categoria: item.product.categoria ?? "",
      marca: item.product.marca ?? "",
      modelo: item.product.modelo ?? "",
      region: item.product.region ?? "",
      proveedor: item.product.proveedor ?? "",
      precio_unitario: item.price,
      cantidad: item.quantity,
      subtotal: item.subtotal
    }));

    const { error: itemsError } = await supabase
      .from("consultation_marketplace_order_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("Error guardando detalle del pedido:", itemsError);
      showToast("La orden se creó, pero no se guardó el detalle");
      setCreatingOrder(false);
      return;
    }

    setPaymentScreen({
      order,
      items: normalizedItems
    });

    setModal(null);
    setCreatingOrder(false);
  }

  async function finishPaymentAndBack() {
    if (!paymentScreen?.order?.id) return;

    const message = `Gracias por su compra. Su número de orden de pago es ${paymentScreen.order.order_number}.`;

    const { data, error } = await supabase
      .from("consultation_marketplace_orders")
      .update({
        estado: "Pago simulado confirmado",
        mensaje: message,
        leido_admin: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", paymentScreen.order.id)
      .select()
      .single();

    if (error) {
      console.error("Error confirmando pago:", error);
      showToast("No se pudo confirmar el pago simulado");
      return;
    }

    setSuccessOrder(data);
    setPaymentScreen(null);
    setCart([]);
  }

  function runAction(actionId, row) {
    if (actionId === "view") {
      setModal({ type: "detail", row });
      return;
    }

    if (actionId === "images" || actionId === "gallery") {
      setModal({
        type: "gallery",
        row,
        images: getRowImages(row),
        index: 0
      });
      return;
    }

    if (actionId === "cart") {
      addToCart(row);
      return;
    }

    if (actionId === "download") {
      downloadCsv("consultation-catalog-view.csv", [row]);
      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  return (
    <main className="consultation-catalog-view-page">
      <section className="consultation-catalog-view-hero">
        <div className="consultation-hero-content">
          <span className="consultation-catalog-view-eyebrow">
            Usuario consulta
          </span>

          <h2>Bienvenid@ 🤗</h2>

          <p>
            Aquí podrás explorar repuestos publicados desde el catálogo maestro,
            revisar imágenes, agregar productos al carrito y finalizar tu compra
            de forma rápida.
          </p>

          <div className="consultation-hero-tags">
            <span>Marketplace interno</span>
            <span>Productos actualizados</span>
            <span>Pago rápido</span>
          </div>
        </div>

        <div className="consultation-hero-cart">
          <div>
            <span>Carrito activo</span>
            <strong>{cartCount}</strong>
            <p>
              {cartCount === 1
                ? "producto seleccionado"
                : "productos seleccionados"}
            </p>
          </div>

          <button onClick={() => setModal({ type: "cart" })}>
            Ver carrito
          </button>
        </div>

        <div className="consultation-catalog-view-hero-actions">
          <button
            onClick={() =>
              downloadCsv("consultation-catalog-view.csv", filteredRows)
            }
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="consultation-catalog-view-toolbar">
        <label className="consultation-catalog-view-search">
          <span>Buscar repuesto</span>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, repuesto, marca, modelo o región..."
          />
        </label>

        {filterFields.map((field) => (
          <label key={field}>
            <span>{fieldLabels[field] ?? field}</span>

            <select
              value={filters[field]}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  [field]: event.target.value
                }))
              }
            >
              {optionsByFilter[field].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
      </section>

      <section className="consultation-catalog-view-summary">
        <article>
          <span>Productos disponibles</span>
          <strong>{rows.length}</strong>
          <small>publicados en catálogo</small>
        </article>

        <article>
          <span>Resultados filtrados</span>
          <strong>{filteredRows.length}</strong>
          <small>según tu búsqueda</small>
        </article>

        <article>
          <span>Carrito</span>
          <strong>{cartCount}</strong>
          <small>productos seleccionados</small>
        </article>
      </section>

      <section className="consultation-marketplace">
        <div className="consultation-marketplace-head">
          <div>
            <span>Marketplace</span>
            <h3>Repuestos publicados</h3>
          </div>

          <small>
            {loading ? "Cargando..." : `${filteredRows.length} productos`}
          </small>
        </div>

        <div className="consultation-marketplace-grid">
          {filteredRows.map((row) => {
            const images = getRowImages(row);
            const currentImage = imageIndexes[row.id] ?? 0;
            const isActive = normalize(row.estado) === "activo";

            return (
              <article className="consultation-product-card" key={row.id}>
                <div className="consultation-product-image">
                  <img src={images[currentImage]} alt={row.repuesto} />

                  <div className="consultation-product-floating">
                    <span>{row.codigo}</span>
                    <span>
                      {currentImage + 1}/{images.length}
                    </span>
                  </div>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="consultation-image-arrow left"
                        onClick={() => moveImage(row.id, images.length, -1)}
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        className="consultation-image-arrow right"
                        onClick={() => moveImage(row.id, images.length, 1)}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                <div className="consultation-product-body">
                  <div className="consultation-product-title">
                    <div>
                      <span>{row.categoria || "Sin categoría"}</span>
                      <h3>{row.repuesto}</h3>
                    </div>

                    <strong>{formatPrice(row)}</strong>
                  </div>

                  <div className="consultation-product-tags">
                    <span>{row.marca || "Marca no definida"}</span>
                    <span>{row.modelo || "Modelo no definido"}</span>
                    <span>{row.anio || "Año no definido"}</span>
                  </div>

                  <div className="consultation-product-info">
                    <article>
                      <span>Proveedor</span>
                      <strong>{row.proveedor || "No definido"}</strong>
                    </article>

                    <article>
                      <span>Región</span>
                      <strong>{row.region || "Todas"}</strong>
                    </article>

                    <article>
                      <span>Rotación</span>
                      <strong>{row.rotacion || "Media"}</strong>
                    </article>

                    <article>
                      <span>Estado</span>
                      <strong
                        className={`consultation-catalog-view-badge ${badgeClass(
                          row.estado
                        )}`}
                      >
                        {row.estado}
                      </strong>
                    </article>
                  </div>
                </div>

                <div className="consultation-product-actions">
                  <button type="button" onClick={() => runAction("view", row)}>
                    Ver detalle
                  </button>

                  <button type="button" onClick={() => runAction("images", row)}>
                    Ver imágenes
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={!isActive}
                    onClick={() => runAction("cart", row)}
                  >
                    {isActive ? "Agregar al carrito" : "No disponible"}
                  </button>
                </div>
              </article>
            );
          })}

          {!loading && filteredRows.length === 0 && (
            <div className="consultation-empty-marketplace">
              <strong>No hay productos para mostrar</strong>
              <span>Prueba limpiando filtros o buscando otro repuesto.</span>
            </div>
          )}

          {loading && (
            <div className="consultation-empty-marketplace">
              <strong>Cargando catálogo...</strong>
              <span>Obteniendo repuestos desde Supabase.</span>
            </div>
          )}
        </div>
      </section>

      {toast && <div className="consultation-catalog-view-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="consultation-catalog-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="consultation-catalog-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <div className="consultation-detail-header">
              <div>
                <span className="consultation-catalog-view-eyebrow">
                  Detalle
                </span>

                <h3>{modal.row.repuesto}</h3>

                <p>
                  {modal.row.codigo} · {modal.row.marca} {modal.row.modelo}
                </p>
              </div>

              <strong className="consultation-detail-price">
                {formatPrice(modal.row)}
              </strong>
            </div>

            <div className="consultation-detail-content">
              <div className="consultation-detail-image-box">
                <img
                  src={getRowImages(modal.row)[0]}
                  alt={modal.row.repuesto}
                />
              </div>

              <div className="consultation-detail-grid">
                <article>
                  <span>Código</span>
                  <strong>{modal.row.codigo}</strong>
                </article>

                <article>
                  <span>Categoría</span>
                  <strong>{modal.row.categoria}</strong>
                </article>

                <article>
                  <span>Marca</span>
                  <strong>{modal.row.marca}</strong>
                </article>

                <article>
                  <span>Modelo</span>
                  <strong>{modal.row.modelo}</strong>
                </article>

                <article>
                  <span>Año</span>
                  <strong>{modal.row.anio}</strong>
                </article>

                <article>
                  <span>Proveedor</span>
                  <strong>{modal.row.proveedor}</strong>
                </article>

                <article>
                  <span>Región</span>
                  <strong>{modal.row.region || "Todas"}</strong>
                </article>

                <article>
                  <span>Rotación</span>
                  <strong>{modal.row.rotacion}</strong>
                </article>

                <article>
                  <span>Estado</span>
                  <strong>{modal.row.estado}</strong>
                </article>
              </div>
            </div>

            <div className="consultation-detail-actions">
              <button type="button" onClick={() => setModal(null)}>
                Cerrar
              </button>

              <button
                type="button"
                onClick={() =>
                  setModal({
                    type: "gallery",
                    row: modal.row,
                    images: getRowImages(modal.row),
                    index: 0
                  })
                }
              >
                Ver imágenes
              </button>

              <button
                type="button"
                className="primary"
                onClick={() => addToCart(modal.row)}
              >
                Agregar al carrito
              </button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "gallery" && (
        <div
          className="consultation-catalog-view-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="consultation-gallery-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="consultation-catalog-view-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <div className="consultation-gallery-header">
              <div>
                <span className="consultation-catalog-view-eyebrow">
                  Imágenes
                </span>

                <h3>{modal.row.repuesto}</h3>

                <p>
                  {modal.row.codigo} · {modal.row.marca} {modal.row.modelo}
                </p>
              </div>

              <small>
                {modal.index + 1} de {modal.images.length}
              </small>
            </div>

            <div className="consultation-gallery-viewer">
              <img src={modal.images[modal.index]} alt={modal.row.repuesto} />

              {modal.images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="consultation-gallery-arrow left"
                    onClick={() =>
                      setModal((prev) => ({
                        ...prev,
                        index:
                          (prev.index - 1 + prev.images.length) %
                          prev.images.length
                      }))
                    }
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="consultation-gallery-arrow right"
                    onClick={() =>
                      setModal((prev) => ({
                        ...prev,
                        index: (prev.index + 1) % prev.images.length
                      }))
                    }
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            <div className="consultation-gallery-thumbs">
              {modal.images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  className={modal.index === index ? "active" : ""}
                  onClick={() =>
                    setModal((prev) => ({
                      ...prev,
                      index
                    }))
                  }
                >
                  <img src={image} alt={`Imagen ${index + 1}`} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {modal?.type === "cart" && (
        <div className="consultation-cart-backdrop" onClick={() => setModal(null)}>
          <aside
            className="consultation-cart-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="consultation-cart-drawer-header">
              <span className="consultation-cart-eyebrow">Carrito</span>

              <h3>Resumen de compra</h3>

              <p>
                Revisa tus productos seleccionados antes de generar la orden de
                pago.
              </p>

              <button
                type="button"
                className="consultation-cart-close"
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </header>

            <div className="consultation-cart-drawer-content">
              {cart.length === 0 ? (
                <div className="consultation-cart-empty-state">
                  <div className="consultation-cart-empty-icon">🛒</div>
                  <strong>Tu carrito está vacío</strong>
                  <span>Agrega repuestos desde el marketplace.</span>
                  <button type="button" onClick={() => setModal(null)}>
                    Seguir comprando
                  </button>
                </div>
              ) : (
                cart.map((item) => {
                  const image = getRowImages(item)[0];

                  return (
                    <article
                      className="consultation-cart-drawer-item"
                      key={item.id}
                    >
                      <img src={image} alt={item.repuesto} />

                      <div className="consultation-cart-drawer-info">
                        <strong>{item.repuesto}</strong>
                        <span>
                          {item.codigo} · {item.marca} {item.modelo}
                        </span>
                        <small>{formatPrice(item)}</small>
                      </div>

                      <div className="consultation-cart-drawer-controls">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(
                              item.id,
                              Number(item.quantity || 1) - 1
                            )
                          }
                        >
                          −
                        </button>

                        <strong>{item.quantity}</strong>

                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(
                              item.id,
                              Number(item.quantity || 1) + 1
                            )
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="consultation-cart-drawer-remove"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Quitar
                      </button>
                    </article>
                  );
                })
              )}
            </div>

            <footer className="consultation-cart-drawer-footer">
              <div className="consultation-cart-total-box">
                <div>
                  <span>Total referencial</span>
                  <small>El pago se realizará mediante Mercado Pago.</small>
                </div>

                <strong>{formatMoney(cartTotal)}</strong>
              </div>

              <div className="consultation-cart-footer-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(null)}
                >
                  Seguir comprando
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Vaciar carrito
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={handlePayNow}
                  disabled={cart.length === 0 || creatingOrder}
                >
                  {creatingOrder ? "Generando orden..." : "Pagar ahora"}
                </button>
              </div>
            </footer>
          </aside>
        </div>
      )}

      {paymentScreen && (
        <div className="consultation-payment-screen">
          <section className="consultation-payment-card">
            <button
              type="button"
              className="consultation-payment-back"
              onClick={finishPaymentAndBack}
            >
              ←
            </button>

            <span className="consultation-payment-eyebrow">Método de pago</span>

            <h2>Finaliza tu compra</h2>

            <p>
              Tu orden <strong>{paymentScreen.order.order_number}</strong> fue
              generada correctamente. Puedes abrir el link de pago o volver con
              la flecha para confirmar la compra simulada.
            </p>

            <div className="consultation-payment-summary">
              <article>
                <span>Cliente</span>
                <strong>{paymentScreen.order.cliente_nombre}</strong>
              </article>

              <article>
                <span>Total</span>
                <strong>{formatMoney(paymentScreen.order.total)}</strong>
              </article>

              <article>
                <span>Método</span>
                <strong>Mercado Pago</strong>
              </article>
            </div>

            <div className="consultation-payment-products">
              {paymentScreen.items.map((item) => (
                <article key={`${item.product.id}-${item.product.codigo}`}>
                  <div>
                    <strong>{item.product.repuesto}</strong>
                    <span>
                      {item.product.codigo} · {item.product.marca}{" "}
                      {item.product.modelo}
                    </span>
                  </div>

                  <small>
                    {item.quantity} x {formatMoney(item.price)}
                  </small>
                </article>
              ))}
            </div>

            <div className="consultation-payment-actions">
              <a href={PAYMENT_LINK} target="_blank" rel="noreferrer">
                Abrir link de pago
              </a>

              <button type="button" onClick={finishPaymentAndBack}>
                Simular pago completado
              </button>
            </div>
          </section>
        </div>
      )}

      {successOrder && (
        <div
          className="consultation-order-success-backdrop"
          onClick={() => setSuccessOrder(null)}
        >
          <section
            className="consultation-order-success"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => setSuccessOrder(null)}>
              ×
            </button>

            <div className="consultation-order-success-icon">✓</div>

            <span>Compra registrada</span>

            <h3>¡Gracias por tu compra!</h3>

            <p>Tu número de orden de pago es:</p>

            <strong>{successOrder.order_number}</strong>

            <small>
              El administrador recibirá una notificación con el detalle de tu
              pedido.
            </small>

            <div>
              <button type="button" onClick={() => setSuccessOrder(null)}>
                Entendido
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}