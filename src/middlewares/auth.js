const jwt = require("jsonwebtoken");

module.exports = (...rolesRuta) => (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const legacyToken = req.header("auth") || null;
    const token = bearerToken || legacyToken;

    if (!token) {
      return res.status(401).json({ msg: "Token no provisto" });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
    );
    // Permite formato: auth('admin','cobrador') o auth(['admin','cobrador'])
    const roles =
      rolesRuta.length === 1 && Array.isArray(rolesRuta[0])
        ? rolesRuta[0]
        : rolesRuta;
    if (roles.length && !roles.includes(payload.rolUsuario)) {
      return res
        .status(403)
        .json({ msg: "No estás autorizado para esta operación" });
    }

    req.idUsuario = payload.idUsuario;
    req.rolUsuario = payload.rolUsuario;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Token inválido o expirado" });
  }
};
