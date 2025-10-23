const argon2 = require("argon2");
const UsuarioModel = require("../models/usuario.model");
const { signAccessToken, signRefreshToken, rotateRefreshToken } = require("../services/auth.services");

const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "rtoken";

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd, // Secure sólo en HTTPS
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: parseMaxAge(process.env.REFRESH_TOKEN_TTL || "7d"),
  };
}

function parseMaxAge(ttl) {
  // muy simple: soporta m, h, d
  const match = String(ttl).match(/^(\d+)([mhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // 7d por defecto
  const n = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "m") return n * 60 * 1000;
  if (unit === "h") return n * 60 * 60 * 1000;
  if (unit === "d") return n * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

async function login(req, res) {
  try {
    const { usuarioLogin, contraseña } = req.body;
    const user = await UsuarioModel.findOne({ usuarioLogin });
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    const ok = await argon2.verify(user.contraseña, contraseña);
    if (!ok) return res.status(401).json({ msg: "Credenciales inválidas" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie(COOKIE_NAME, refreshToken, cookieOptions());

    return res.status(200).json({
      msg: "Inicio de sesión exitoso",
      token: accessToken,
      data: { usuario: { id: user._id, nombre: user.nombre, rol: user.rol } },
    });
  } catch (err) {
    return res.status(500).json({ msg: "Error al iniciar sesión", error: err.message });
  }
}

async function refresh(req, res) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ msg: "No hay refresh token" });

    const { accessToken, refreshToken, user } = await rotateRefreshToken(token);

    // Rotar cookie
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions());

    return res.status(200).json({
      msg: "Token renovado",
      token: accessToken,
      data: { usuario: { id: user._id, nombre: user.nombre, rol: user.rol } },
    });
  } catch (err) {
    return res.status(401).json({ msg: "Refresh inválido o expirado" });
  }
}

async function logout(req, res) {
  try {
    res.clearCookie(COOKIE_NAME, { path: "/api/auth/refresh" });
    return res.status(200).json({ msg: "Sesión cerrada" });
  } catch (err) {
    return res.status(500).json({ msg: "Error al cerrar sesión" });
  }
}

module.exports = { login, refresh, logout };
