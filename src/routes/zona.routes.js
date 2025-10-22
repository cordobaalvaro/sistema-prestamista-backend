const express = require("express");
const {
  crearZona,
  obtenerZonas,
  obtenerZonaPorId,
  actualizarZona,
  eliminarZona,
  agregarClienteAZona,
  eliminarClienteDeZona,
  moverClienteDeZona,
  añadirCobrador,
  eliminarCobrador,
} = require("../controllers/zona.controllers");
const auth = require("../middlewares/auth");
const router = express.Router();

router.post("/", auth("admin"), crearZona);
router.get("/", auth("admin"), obtenerZonas);
router.get("/:id", auth("admin"), obtenerZonaPorId);
router.put("/:id", auth("admin"), actualizarZona);
router.delete("/eliminar-zona/:id", auth("admin"), eliminarZona);
router.post("/:idZona/clientes/:idCliente", auth("admin"), agregarClienteAZona);
router.delete(
  "/eliminar-cliente/:idZona/clientes/:idCliente",
  auth("admin"),
  eliminarClienteDeZona
);
router.post("/mover-cliente", auth("admin"), moverClienteDeZona);
router.post("/:zonaId/cobrador", auth("admin"), añadirCobrador);
router.delete("/:zonaId/cobrador/:cobradorId", auth("admin"), eliminarCobrador);

module.exports = router;
