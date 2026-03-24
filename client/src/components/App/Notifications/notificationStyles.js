const notificationStyles = {
  pageBackground: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(93,108,92,0.08), transparent 28%), radial-gradient(circle at top right, rgba(214,223,226,0.45), transparent 22%), #FDFDF6",
    padding: "34px 0 56px",
  },
  pageWrapper: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "0 24px",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    padding: "38px 34px",
    marginBottom: 24,
    background: "linear-gradient(135deg, rgba(93,108,92,1) 0%, rgba(23,41,43,1) 100%)",
    boxShadow: "0 24px 60px rgba(23,41,43,0.18)",
  },
  heroTitle: {
    margin: 0,
    fontSize: "2.5rem",
    letterSpacing: "-0.04em",
    color: "#FDFDF6",
    fontWeight: 750,
  },
  heroSubtitle: {
    margin: "8px 0 0",
    color: "rgba(253,253,246,0.86)",
    fontSize: 16,
    fontWeight: 500,
  },
  panel: {
    border: "1px solid rgba(214,223,226,0.95)",
    borderRadius: 26,
    padding: 26,
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 18px 45px rgba(23,41,43,0.07)",
  },
  notificationCard: {
    border: "1px solid #e6e6e6",
    borderRadius: 18,
    padding: "16px 20px",
    background: "#FDFDF6",
    transition: "all 0.25s ease",
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
    cursor: "pointer",
  },
  unreadCard: {
    background: "rgba(93,108,92,0.04)",
    borderColor: "rgba(93,108,92,0.2)",
    borderLeft: "5px solid #5D6C5C", // Sage green accent for unread
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(23,41,43,0.05)",
  },
  messageText: {
    fontSize: 15,
    color: "#17292B",
    lineHeight: 1.4,
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#686967",
    fontWeight: 600,
  },
  actionBtn: {
    height: 40,
    borderRadius: 999,
    border: "none",
    background: "#17292B",
    color: "#FDFDF6",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 20px",
    boxShadow: "0 8px 18px rgba(23,41,43,0.15)",
    transition: "all 0.2s ease",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 0",
    color: "#686967",
    border: "1px dashed #D6DFE2",
    borderRadius: 20,
  }
};

export default notificationStyles;