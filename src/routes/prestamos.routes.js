const express = require("express");
const router = express.Router();

const {
  crearPrestamo,
  obtenerPrestamoPorId,
  obtenerTodosLosPrestamos,
  eliminarPrestamo,
  actualizarPrestamo,
  desactivarPrestamo,
  activarPrestamo,
} = require("../controllers/prestamos.controllers.js");
const auth = require("../middlewares/auth.js");

router.get("/", auth("admin", "cobrador"), obtenerTodosLosPrestamos);
router.post("/", auth("admin"), crearPrestamo);
router.get("/:id", auth("admin", "cobrador"), obtenerPrestamoPorId);
router.put("/:id", auth("admin"), actualizarPrestamo);
router.put("/:id/desactivar", auth("admin"), desactivarPrestamo);
router.put("/:id/activar", auth("admin"), activarPrestamo);
router.delete("/:id", auth("admin"), eliminarPrestamo);

module.exports = router;
