import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ token, req }) {
      const { pathname } = req.nextUrl;

      // Protect dashboard and employer API routes
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/api/employer")
      ) {
        return !!token && token.role === "EMPLOYER";
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/employer/:path*"],
};
