import React from "react";
import { Box, Stack, Typography } from "@mui/material";

function ProfilePageStyle({
  eyebrow = "UW Connect",
  title,
  subtitle,
  actions,
  children,
  maxWidth = 1040,
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(93,108,92,0.08), transparent 28%), radial-gradient(circle at top right, rgba(214,223,226,0.45), transparent 22%), #FDFDF6",
        py: { xs: 3, md: 4.25 },
      }}
    >
      <Box
        sx={{
          maxWidth,
          mx: "auto",
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 3.5,
            px: { xs: 3, md: 4.25 },
            py: { xs: 3.5, md: 4.75 },
            mb: 3,
            background:
              "linear-gradient(135deg, rgba(93,108,92,1) 0%, rgba(23,41,43,1) 100%)",
            boxShadow: "0 24px 60px rgba(23,41,43,0.18)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.00) 100%)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: -80,
              right: -50,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.10)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -70,
              left: -30,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "rgba(244,238,229,0.10)",
              filter: "blur(18px)",
              pointerEvents: "none",
            }}
          />

          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-end" }}
            spacing={2.5}
            sx={{ position: "relative", zIndex: 1 }}
          >
            <Box>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 30,
                  px: 1.75,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "#FDFDF6",
                  fontSize: 13,
                  fontWeight: 700,
                  mb: 1.75,
                  backdropFilter: "blur(12px)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                {eyebrow}
              </Box>

              <Typography
                component="h1"
                sx={{
                  m: 0,
                  fontSize: { xs: "2.15rem", md: "2.7rem" },
                  lineHeight: 1.08,
                  letterSpacing: "-0.04em",
                  color: "#FDFDF6",
                  fontWeight: 750,
                }}
              >
                {title}
              </Typography>

              {subtitle ? (
                <Typography
                  sx={{
                    mt: 1.25,
                    maxWidth: 620,
                    color: "rgba(253,253,246,0.86)",
                    fontSize: 16,
                    fontWeight: 500,
                    lineHeight: 1.65,
                  }}
                >
                  {subtitle}
                </Typography>
              ) : null}
            </Box>

            {actions ? (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ width: { xs: "100%", md: "auto" } }}
              >
                {actions}
              </Stack>
            ) : null}
          </Stack>
        </Box>

        <Box
          sx={{
            border: "1px solid rgba(214,223,226,0.95)",
            borderRadius: 3.25,
            p: { xs: 2, md: 3.25 },
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 18px 45px rgba(23,41,43,0.07)",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export const profileActionButtonSx = {
  minHeight: 42,
  borderRadius: 999,
  px: 2.2,
  textTransform: "none",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export const profileCardSx = {
  borderRadius: 3,
  border: "1px solid rgba(214,223,226,0.95)",
  backgroundColor: "rgba(253,253,246,0.96)",
  boxShadow: "0 10px 24px rgba(23,41,43,0.06)",
};

export default ProfilePageStyle;
