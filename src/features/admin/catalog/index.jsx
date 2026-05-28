import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/config/services/supabaseClient.js";
import { logAuditAction } from "../../../shared/config/services/auditService.js";
import "./styles.css";

const CATALOG_BUCKET = "part-images";
const MAX_IMAGES = 5;

const initialRows = [
  {
    id: 1,
    codigo: "SP-001",
    repuesto: "Kit embrague Hilux",
    categoria: "Transmisión",
    marca: "Toyota",
    modelo: "Hilux",
    anio: "2018-2023",
    region: "Lima",
    proveedor: "Nippon Auto",
    costo: "US$ 82",
    margen: "34%",
    rotacion: "Alta",
    estado: "Activo"
  },
  {
    id: 2,
    codigo: "SP-002",
    repuesto: "Pastillas freno Accent",
    categoria: "Frenos",
    marca: "Hyundai",
    modelo: "Accent",
    anio: "2015-2022",
    region: "Arequipa",
    proveedor: "Korea Parts",
    costo: "US$ 18",
    margen: "41%",
    rotacion: "Alta",
    estado: "Activo"
  },
  {
    id: 3,
    codigo: "SP-003",
    repuesto: "Filtro aceite Corolla",
    categoria: "Motor",
    marca: "Toyota",
    modelo: "Corolla",
    anio: "2016-2024",
    region: "Lambayeque",
    proveedor: "Pacific Supply",
    costo: "US$ 4.8",
    margen: "29%",
    rotacion: "Media",
    estado: "Activo"
  },
  {
    id: 4,
    codigo: "SP-004",
    repuesto: "Amortiguador delantero NP300",
    categoria: "Suspensión",
    marca: "Nissan",
    modelo: "NP300",
    anio: "2017-2023",
    region: "La Libertad",
    proveedor: "Andes Import",
    costo: "US$ 36",
    margen: "26%",
    rotacion: "Media",
    estado: "Activo"
  },
  {
    id: 5,
    codigo: "SP-005",
    repuesto: "Bomba de agua Spark",
    categoria: "Refrigeración",
    marca: "Chevrolet",
    modelo: "Spark",
    anio: "2014-2021",
    region: "Piura",
    proveedor: "Global Parts",
    costo: "US$ 21",
    margen: "22%",
    rotacion: "Baja",
    estado: "Observado"
  }
];

