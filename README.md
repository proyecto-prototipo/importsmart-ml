# ImportSmart ML PMV - Arquitectura modular por rol

Este proyecto es un prototipo PMV para **Importaciones Soonest Parts E.I.R.L.** construido con React + Vite. La estructura fue corregida para que cada rol tenga únicamente sus módulos correspondientes y para que cada módulo tenga su propio código y estilos dentro de su carpeta.

## Ejecutar

```bash
npm install
npm run dev
```

Luego abre la URL que muestre Vite, normalmente `http://localhost:5173`.

## Accesos demo

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@soonest.pe | admin123 |
| Analista comercial | analista@soonest.pe | demo123 |
| Gerente de importaciones | gerente@soonest.pe | demo123 |
| Usuario consulta | consulta@soonest.pe | demo123 |

## Qué cambió en esta versión

- Ya no existen pantallas que solo hacen `return <ModulePage />`.
- Cada módulo tiene su propio `index.jsx` con la interfaz completa.
- Cada módulo tiene su propio `styles.css`.
- Los estilos de pantalla no están concentrados en un CSS global.
- Los módulos son distintos por rol.
- Si un módulo se repite entre roles, cambia su intención y sus acciones.

## Estructura principal

```txt
src/features/admin/
src/features/analyst/
src/features/manager/
src/features/consultation/
```

Cada carpeta de módulo contiene:

```txt
index.jsx    # código completo de la pantalla
styles.css   # estilos propios del módulo
```
