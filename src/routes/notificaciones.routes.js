const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificaciones.controllers");

router.get("/", ctrl.listar);
router.post("/", ctrl.crear);
router.patch("/:id/leida", ctrl.marcar);
router.patch("/leidas/todas", ctrl.marcarTodas);

module.exports = router;
