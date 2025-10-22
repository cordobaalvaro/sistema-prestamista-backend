const jwt = require("jsonwebtoken");

module.exports = (...rolesRuta) => (req, res, next) => {
  const token = req.header("auth");
  const verificarToken = jwt.verify(token, process.env.JWT_SECRET);

  if (rolesRuta.includes(verificarToken.rolUsuario)) {
    req.idUsuario = verificarToken.idUsuario;
    next();
  } else {
    res.status(401).json("No estas autorizado para recibir esta informacion");
  }
};
