const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/datosLibres.controllers");
const auth = require("../middlewares/auth");


router.get("/", auth("admin", "cobrador"), ctrl.listar);
router.get("/:id", auth("admin", "cobrador"), ctrl.obtener);
router.post("/", auth("admin"), ctrl.crear);
router.put("/:id", auth("admin"), ctrl.actualizar);
router.delete("/:id", auth("admin"), ctrl.eliminar);

module.exports = router;
