const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.js");

const {
  procesarCobro,
  editarRegistroCobro,
  eliminarRegistroCobro,
  crearRegistroCobro,
  obtenerTablas,
  editarTabla,
  editarItemTabla,
  eliminarItemTabla,
  eliminarTabla,
  agregarItemTabla,
  marcarComoVistoTabla,
} = require("../controllers/admin.controllers.js");

router.post("/procesar-cobro", auth("admin"), procesarCobro);
router.put(
  "/prestamos/:prestamoId/registros/:registroId",
  auth("admin"),
  editarRegistroCobro
);
router.delete(
  "/prestamos/:prestamoId/registros/:registroId",
  auth("admin"),
  eliminarRegistroCobro
);
router.post(
  "/prestamos/:prestamoId/crear-registro",
  auth("admin"),
  crearRegistroCobro
);
router.get("/tablas-enviadas", auth("admin"), obtenerTablas);
router.put("/tabla/:tablaId", auth("admin"), editarTabla);
router.put("/tabla/:tablaId/item/:itemId", auth("admin"), editarItemTabla);
router.post("/tabla/:tablaId/agregar-item", auth("admin"), agregarItemTabla);
router.delete("/tabla/:tablaId/item/:itemId", auth("admin"), eliminarItemTabla);
router.delete("/tabla/:tablaId", auth("admin"), eliminarTabla);
router.put("/tablas/:id/visto", auth("admin"), marcarComoVistoTabla);

module.exports = router;
