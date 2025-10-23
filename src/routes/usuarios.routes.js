const express = require("express");
const {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario,
  loginUsuario,
  renovarToken,
} = require("../controllers/usuarios.controllers");
const auth = require("../middlewares/auth");
const router = express.Router();


router.post("/", auth("admin"), crearUsuario);
router.get("/", auth("admin"), obtenerUsuarios);
router.get("/:id", auth("admin"), obtenerUsuarioPorId);
router.put("/:id", auth("admin"), actualizarUsuario);
router.delete("/:id", auth("admin"), eliminarUsuario);
router.post("/login", loginUsuario);

module.exports = router;