const columns = [
  { key: "codigo", label: "Código" },
  { key: "repuesto", label: "Repuesto" },
  { key: "categoria", label: "Categoría" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" },
  { key: "anio", label: "Año" },
  { key: "region", label: "Región" },
  { key: "proveedor", label: "Proveedor" },
  { key: "costo", label: "Costo" },
  { key: "margen", label: "Margen" },
  { key: "rotacion", label: "Rotación" },
  { key: "estado", label: "Estado" }
];

const filterFields = ["categoria", "region", "rotacion", "estado"];

const formFields = [
  "codigo",
  "repuesto",
  "categoria",
  "marca",
  "modelo",
  "anio",
  "region",
  "proveedor",
  "costo",
  "margen",
  "rotacion",
  "estado"
];

const fieldLabels = Object.fromEntries(
  columns.map((column) => [column.key, column.label])
);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatCurrency(value) {
  return `US$ ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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
    text.includes("normal") ||
    text.includes("confirmado") ||
    text.includes("atendido")
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
    (text.includes("alta") && text.includes("riesgo")) ||
    text.includes("alto") ||
    text.includes("no leido") ||
    text.includes("no leído") ||
    text.includes("sobrestock") ||
    text.includes("cancelado")
  ) {
    return "danger";
  }

  return "neutral";
}

function createPlaceholder(row, index = 0) {
  const colors = [
    ["#2563eb", "#0f172a"],
    ["#0d9488", "#042f2e"],
    ["#7c3aed", "#2e1065"],
    ["#ea580c", "#431407"],
    ["#475569", "#0f172a"]
  ];

  const [primary, dark] = colors[index % colors.length];
  const title = encodeURIComponent(row?.repuesto || "Repuesto");
  const code = encodeURIComponent(row?.codigo || "SP-000");
  const category = encodeURIComponent(row?.categoria || "Catálogo");

  return `data:image/svg+xml;utf8,
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="640" viewBox="0 0 900 640">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${primary}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="rgba(0,0,0,.28)"/>
      </filter>
    </defs>
    <rect width="900" height="640" rx="48" fill="url(#g)"/>
    <circle cx="760" cy="110" r="180" fill="rgba(255,255,255,.08)"/>
    <circle cx="120" cy="560" r="220" fill="rgba(255,255,255,.06)"/>
    <rect x="88" y="92" width="724" height="456" rx="38" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)"/>
    <g filter="url(#shadow)">
      <rect x="306" y="170" width="288" height="190" rx="34" fill="rgba(255,255,255,.92)"/>
      <rect x="342" y="212" width="216" height="36" rx="18" fill="${primary}" opacity=".85"/>
      <rect x="370" y="278" width="160" height="24" rx="12" fill="#cbd5e1"/>
      <rect x="396" y="318" width="108" height="18" rx="9" fill="#e2e8f0"/>
    </g>
    <text x="88" y="435" fill="white" font-family="Arial" font-size="36" font-weight="800">${title}</text>
    <text x="88" y="482" fill="rgba(255,255,255,.78)" font-family="Arial" font-size="24">${category}</text>
    <text x="88" y="525" fill="rgba(255,255,255,.72)" font-family="Arial" font-size="20">${code}</text>
  </svg>`.replace(/\n/g, "");
}

function imageSrc(image) {
  if (!image) return "";

  if (typeof image === "string") return image;

  return (
    image.previewUrl ||
    image.image_url ||
    image.url ||
    image.public_url ||
    image.publicUrl ||
    image.src ||
    ""
  );
}

function getRowImages(row) {
  if (Array.isArray(row?.images) && row.images.length > 0) {
    return row.images;
  }

  return [
    createPlaceholder(row, 0),
    createPlaceholder(row, 1),
    createPlaceholder(row, 2)
  ];
}

function createBlankRow() {
  const row = { id: null, images: [] };

  formFields.forEach((key) => {
    row[key] = "";
  });

  row.estado = "Activo";
  row.rotacion = "Media";
  row.costo = "";
  row.margen = "";

  return row;
}

export default function AdminCatalogPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState(() =>
    Object.fromEntries(filterFields.map((field) => [field, "Todos"]))
  );

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(createBlankRow());
  const [toast, setToast] = useState("");
  const [cardImageIndex, setCardImageIndex] = useState({});

  const [orders, setOrders] = useState([]);
  const [ordersModal, setOrdersModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    loadRows();
    loadMarketplaceOrders();
  }, []);

  async function loadRows() {
    setLoading(true);

    const { data: parts, error: partsError } = await supabase
      .from("admin_catalog_parts")
      .select("*")
      .order("id", { ascending: true });

    if (partsError) {
      console.error("Error cargando catálogo:", partsError);
      showToast("No se pudo cargar el catálogo desde Supabase");
      setRows(initialRows.map((row) => ({ ...row, images: [] })));
      setLoading(false);
      return;
    }

    const { data: images, error: imagesError } = await supabase
      .from("admin_catalog_part_images")
      .select("*")
      .order("orden", { ascending: true });

    if (imagesError) {
      console.error("Error cargando imágenes:", imagesError);
      showToast("No se pudieron cargar las imágenes");
      setRows((parts ?? []).map((part) => ({ ...part, images: [] })));
      setLoading(false);
      return;
    }

    const imagesByPart = (images ?? []).reduce((acc, image) => {
      if (!acc[image.part_id]) acc[image.part_id] = [];
      acc[image.part_id].push(image);
      return acc;
    }, {});

    const rowsWithImages = (parts ?? []).map((part) => ({
      ...part,
      images: imagesByPart[part.id] ?? []
    }));

    setRows(rowsWithImages);
    setLoading(false);
  }

  async function loadMarketplaceOrders() {
    setLoadingOrders(true);

    const { data: orderRows, error: ordersError } = await supabase
      .from("consultation_marketplace_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error cargando pedidos:", ordersError);
      showToast("No se pudieron cargar los pedidos del marketplace");
      setLoadingOrders(false);
      return [];
    }

    const orderIds = (orderRows ?? []).map((order) => order.id);

    let itemsByOrder = {};

    if (orderIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from("consultation_marketplace_order_items")
        .select("*")
        .in("order_id", orderIds);

      if (itemsError) {
        console.error("Error cargando detalle de pedidos:", itemsError);
      } else {
        itemsByOrder = (items ?? []).reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push(item);
          return acc;
        }, {});
      }
    }

    const mergedOrders = (orderRows ?? []).map((order) => ({
      ...order,
      items: itemsByOrder[order.id] ?? []
    }));

    setOrders(mergedOrders);

    if (!selectedOrder && mergedOrders.length > 0) {
      setSelectedOrder(mergedOrders[0]);
    }

    setLoadingOrders(false);

    return mergedOrders;
  }

  async function openOrdersModal() {
    const loadedOrders = await loadMarketplaceOrders();

    setSelectedOrder(loadedOrders[0] ?? null);
    setOrdersModal(true);

    const unreadIds = loadedOrders
      .filter((order) => !order.leido_admin)
      .map((order) => order.id);

    if (unreadIds.length > 0) {
      const { error } = await supabase
        .from("consultation_marketplace_orders")
        .update({
          leido_admin: true,
          updated_at: new Date().toISOString()
        })
        .in("id", unreadIds);

      if (error) {
        console.error("Error marcando pedidos como leídos:", error);
      } else {
        setOrders((prev) =>
          prev.map((order) =>
            unreadIds.includes(order.id)
              ? {
                  ...order,
                  leido_admin: true
                }
              : order
          )
        );
      }
    }

    await logAuditAction({
      accion: "Abrió pedidos del marketplace",
      modulo: "Catálogo maestro",
      detalle: "Consultó las órdenes generadas desde el rol de usuario consulta",
      metadata: {
        pedidos: loadedOrders.length,
        nuevos: unreadIds.length
      }
    });
  }

  async function updateOrderStatus(order, estado) {
    const { data, error } = await supabase
      .from("consultation_marketplace_orders")
      .update({
        estado,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando pedido:", error);
      showToast("No se pudo actualizar el pedido");
      return;
    }

    const updatedOrder = {
      ...data,
      items: order.items ?? []
    };

    setOrders((prev) =>
      prev.map((item) => (item.id === order.id ? updatedOrder : item))
    );

    setSelectedOrder(updatedOrder);

    await logAuditAction({
      accion: `Actualizó pedido ${order.order_number}`,
      modulo: "Catálogo maestro",
      detalle: `Cambió el estado del pedido ${order.order_number} a ${estado}`,
      metadata: {
        id: order.id,
        order_number: order.order_number,
        cliente: order.cliente_nombre,
        estado
      }
    });

    showToast(`Pedido marcado como ${estado.toLowerCase()}`);
  }

  const unreadOrders = useMemo(() => {
    return orders.filter((order) => !order.leido_admin).length;
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => {
      const state = normalize(order.estado);
      return state.includes("pend") || state.includes("confirmado");
    }).length;
  }, [orders]);

  const totalOrdersAmount = useMemo(() => {
    return orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [orders]);

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
          `${row.codigo ?? ""} ${row.repuesto ?? ""} ${row.categoria ?? ""} ${row.marca ?? ""} ${row.modelo ?? ""} ${row.anio ?? ""} ${row.region ?? ""} ${row.proveedor ?? ""} ${row.costo ?? ""} ${row.margen ?? ""} ${row.rotacion ?? ""} ${row.estado ?? ""}`
        ).includes(term);

      const matchesFilters = filterFields.every(
        (field) => filters[field] === "Todos" || row[field] === filters[field]
      );

      return matchesText && matchesFilters;
    });
  }, [rows, search, filters]);

  const activeCount = useMemo(() => {
    return rows.filter((row) => normalize(row.estado) === "activo").length;
  }, [rows]);

  const observedCount = useMemo(() => {
    return rows.filter((row) => normalize(row.estado).includes("observ")).length;
  }, [rows]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function openCreate() {
    setForm(createBlankRow());
    setModal({ type: "form", title: "Registrar repuesto", mode: "create" });
  }

  function openEdit(row) {
    setForm({
      ...row,
      images: getRowImages(row).map((image) =>
        typeof image === "string"
          ? {
              image_url: image,
              previewUrl: image,
              storage_path: ""
            }
          : image
      )
    });

    setModal({ type: "form", title: "Editar repuesto", mode: "edit" });
  }

  async function deleteStorageImages(images = []) {
    const storagePaths = images
      .map((image) => image?.storage_path)
      .filter(Boolean);

    if (storagePaths.length === 0) return;

    const { error } = await supabase.storage
      .from(CATALOG_BUCKET)
      .remove(storagePaths);

    if (error) {
      console.error("Error eliminando imágenes del storage:", error);
    }
  }

  async function replacePartImages(partId, images = []) {
    const { error: deleteRowsError } = await supabase
      .from("admin_catalog_part_images")
      .delete()
      .eq("part_id", partId);

    if (deleteRowsError) {
      console.error("Error limpiando imágenes anteriores:", deleteRowsError);
      throw deleteRowsError;
    }

    if (!images.length) return [];

    const recordsToInsert = [];

    for (const [index, image] of images.entries()) {
      if (image.file) {
        const extension = image.file.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${index}.${extension}`;
        const storagePath = `${partId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(CATALOG_BUCKET)
          .upload(storagePath, image.file, {
            cacheControl: "3600",
            upsert: true
          });

        if (uploadError) {
          console.error("Error subiendo imagen:", uploadError);
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(CATALOG_BUCKET)
          .getPublicUrl(storagePath);

        recordsToInsert.push({
          part_id: partId,
          image_url: publicUrlData.publicUrl,
          storage_path: storagePath,
          orden: index + 1,
          is_main: index === 0
        });
      } else {
        recordsToInsert.push({
          part_id: partId,
          image_url: image.image_url || image.previewUrl || image.url,
          storage_path: image.storage_path || "",
          orden: index + 1,
          is_main: index === 0
        });
      }
    }

    const { data, error } = await supabase
      .from("admin_catalog_part_images")
      .insert(recordsToInsert)
      .select()
      .order("orden", { ascending: true });

    if (error) {
      console.error("Error guardando imágenes en tabla:", error);
      throw error;
    }

    return data ?? [];
  }

  async function saveForm(event) {
    event.preventDefault();

    if (!form.codigo || !form.repuesto) {
      showToast("Completa código y nombre del repuesto");
      return;
    }

    if ((form.images ?? []).length > MAX_IMAGES) {
      showToast("Solo puedes guardar máximo 5 imágenes");
      return;
    }

    const payload = {
      codigo: form.codigo,
      repuesto: form.repuesto,
      categoria: form.categoria,
      marca: form.marca,
      modelo: form.modelo,
      anio: form.anio,
      region: form.region,
      proveedor: form.proveedor,
      costo: form.costo,
      margen: form.margen,
      rotacion: form.rotacion || "Media",
      estado: form.estado || "Activo"
    };

    try {
      if (modal?.mode === "create") {
        const { data: part, error } = await supabase
          .from("admin_catalog_parts")
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error("Error creando repuesto:", error);
          showToast("No se pudo crear el repuesto");
          return;
        }

        const savedImages = await replacePartImages(part.id, form.images ?? []);

        await logAuditAction({
          accion: `Creó repuesto ${payload.codigo}`,
          modulo: "Catálogo maestro",
          detalle: `Registró el repuesto ${payload.repuesto}`,
          metadata: {
            id: part.id,
            ...payload,
            imagenes: savedImages.length
          }
        });

        setRows((prev) => [{ ...part, images: savedImages }, ...prev]);
        showToast("Repuesto creado correctamente");
      } else {
        const { data: part, error } = await supabase
          .from("admin_catalog_parts")
          .update(payload)
          .eq("id", form.id)
          .select()
          .single();

        if (error) {
          console.error("Error editando repuesto:", error);
          showToast("No se pudieron guardar los cambios");
          return;
        }

        const savedImages = await replacePartImages(part.id, form.images ?? []);

        await logAuditAction({
          accion: `Editó repuesto ${payload.codigo}`,
          modulo: "Catálogo maestro",
          detalle: `Actualizó la información del repuesto ${payload.repuesto}`,
          metadata: {
            id: part.id,
            ...payload,
            imagenes: savedImages.length
          }
        });

        setRows((prev) =>
          prev.map((row) =>
            row.id === form.id ? { ...part, images: savedImages } : row
          )
        );

        showToast("Cambios guardados correctamente");
      }

      setModal(null);
    } catch (error) {
      console.error("Error guardando repuesto e imágenes:", error);
      showToast("Ocurrió un error guardando imágenes");
    }
  }

  async function updateRow(id, updates) {
    const { data, error } = await supabase
      .from("admin_catalog_parts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando repuesto:", error);
      showToast("No se pudo actualizar el repuesto");
      return null;
    }

    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...data } : row))
    );

    return data;
  }

  async function runAction(actionId, row) {
    if (actionId === "view") {
      setModal({ type: "detail", row });

      await logAuditAction({
        accion: `Vio detalle del repuesto ${row.codigo}`,
        modulo: "Catálogo maestro",
        detalle: `Consultó el detalle del repuesto ${row.repuesto}`,
        metadata: {
          id: row.id,
          codigo: row.codigo,
          repuesto: row.repuesto
        }
      });

      return;
    }

    if (actionId === "images") {
      setModal({
        type: "gallery",
        row,
        images: getRowImages(row),
        index: 0
      });

      await logAuditAction({
        accion: `Vio imágenes del repuesto ${row.codigo}`,
        modulo: "Catálogo maestro",
        detalle: `Abrió la galería de imágenes del repuesto ${row.repuesto}`,
        metadata: {
          id: row.id,
          codigo: row.codigo,
          repuesto: row.repuesto,
          imagenes: getRowImages(row).length
        }
      });

      return;
    }

    if (actionId === "edit") {
      openEdit(row);

      await logAuditAction({
        accion: `Abrió edición del repuesto ${row.codigo}`,
        modulo: "Catálogo maestro",
        detalle: `Abrió el formulario de edición del repuesto ${row.repuesto}`,
        metadata: {
          id: row.id,
          codigo: row.codigo,
          repuesto: row.repuesto
        }
      });

      return;
    }

    if (actionId === "delete") {
      const confirmDelete = window.confirm(
        `¿Seguro que deseas eliminar el repuesto "${row.repuesto}"?`
      );

      if (!confirmDelete) return;

      await deleteStorageImages(row.images ?? []);

      const { error } = await supabase
        .from("admin_catalog_parts")
        .delete()
        .eq("id", row.id);

      if (error) {
        console.error("Error eliminando repuesto:", error);
        showToast("No se pudo eliminar el repuesto");
        return;
      }

      await logAuditAction({
        accion: `Eliminó repuesto ${row.codigo}`,
        modulo: "Catálogo maestro",
        detalle: `Eliminó el repuesto ${row.repuesto}`,
        metadata: {
          id: row.id,
          codigo: row.codigo,
          repuesto: row.repuesto,
          categoria: row.categoria,
          marca: row.marca,
          modelo: row.modelo,
          imagenes: Array.isArray(row.images) ? row.images.length : 0
        }
      });

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast("Repuesto eliminado");
      return;
    }

    if (actionId === "toggle") {
      const estadoAnterior = row.estado;
      const estadoNuevo = row.estado === "Activo" ? "Inactivo" : "Activo";

      await updateRow(row.id, {
        estado: estadoNuevo
      });

      await logAuditAction({
        accion: `${
          estadoNuevo === "Activo" ? "Activó" : "Inactivó"
        } repuesto ${row.codigo}`,
        modulo: "Catálogo maestro",
        detalle: `Cambió el estado del repuesto ${row.repuesto} de ${estadoAnterior} a ${estadoNuevo}`,
        metadata: {
          id: row.id,
          codigo: row.codigo,
          repuesto: row.repuesto,
          estadoAnterior,
          estadoNuevo
        }
      });

      showToast("Estado actualizado");
      return;
    }

    if (actionId === "download") {
      downloadCsv("admin-catalog.csv", [row]);

      await logAuditAction({
        accion: `Descargó repuesto ${row.codigo}`,
        modulo: "Catálogo maestro",
        detalle: `Exportó en CSV el repuesto ${row.repuesto}`,
        metadata: {
          id: row.id,
          codigo: row.codigo,
          repuesto: row.repuesto
        }
      });

      showToast("Archivo CSV descargado");
      return;
    }

    showToast("Acción ejecutada correctamente");
  }

  function handleImages(event) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) return;

    setForm((prev) => {
      const currentImages = Array.isArray(prev.images) ? prev.images : [];
      const availableSlots = MAX_IMAGES - currentImages.length;

      if (availableSlots <= 0) {
        showToast("Solo puedes subir hasta 5 imágenes");
        return prev;
      }

      const selectedFiles = files.slice(0, availableSlots);

      if (files.length > availableSlots) {
        showToast(`Se agregaron ${availableSlots} imágenes. Máximo permitido: 5`);
      }

      const newImages = selectedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name
      }));

      return {
        ...prev,
        images: [...currentImages, ...newImages]
      };
    });

    event.target.value = "";
  }

  function removeFormImage(index) {
    setForm((prev) => {
      const currentImages = Array.isArray(prev.images) ? prev.images : [];
      const imageToRemove = currentImages[index];

      if (
        imageToRemove?.previewUrl &&
        String(imageToRemove.previewUrl).startsWith("blob:")
      ) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return {
        ...prev,
        images: currentImages.filter((_, itemIndex) => itemIndex !== index)
      };
    });
  }

  function moveCardImage(rowId, totalImages, direction) {
    setCardImageIndex((prev) => {
      const current = prev[rowId] ?? 0;
      const next = (current + direction + totalImages) % totalImages;

      return {
        ...prev,
        [rowId]: next
      };
    });
  }

  return (
    <main className="admin-catalog-page">
      <section className="admin-catalog-hero">
        <div>
          <span className="admin-catalog-eyebrow">Administrador</span>
          <h2>Bienvenid@ 🤗</h2>
          <p>
            Aquí podrás administrar el catálogo maestro de repuestos, publicar
            productos para el marketplace y revisar los pedidos generados por los
            usuarios consulta.
          </p>

          {unreadOrders > 0 && (
            <div className="admin-catalog-order-alert">
              <span>🔔</span>
              <div>
                <strong>
                  {unreadOrders === 1
                    ? "Tienes 1 nuevo pedido"
                    : `Tienes ${unreadOrders} nuevos pedidos`}
                </strong>
                <small>
                  Un cliente realizó una compra desde el marketplace. Revisa el
                  detalle en Ver pedidos.
                </small>
              </div>
            </div>
          )}
        </div>

        <div className="admin-catalog-hero-actions">
          <button onClick={openCreate}>Registrar repuesto</button>

          <button
            className="admin-catalog-orders-button"
            onClick={openOrdersModal}
          >
            🔔 Ver pedidos
            {unreadOrders > 0 && <span>{unreadOrders}</span>}
          </button>

          <button onClick={() => downloadCsv("admin-catalog.csv", filteredRows)}>
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="admin-catalog-toolbar">
        <label className="admin-catalog-search">
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, repuesto, marca, modelo, proveedor..."
          />
        </label>

        {filterFields.map((field) => (
          <label key={field}>
            {fieldLabels[field] ?? field}
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

      <section className="admin-catalog-summary">
        <article>
          <strong>{rows.length}</strong>
          <span>repuestos registrados</span>
        </article>

        <article>
          <strong>{activeCount}</strong>
          <span>publicados activos</span>
        </article>

        <article>
          <strong>{observedCount}</strong>
          <span>observados</span>
        </article>

        <article>
          <strong>{orders.length}</strong>
          <span>pedidos marketplace</span>
        </article>
      </section>

      <section className="admin-catalog-marketplace">
        <div className="admin-catalog-section-head">
          <div>
            <span>Vista operativa</span>
            <h3>Catálogo maestro</h3>
          </div>

          <small>{loading ? "Cargando..." : `${filteredRows.length} resultados`}</small>
        </div>

        <div className="admin-catalog-grid">
          {filteredRows.map((row) => {
            const images = getRowImages(row);
            const currentImageIndex = cardImageIndex[row.id] ?? 0;
            const currentImage = images[currentImageIndex];

            return (
              <article className="catalog-card" key={row.id}>
                <div className="catalog-card-image">
                  <img src={imageSrc(currentImage)} alt={row.repuesto} />

                  <div className="catalog-card-top">
                    <span className="admin-catalog-badge success">
                      {row.estado}
                    </span>

                    <span className="catalog-image-count">
                      {currentImageIndex + 1}/{images.length}
                    </span>
                  </div>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="catalog-image-nav prev"
                        onClick={() => moveCardImage(row.id, images.length, -1)}
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        className="catalog-image-nav next"
                        onClick={() => moveCardImage(row.id, images.length, 1)}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                <div className="catalog-card-body">
                  <div className="catalog-card-title">
                    <div>
                      <span>{row.codigo}</span>
                      <h3>{row.repuesto}</h3>
                    </div>

                    <strong>{row.costo}</strong>
                  </div>

                  <div className="catalog-card-tags">
                    <span>{row.categoria}</span>
                    <span>{row.marca}</span>
                    <span>{row.modelo}</span>
                    <span>{row.anio}</span>
                  </div>

                  <div className="catalog-card-specs">
                    <article>
                      <span>Región</span>
                      <strong>{row.region}</strong>
                    </article>

                    <article>
                      <span>Margen</span>
                      <strong>{row.margen}</strong>
                    </article>

                    <article>
                      <span>Rotación</span>
                      <strong>
                        <em
                          className={`admin-catalog-badge ${badgeClass(
                            row.rotacion
                          )}`}
                        >
                          {row.rotacion}
                        </em>
                      </strong>
                    </article>

                    <article>
                      <span>Estado</span>
                      <strong>
                        <em
                          className={`admin-catalog-badge ${badgeClass(
                            row.estado
                          )}`}
                        >
                          {row.estado}
                        </em>
                      </strong>
                    </article>
                  </div>

                  <div className="catalog-provider">
                    <span>Proveedor</span>
                    <strong>{row.proveedor}</strong>
                  </div>
                </div>

                <div className="catalog-card-actions">
                  <button onClick={() => runAction("view", row)}>
                    Ver detalle
                  </button>

                  <button onClick={() => runAction("images", row)}>
                    Ver imágenes
                  </button>

                  <button onClick={() => runAction("edit", row)}>Editar</button>

                  <button onClick={() => runAction("toggle", row)}>
                    {row.estado === "Activo" ? "Inactivar" : "Activar"}
                  </button>

                  <button onClick={() => runAction("download", row)}>
                    Descargar
                  </button>

                  <button
                    className="danger"
                    onClick={() => runAction("delete", row)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}

          {!loading && filteredRows.length === 0 && (
            <div className="admin-catalog-empty-card">
              <strong>No hay resultados</strong>
              <span>No se encontraron repuestos con los filtros seleccionados.</span>
            </div>
          )}

          {loading && (
            <div className="admin-catalog-empty-card">
              <strong>Cargando catálogo...</strong>
              <span>Obteniendo repuestos desde Supabase.</span>
            </div>
          )}
        </div>
      </section>

      {toast && <div className="admin-catalog-toast">{toast}</div>}

      {modal?.type === "detail" && (
        <div
          className="admin-catalog-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-catalog-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="admin-catalog-close" onClick={() => setModal(null)}>
              ×
            </button>

            <span className="admin-catalog-eyebrow">Detalle</span>
            <h3>{modal.row.repuesto}</h3>

            <div className="admin-catalog-detail-grid">
              {columns.map((column) => (
                <article key={column.key}>
                  <span>{column.label}</span>
                  <strong>{modal.row[column.key]}</strong>
                </article>
              ))}
            </div>

            <div className="admin-catalog-modal-actions">
              <button onClick={() => setModal(null)}>Cerrar</button>
              <button onClick={() => openEdit(modal.row)}>Editar</button>
            </div>
          </section>
        </div>
      )}

      {modal?.type === "gallery" && (
        <div
          className="admin-catalog-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <section
            className="admin-catalog-gallery-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="admin-catalog-close" onClick={() => setModal(null)}>
              ×
            </button>

            <div className="gallery-header">
              <div>
                <span className="admin-catalog-eyebrow">Galería</span>
                <h3>{modal.row.repuesto}</h3>
                <p>
                  {modal.row.codigo} · {modal.row.marca} {modal.row.modelo}
                </p>
              </div>

              <small>
                {modal.index + 1} de {modal.images.length}
              </small>
            </div>

            <div className="gallery-viewer">
              <img
                src={imageSrc(modal.images[modal.index])}
                alt={modal.row.repuesto}
              />

              {modal.images.length > 1 && (
                <>
                  <button
                    className="gallery-arrow left"
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
                    className="gallery-arrow right"
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

            <div className="gallery-thumbs">
              {modal.images.map((image, index) => (
                <button
                  key={`${imageSrc(image)}-${index}`}
                  className={modal.index === index ? "active" : ""}
                  onClick={() =>
                    setModal((prev) => ({
                      ...prev,
                      index
                    }))
                  }
                >
                  <img src={imageSrc(image)} alt={`Imagen ${index + 1}`} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {modal?.type === "form" && (
        <div
          className="admin-catalog-modal-backdrop"
          onClick={() => setModal(null)}
        >
          <form
            className="admin-catalog-modal admin-catalog-form"
            onSubmit={saveForm}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-catalog-close"
              onClick={() => setModal(null)}
            >
              ×
            </button>

            <span className="admin-catalog-eyebrow">Formulario</span>
            <h3>{modal.title}</h3>

            <div className="admin-catalog-upload-box">
              <div>
                <strong>Imágenes del repuesto</strong>
                <span>Puedes subir hasta 5 imágenes por producto.</span>
              </div>

              <label className="upload-button">
                Cargar imágenes
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImages}
                />
              </label>
            </div>

            <div className="admin-catalog-image-preview-list">
              {(form.images ?? []).length === 0 && (
                <div className="no-images-message">
                  Todavía no agregaste imágenes para este repuesto.
                </div>
              )}

              {(form.images ?? []).map((image, index) => (
                <article key={`${imageSrc(image)}-${index}`}>
                  <img src={imageSrc(image)} alt={`Imagen ${index + 1}`} />

                  <button type="button" onClick={() => removeFormImage(index)}>
                    ×
                  </button>
                </article>
              ))}
            </div>

            <small className="upload-limit">
              {(form.images ?? []).length}/{MAX_IMAGES} imágenes seleccionadas
            </small>

            <div className="admin-catalog-form-grid">
              {formFields.map((field) => (
                <label key={field}>
                  {fieldLabels[field] ?? field}

                  {field === "rotacion" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Alta</option>
                      <option>Media</option>
                      <option>Baja</option>
                    </select>
                  ) : field === "estado" ? (
                    <select
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                    >
                      <option>Activo</option>
                      <option>Inactivo</option>
                      <option>Observado</option>
                    </select>
                  ) : (
                    <input
                      value={form[field] ?? ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: event.target.value
                        }))
                      }
                      placeholder={fieldLabels[field] ?? field}
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="admin-catalog-modal-actions">
              <button type="button" onClick={() => setModal(null)}>
                Cancelar
              </button>

              <button type="submit">Guardar repuesto</button>
            </div>
          </form>
        </div>
      )}

      {ordersModal && (
        <div
          className="admin-catalog-orders-backdrop"
          onClick={() => setOrdersModal(false)}
        >
          <section
            className="admin-catalog-orders-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-catalog-orders-close"
              onClick={() => setOrdersModal(false)}
            >
              ×
            </button>

            <div className="admin-catalog-orders-header">
              <div>
                <span className="admin-catalog-orders-eyebrow">
                  Pedidos recibidos
                </span>

                <h3>Compras del marketplace</h3>

                <p>
                  Aquí verás las compras generadas desde el rol de usuario
                  consulta, con su número de orden, cliente y productos
                  solicitados.
                </p>
              </div>

              <div className="admin-catalog-orders-kpis">
                <article>
                  <span>Pedidos</span>
                  <strong>{orders.length}</strong>
                </article>

                <article>
                  <span>Pendientes</span>
                  <strong>{pendingOrders}</strong>
                </article>

                <article>
                  <span>Total</span>
                  <strong>{formatCurrency(totalOrdersAmount)}</strong>
                </article>
              </div>
            </div>

            <div className="admin-catalog-orders-layout">
              <div className="admin-catalog-orders-list">
                {loadingOrders && (
                  <article className="admin-catalog-orders-empty">
                    Cargando pedidos...
                  </article>
                )}

                {!loadingOrders && orders.length === 0 && (
                  <article className="admin-catalog-orders-empty">
                    No hay pedidos registrados todavía.
                  </article>
                )}

                {!loadingOrders &&
                  orders.map((order) => (
                    <button
                      key={order.id}
                      className={
                        selectedOrder?.id === order.id
                          ? "admin-catalog-order-card active"
                          : "admin-catalog-order-card"
                      }
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div>
                        <strong>{order.order_number}</strong>
                        <span>{order.cliente_nombre}</span>
                        <small>{formatDateTime(order.created_at)}</small>
                      </div>

                      <em
                        className={`admin-catalog-badge ${badgeClass(
                          order.estado
                        )}`}
                      >
                        {order.estado}
                      </em>

                      <b>{formatCurrency(order.total)}</b>
                    </button>
                  ))}
              </div>

              <div className="admin-catalog-order-detail">
                {!selectedOrder && (
                  <div className="admin-catalog-order-placeholder">
                    <strong>Selecciona un pedido</strong>
                    <span>
                      Al hacer clic en una orden verás el detalle de productos
                      comprados por el cliente.
                    </span>
                  </div>
                )}

                {selectedOrder && (
                  <>
                    <div className="admin-catalog-order-detail-head">
                      <div>
                        <span>Orden de pago</span>
                        <h4>{selectedOrder.order_number}</h4>
                        <p>
                          {selectedOrder.cliente_nombre} ·{" "}
                          {selectedOrder.cliente_correo || "Sin correo"}
                        </p>
                      </div>

                      <strong>{formatCurrency(selectedOrder.total)}</strong>
                    </div>

                    <div className="admin-catalog-order-status">
                      <article>
                        <span>Estado</span>
                        <strong>{selectedOrder.estado}</strong>
                      </article>

                      <article>
                        <span>Método</span>
                        <strong>
                          {selectedOrder.metodo_pago || "Mercado Pago"}
                        </strong>
                      </article>

                      <article>
                        <span>Fecha</span>
                        <strong>{formatDateTime(selectedOrder.created_at)}</strong>
                      </article>

                      <article className="wide">
                        <span>Mensaje</span>
                        <strong>
                          {selectedOrder.mensaje ||
                            "Compra generada desde el marketplace."}
                        </strong>
                      </article>
                    </div>

                    <div className="admin-catalog-order-items-head">
                      <span>Productos comprados</span>
                      <strong>{selectedOrder.items?.length ?? 0} items</strong>
                    </div>

                    <div className="admin-catalog-order-items">
                      {(selectedOrder.items ?? []).map((item) => (
                        <article key={item.id}>
                          <div>
                            <strong>{item.repuesto}</strong>
                            <span>
                              {item.codigo} · {item.marca} {item.modelo}
                            </span>
                            <small>
                              {item.categoria} · {item.region || "Sin región"}
                            </small>
                          </div>

                          <b>
                            {item.cantidad} x{" "}
                            {formatCurrency(item.precio_unitario)}
                          </b>

                          <em>{formatCurrency(item.subtotal)}</em>
                        </article>
                      ))}

                      {(selectedOrder.items ?? []).length === 0 && (
                        <div className="admin-catalog-orders-empty">
                          Este pedido no tiene productos registrados.
                        </div>
                      )}
                    </div>

                    <div className="admin-catalog-order-actions">
                      <button
                        type="button"
                        onClick={() =>
                          updateOrderStatus(selectedOrder, "Pendiente")
                        }
                      >
                        Dejar pendiente
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateOrderStatus(selectedOrder, "Atendido")
                        }
                      >
                        Marcar atendido
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}