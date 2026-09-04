const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Agent = require("../models/Agent.model");

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
};

const verifyToken = async (req, res, next) => {
    try {
        let accessToken = req.cookies.accessToken;
        if (!accessToken) {
            // Try to get token from Authorization header
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                accessToken = authHeader.substring(7, authHeader.length);
            }
        }
        if (!accessToken) {
            return res.status(401).json({ message: "Access token not found." });
        }
        
        const decodedAccessToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const userId = decodedAccessToken.id || decodedAccessToken.sub;
        if (!userId) {
            return res.status(401).json({ message: "Invalid token payload." });
        }

        const user = await User.findById(userId).select('-password'); 

        if (!user) {
            return res.status(401).json({ message: "User not found." });
        }
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired access token." });
    }
};


const verifyTokenOptional = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) return next(); // allow guest access

    const decodedAccessToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedAccessToken.id).select('-password');
    if (user) req.user = user;
  } catch (error) {
    console.warn("⚠️ Optional token verification failed or invalid. Proceeding as guest.");
  }
  next();
};

const verifyAgentToken = async (req, res, next) => {
  try {
    // 1) If agent already attached (via optional middleware), allow
    if (req.agent) return next();

    // 2) Try to authenticate agent directly via Authorization header
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Agent not authenticated." });
    }

    const agentAccessSecret =
      process.env.ACCESS_TOKEN_AGENT_SECRET ||
      process.env.ACCESS_TOKEN_SECRET ||
      process.env.JWT_SECRET;

    if (!agentAccessSecret) {
      return res.status(500).json({ message: "Agent access token secret missing." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, agentAccessSecret);
    } catch (e) {
      return res.status(401).json({ message: "Invalid agent token." });
    }

    // Prefer explicit agentId, fallback to id (backward compatible)
    const agentId = decoded.agentId || decoded.id;
    if (!agentId) {
      return res.status(401).json({ message: "Invalid agent token payload." });
    }

    const agent = await Agent.findById(agentId);
    if (!agent || agent.status.toLowerCase() !== "active") {
      return res.status(403).json({ message: "Agent access denied." });
    }

    req.agent = agent;
    next();
  } catch (error) {
    console.error("verifyAgentToken error:", error);
    return res.status(500).json({ message: "Server error during agent verification." });
  }
};

const verifyTokenOrAgent = async (req, res, next) => {
  try {
    const token =
      getBearerToken(req) ||
      req.cookies?.accessToken ||
      req.cookies?.accessTokenAgent;

    if (!token) {
      return res.status(401).json({ message: "No access token provided." });
    }

    /* ========== TRY AGENT TOKEN FIRST ========== */
    try {
      const agentSecret =
        process.env.ACCESS_TOKEN_AGENT_SECRET ||
        process.env.ACCESS_TOKEN_SECRET ||
        process.env.JWT_SECRET;

      const decodedAgent = jwt.verify(token, agentSecret);

      if (decodedAgent?.role === "Agent" && decodedAgent.agentId) {
        const agent = await Agent.findById(decodedAgent.agentId);
        if (!agent || agent.status !== "active") {
          return res.status(403).json({ message: "Agent access denied." });
        }

        req.agent = {
          _id: agent._id,
          userId: agent.userId, // 🔑 critical for ownership queries
          role: "Agent",
        };
        return next();
      }
    } catch (_) {
      // ignore and try user token
    }

    /* ========== TRY USER TOKEN ========== */
    try {
      const decodedUser = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );

      const userId = decodedUser.id || decodedUser.sub;
      if (!userId) {
        return res.status(401).json({ message: "Invalid user token payload." });
      }

      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found." });
      }

      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  } catch (error) {
    console.error("verifyTokenOrAgent error:", error);
    return res.status(500).json({ message: "Authentication failed." });
  }
};

// OPTIONAL Agent Token Verification (for logout, profile, soft-protected routes)
const verifyAgentTokenOptional = async (req, res, next) => {
  try {
    // 1) Try header first (incognito-safe)
    let token =
      getBearerToken(req) ||
      req.cookies.accessTokenAgent ||
      req.cookies.refreshTokenAgent;

    if (!token) return next();

    let decoded = null;

    const agentAccessSecret =
      process.env.ACCESS_TOKEN_AGENT_SECRET ||
      process.env.ACCESS_TOKEN_SECRET ||
      process.env.JWT_SECRET;

    try {
      decoded = jwt.verify(token, agentAccessSecret);
    } catch (e) {
      const agentRefreshSecret =
        process.env.REFRESH_TOKEN_AGENT_SECRET ||
        process.env.REFRESH_TOKEN_SECRET ||
        process.env.JWT_REFRESH_SECRET;

      try {
        decoded = jwt.verify(token, agentRefreshSecret);
      } catch (e2) {
        return next();
      }
    }

    // Prefer explicit agentId, fallback to id (backward compatible)
    const agentId = decoded?.agentId || decoded?.id;
    // Optional middleware must NOT attach req.agent.
    // Full agent attachment is handled ONLY by verifyAgentToken.
  } catch (err) {
    console.warn("⚠️ verifyAgentTokenOptional failed");
  }

  return next();
};

module.exports = {
  verifyToken,
  verifyTokenOptional,
  verifyAgentToken,
  verifyAgentTokenOptional,
  verifyTokenOrAgent
};