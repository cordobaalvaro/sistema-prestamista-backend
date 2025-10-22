const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.js");

const {
  obtenerMisZonas,
  crearTabla,
  agregarItemTabla,
  obtenerTablas,
  editarTabla,
  editarItemTabla,
  eliminarItemTabla,
  eliminarTabla,
  enviarTabla,
  obtenerTablaPorID,
  cargaMasiva,
} = require("../controllers/cobradores.controllers.js");

router.get("/mis-zonas", auth("cobrador"), obtenerMisZonas);

router.post("/crear-tabla", auth("cobrador"), crearTabla);

router.post("/tabla/:tablaId/agregar-item", auth("cobrador"), agregarItemTabla);

router.get("/mis-tablas", auth("cobrador"), obtenerTablas);
router.get("/tabla/:tablaId", auth(["cobrador", "admin"]), obtenerTablaPorID);

router.put("/tabla/:tablaId/editar", auth("cobrador"), editarTabla);

router.put(
  "/tabla/:tablaId/item/:itemId/editar",
  auth("cobrador"),
  editarItemTabla
);

router.delete(
  "/tabla/:tablaId/item/:itemId",
  auth("cobrador"),
  eliminarItemTabla
);

router.delete("/tabla/:tablaId", auth("cobrador"), eliminarTabla);

router.put("/tabla/:tablaId/enviar", auth("cobrador"), enviarTabla);
router.post("/tabla/:tablaId/carga-masiva", auth("cobrador"), cargaMasiva);

module.exports = router;
