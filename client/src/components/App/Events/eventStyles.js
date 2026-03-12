const eventStyles = {
  pageWrapper: {
    maxWidth: 900,
    margin: "40px auto",
    padding: "0 20px",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  panel: {
    border: "1px solid #ddd",
    borderRadius: 16,
    padding: 20,
    background: "white",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  },

  panelTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  panelTitle: {
    fontWeight: "bold",
    marginBottom: 12,
    fontSize: 16,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },

  primaryBtn: {
    height: 38,
    borderRadius: 10,
    border: "none",
    background: "black",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 14px",
  },

  secondarySmallBtn: {
    height: 38,
    borderRadius: 10,
    border: "1px solid #bbb",
    background: "white",
    color: "#111",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 14px",
  },

  toggleBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #bbb",
    background: "white",
    color: "#111",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 12px",
    whiteSpace: "nowrap",
  },

  errorText: {
    color: "red",
    marginBottom: 10,
  },

  card: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 14,
    background: "white",
    boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
  },

  cardPast: {
    opacity: 0.75,
    background: "#fafafa",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },

  metaBlock: {
    display: "grid",
    gap: 6,
  },

  metaLine: {
    display: "flex",
    gap: 10,
  },

  metaLabel: {
    width: 70,
    fontSize: 12,
    color: "#666",
    fontWeight: "bold",
  },

  metaValue: {
    fontSize: 13,
    color: "#222",
  },

  rightBox: {
    minWidth: 90,
    textAlign: "right",
  },

  capacity: {
    fontSize: 18,
    fontWeight: "bold",
  },

  capacityHint: {
    fontSize: 12,
    color: "#666",
  },

  desc: {
    marginTop: 12,
    color: "#222",
  },

  actions: {
    marginTop: 14,
    display: "flex",
    gap: 10,
  },

  joinBtn: {
    height: 36,
    borderRadius: 10,
    border: "none",
    background: "black",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 12px",
  },

  joinBtnDisabled: {
    background: "#999",
    cursor: "not-allowed",
  },

  detailsBtn: {
    height: 36,
    borderRadius: 10,
    border: "1px solid #bbb",
    background: "white",
    color: "#111",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 12px",
  },

  dropdown: {
    overflow: "hidden",
    transition: "max-height 200ms ease, opacity 200ms ease",
  },

  dropdownClosed: {
    maxHeight: 0,
    opacity: 0,
  },

  dropdownOpen: {
    maxHeight: 300,
    opacity: 1,
    marginTop: 12,
    borderTop: "1px solid #eee",
    paddingTop: 12,
  },

  detailsTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },

  list: {
    margin: 0,
    paddingLeft: 18,
  },

  listItem: {
    marginBottom: 6,
  },
};

export default eventStyles;