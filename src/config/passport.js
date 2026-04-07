// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Configures two authentication strategies:
// 1. JWT Strategy   → validates Bearer token on protected routes
// 2. Google Strategy → handles "Continue with Google" OAuth flow

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { prisma } from "./db.js";

// ─── STRATEGY 1: JWT ──────────────────────────────────────────
// This runs every time a protected route is hit with a Bearer token
// It decodes the token → finds the user in DB → attaches to req.user
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    },
    async (payload, done) => {
      try {
        // payload = { userId, email, role } decoded from the token
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            isVerified: true,
          },
        });

        if (!user || !user.isActive) return done(null, false);
        return done(null, user); // user is attached to req.user
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

// ─── STRATEGY 2: GOOGLE OAUTH ─────────────────────────────────
// This runs when user clicks "Continue with Google"
// Google sends back profile info → we create/find user in our DB
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        const avatar = profile.photos[0]?.value;

        // Check if user already exists (by googleId OR email)
        let user = await prisma.user.findFirst({
          where: { OR: [{ googleId }, { email }] },
        });

        if (user) {
          // User exists via email but hasn't used Google before → link accounts
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId, provider: "GOOGLE", isVerified: true },
            });
          }
        } else {
          // Brand new user → create account automatically
          user = await prisma.user.create({
            data: {
              name,
              email,
              googleId,
              avatar,
              provider: "GOOGLE",
              isVerified: true, // Google already verified the email
              role: "USER",
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

export default passport;
