const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

const clientesRoutes = require("./clientes.routes.js");
const prestamosRoutes = require("./prestamos.routes.js");
const usuariosRoutes = require("./usuarios.routes.js");
const zonaRoutes = require("./zona.routes.js");
const cobradoresRoutes = require("./cobradores.routes.js");
const adminRoutes = require("./admin.routes.js");
const documentosClientesRoutes = require("./documentosClientes.routes.js");
const datosLibresRoutes = require("./datosLibres.routes.js");
const notificacionesRoutes = require("./notificaciones.routes.js");
const authRoutes = require("./auth.routes.js");

router.use("/datos-libres", datosLibresRoutes);
router.use("/notificaciones", notificacionesRoutes);
router.use("/auth", authRoutes);

router.use("/documentos-clientes", documentosClientesRoutes);
router.use("/clientes", clientesRoutes);
router.use("/prestamos", prestamosRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/zonas", zonaRoutes);
router.use("/cobradores", cobradoresRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
