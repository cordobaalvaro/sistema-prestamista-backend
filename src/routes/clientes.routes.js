const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.js");

const {
  crearCliente,
  obtenerClientes,
  obtenerClientePorId,
  obtenerClientePorDNI,
  actualizarCliente,
  eliminarCliente,
  obtenerResumenCliente,
} = require("../controllers/clientes.controllers.js");

router.post("/", auth("admin"), crearCliente);
router.get("/", auth("admin", "cobrador"), obtenerClientes);
router.get("/:id", auth("admin", "cobrador"), obtenerClientePorId);
router.get("/:id/resumen", auth("admin"), obtenerResumenCliente);
router.get("/dni/:dni", auth("admin"), obtenerClientePorDNI);
router.put("/:id", auth("admin"), actualizarCliente);
router.delete("/:id", auth("admin"), eliminarCliente);

module.exports = router;
