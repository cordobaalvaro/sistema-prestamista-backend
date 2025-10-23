const jwt = require("jsonwebtoken");
const UsuarioModel = require("../models/usuario.model");

const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_TTL || "10m";
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_TTL || "7d";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";

function signAccessToken(user) {
  return jwt.sign(
    { idUsuario: user._id.toString(), rolUsuario: user.rol },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      idUsuario: user._id.toString(),
      tokenVersion: user.tokenVersion || 0,
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

async function rotateRefreshToken(oldToken) {
  const payload = jwt.verify(oldToken, REFRESH_SECRET);
  const user = await UsuarioModel.findById(payload.idUsuario);
  if (!user) throw new Error("Usuario no encontrado");
  if ((user.tokenVersion || 0) !== payload.tokenVersion)
    throw new Error("Refresh token inválido");

  const newAccess = signAccessToken(user);
  const newRefresh = signRefreshToken(user);
  return { accessToken: newAccess, refreshToken: newRefresh, user };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  rotateRefreshToken,
};
