const eventStyles = {
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
    background:
      "linear-gradient(135deg, rgba(93,108,92,1) 0%, rgba(23,41,43,1) 100%)",
    boxShadow: "0 24px 60px rgba(23,41,43,0.18)",
  },

  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.00) 100%)",
    pointerEvents: "none",
  },

  heroGlowOne: {
    position: "absolute",
    top: -80,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.10)",
    filter: "blur(20px)",
    pointerEvents: "none",
  },

  heroGlowTwo: {
    position: "absolute",
    bottom: -70,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "rgba(244,238,229,0.10)",
    filter: "blur(18px)",
    pointerEvents: "none",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 20,
    flexWrap: "wrap",
  },

  heroTextBlock: {
    maxWidth: 620,
  },

  heroEyebrow: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "0 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    color: "#FDFDF6",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 14,
    backdropFilter: "blur(12px)",
  },

  heroTitle: {
    margin: 0,
    fontSize: "2.5rem",
    lineHeight: 1.08,
    letterSpacing: "-0.04em",
    color: "#FDFDF6",
    fontWeight: 750,
  },

  heroSubtitle: {
    margin: "14px 0 0",
    color: "rgba(253,253,246,0.86)",
    fontSize: 16,
    lineHeight: 1.65,
    maxWidth: 560,
  },

  heroActionRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  heroPrimaryBtn: {
    height: 44,
    borderRadius: 999,
    border: "none",
    background: "#FDFDF6",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    transition: "all 0.2s ease",
  },

  heroSecondaryBtn: {
    height: 44,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "#FDFDF6",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    backdropFilter: "blur(12px)",
    transition: "all 0.2s ease",
  },

  errorBanner: {
    background: "#FFF1F1",
    border: "1px solid #F0C7C7",
    color: "#B42318",
    padding: "12px 14px",
    borderRadius: 14,
    marginBottom: 18,
    fontWeight: 600,
  },

  searchPanel: {
    border: "1px solid rgba(214,223,226,0.95)",
    borderRadius: 26,
    padding: 22,
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 18px 45px rgba(23,41,43,0.07)",
    marginBottom: 22,
    position: "relative",
    zIndex: 50,
  },


  searchHeaderBlock: {
    marginBottom: 16,
  },

  searchForm: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  searchBox: {
    position: "relative",
    flex: 1,
    minWidth: 280,
    zIndex: 60,
  },

  searchInput: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    border: "1px solid #D6DFE2",
    padding: "0 16px",
    fontSize: 14,
    color: "#17292B",
    background: "rgba(255,255,255,0.96)",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 2px rgba(23,41,43,0.03)",
  },

  searchBtn: {
    height: 48,
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

  clearSearchBtn: {
    height: 48,
    borderRadius: 999,
    border: "1px solid #D6DFE2",
    background: "#FFFFFF",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 20px",
    transition: "all 0.2s ease",
  },

  searchDropdown: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    background: "#FFFFFF",
    border: "1px solid #D6DFE2",
    borderRadius: 18,
    boxShadow: "0 18px 40px rgba(23,41,43,0.12)",
    overflow: "hidden",
    zIndex: 999,
  },

  searchDropdownTitle: {
    padding: "14px 16px 10px",
    fontSize: 13,
    fontWeight: 700,
    color: "#686967",
    background: "#FCFCF8",
    borderBottom: "1px solid #EEF1F2",
  },

  searchDropdownEmpty: {
    padding: "14px 16px",
    fontSize: 14,
    color: "#686967",
  },

  searchDropdownRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderBottom: "1px solid #F2F4F5",
  },

  searchDropdownItem: {
    flex: 1,
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: "14px 16px",
    fontSize: 14,
    color: "#17292B",
    cursor: "pointer",
  },

  searchDeleteBtn: {
    width: 34,
    height: 34,
    marginRight: 10,
    borderRadius: "50%",
    border: "none",
    background: "#F4EEE5",
    color: "#17292B",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
  },

  searchSuggestionBtn: {
    width: "100%",
    border: "none",
    background: "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
    padding: "12px 16px",
    display: "flex",
    gap: 10,
    alignItems: "center",
    borderBottom: "1px solid #F2F4F5",
  },

  searchSuggestionType: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    background: "rgba(93,108,92,0.12)",
    color: "#36513B",
    border: "1px solid rgba(93,108,92,0.18)",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
  },

  searchSuggestionValue: {
    fontSize: 14,
    color: "#17292B",
    fontWeight: 600,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 22,
    position: "relative",
    zIndex: 1,
  },

  summaryCard: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(214,223,226,0.90)",
    borderRadius: 22,
    padding: "20px 18px",
    boxShadow: "0 12px 30px rgba(23,41,43,0.05)",
    backdropFilter: "blur(14px)",
  },

  summaryNumber: {
    fontSize: 28,
    fontWeight: 750,
    color: "#17292B",
    lineHeight: 1,
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#686967",
    fontWeight: 600,
  },

  panel: {
    border: "1px solid rgba(214,223,226,0.95)",
    borderRadius: 26,
    padding: 26,
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 18px 45px rgba(23,41,43,0.07)",
  },

  panelTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  sectionHeaderBlock: {
    marginBottom: 18,
  },

  panelTitle: {
    margin: 0,
    fontWeight: 750,
    fontSize: 22,
    color: "#17292B",
    letterSpacing: "-0.02em",
  },

  panelSubtitle: {
    margin: "8px 0 0",
    color: "#686967",
    fontSize: 14,
    lineHeight: 1.5,
  },

  sectionDivider: {
    height: 1,
    background:
      "linear-gradient(90deg, rgba(214,223,226,0) 0%, rgba(214,223,226,1) 20%, rgba(214,223,226,1) 80%, rgba(214,223,226,0) 100%)",
    margin: "26px 0",
  },

  toggleBtn: {
    height: 40,
    borderRadius: 999,
    border: "1px solid #D6DFE2",
    background: "#F4EEE5",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 16px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },

  emptyStateCard: {
    border: "1px dashed #D6DFE2",
    background: "#FCFCF8",
    borderRadius: 20,
    padding: "26px 22px",
    textAlign: "center",
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#17292B",
    marginBottom: 8,
  },

  emptyStateText: {
    color: "#686967",
    fontSize: 14,
    lineHeight: 1.6,
  },

  grid: {
    display: "grid",
    gap: 18,
  },

  card: {
    border: "1px solid #e6e6e6",
    borderRadius: 18,
    padding: 22,
    background: "#FDFDF6",
    transition: "all 0.25s ease",
  },

  cardHover: {
    transform: "translateY(-6px)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
  },

  cardPast: {
    background:
      "linear-gradient(180deg, rgba(250,250,248,0.98) 0%, rgba(245,245,242,0.98) 100%)",
    opacity: 0.92,
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  cardLeft: {
    flex: 1,
    minWidth: 260,
  },

  title: {
    fontWeight: 750,
    fontSize: 23,
    color: "#17292B",
    marginBottom: 14,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },

  metaBlock: {
    display: "grid",
    gap: 8,
  },

  metaLine: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },

  metaLabel: {
    minWidth: 76,
    fontSize: 13,
    color: "#686967",
    fontWeight: 700,
  },

  metaValue: {
    fontSize: 14,
    color: "#17292B",
    fontWeight: 500,
  },

  rightBox: {
    minWidth: 125,
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },

  capacity: {
    fontSize: 30,
    fontWeight: 800,
    color: "#17292B",
    lineHeight: 1,
    letterSpacing: "-0.03em",
  },

  capacityHint: {
    fontSize: 12,
    color: "#686967",
    fontWeight: 600,
  },

  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    padding: "0 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid transparent",
    backdropFilter: "blur(10px)",
  },

  statusOpen: {
    background: "rgba(93,108,92,0.12)",
    color: "#36513B",
    borderColor: "rgba(93,108,92,0.18)",
  },

  statusFull: {
    background: "#f3e7d6",
    color: "#9a6a1b",
    border: "1px solid #e2c99c",
  },

  statusEnded: {
    background: "rgba(214,223,226,0.42)",
    color: "#686967",
    borderColor: "#D6DFE2",
  },

  desc: {
    marginTop: 16,
    color: "#17292B",
    fontSize: 15,
    lineHeight: 1.7,
  },

  actions: {
    marginTop: 18,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  joinBtn: {
    height: 40,
    borderRadius: 999,
    border: "none",
    background: "#17292B",
    color: "#FDFDF6",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    boxShadow: "0 8px 18px rgba(23,41,43,0.15)",
    transition: "all 0.2s ease",
  },

  joinBtnDisabled: {
    background: "#9DA3A8",
    boxShadow: "none",
    cursor: "not-allowed",
  },

  detailsBtn: {
    height: 40,
    borderRadius: 999,
    border: "1px solid #D6DFE2",
    background: "rgba(255,255,255,0.86)",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    transition: "all 0.2s ease",
  },

  dropdown: {
    overflow: "hidden",
    transition: "max-height 0.28s ease, opacity 0.28s ease",
  },

  dropdownClosed: {
    maxHeight: 0,
    opacity: 0,
  },

  dropdownOpen: {
    maxHeight: 320,
    opacity: 1,
    marginTop: 16,
    borderTop: "1px solid #D6DFE2",
    paddingTop: 16,
  },

  detailsTitle: {
    fontWeight: 750,
    marginBottom: 10,
    color: "#5D6C5C",
    fontSize: 15,
  },

  list: {
    margin: 0,
    paddingLeft: 18,
  },

  listItem: {
    marginBottom: 8,
    color: "#17292B",
    lineHeight: 1.5,
  },

  infoText: {
    color: "#686967",
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
  },

  errorText: {
    color: "#C62828",
    marginBottom: 10,
    fontWeight: 600,
  },

  form: {
    marginTop: 20,
    display: "grid",
    gap: 18,
  },

  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },

  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  formLabel: {
    fontWeight: 700,
    color: "#17292B",
    fontSize: 14,
  },

  formInput: {
    height: 46,
    borderRadius: 14,
    border: "1px solid #D6DFE2",
    padding: "0 14px",
    fontSize: 14,
    color: "#17292B",
    background: "rgba(255,255,255,0.92)",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 2px rgba(23,41,43,0.03)",
  },

  formTextarea: {
    borderRadius: 14,
    border: "1px solid #D6DFE2",
    padding: 14,
    fontSize: 14,
    color: "#17292B",
    background: "rgba(255,255,255,0.92)",
    outline: "none",
    minHeight: 120,
    resize: "vertical",
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 2px rgba(23,41,43,0.03)",
  },

  formActions: {
    marginTop: 6,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  submitBtn: {
    height: 42,
    borderRadius: 999,
    border: "none",
    background: "#17292B",
    color: "#FDFDF6",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    boxShadow: "0 8px 18px rgba(23,41,43,0.15)",
    transition: "all 0.2s ease",
  },

  cancelBtn: {
    height: 42,
    borderRadius: 999,
    border: "1px solid #D6DFE2",
    background: "#FFFFFF",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    transition: "all 0.2s ease",
  },

  tagInputRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  addTagBtn: {
    height: 42,
    borderRadius: 999,
    border: "1px solid #D6DFE2",
    background: "#FFFFFF",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    transition: "all 0.2s ease",
  },

  tagsWrap: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  tagChip: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "0 12px",
    borderRadius: 999,
    background: "#F4EEE5",
    border: "1px solid #D6DFE2",
    boxShadow: "0 4px 10px rgba(23,41,43,0.05)",
  },

  tagChipText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#17292B",
  },

  tagRemoveBtn: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: "none",
    background: "#FFFFFF",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 1,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },

  formSelect: {
    height: 46,
    borderRadius: 14,
    border: "1px solid #D6DFE2",
    padding: "0 14px",
    fontSize: 14,
    color: "#17292B",
    background: "rgba(255,255,255,0.92)",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 2px rgba(23,41,43,0.03)",
    cursor: "pointer",
  },

  categoryRow: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  categoryLabel: {
    fontSize: 13,
    color: "#686967",
    fontWeight: 700,
  },

  categoryChip: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "0 12px",
    borderRadius: 999,
    background: "rgba(93,108,92,0.12)",
    color: "#36513B",
    border: "1px solid rgba(93,108,92,0.18)",
    fontSize: 13,
    fontWeight: 700,
  },

  likesRow: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  likeBtn: {
    border: "none",
    background: "#F4EEE5",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: 600,
  },

  likeBtnActive: {
    background: "#F4EEE5",
    color: "#17292B",
    border: "1px solid #E0D2BE",
  },

  likeCount: {
    fontSize: 14,
    color: "#686967",
    fontWeight: 600,
  },

  sortSelect: {
    height: 48,
    borderRadius: 999,
    border: "1px solid #D6DFE2",
    background: "#FFFFFF",
    color: "#17292B",
    fontWeight: 600,
    padding: "0 16px",
    cursor: "pointer",
    outline: "none",
  },

  leaveBtn: {
    height: 40,
    borderRadius: 999,
    border: "none",
    background: "#C62828",
    color: "#FFFFFF",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    boxShadow: "0 8px 18px rgba(198,40,40,0.18)",
    transition: "all 0.2s ease",
  },

  filterChip: {
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid #c8d0d8",
    background: "#f7f4ee",
    color: "#22343c",
    fontWeight: 600,
    fontSize: "15px",
  },

  filterChipActive: {
    background: "#dfe8dc",
    border: "1px solid #a9b8a2",
  },

  eventTypeChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#eef6ff",
    color: "#1d4f91",
    fontWeight: 600,
    fontSize: "13px",
    border: "1px solid #c7dcf7",
  },

  statusOpenForApplication: {
  background: "#dfe8db",
  color: "#49654b",
  border: "1px solid #b9cab7",
},

  statusInProgress: {
    background: "#e8f1ff",
    color: "#2d5ea8",
    border: "1px solid #bfd2f2",
  },
  
  cardBottomRow: {
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },

  ownerActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    marginLeft: "auto",
  },

  ownerEditBtn: {
    height: 40,
    borderRadius: 999,
    border: "1px solid #D6DFE2",
    background: "#FFFFFF",
    color: "#17292B",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    transition: "all 0.2s ease",
  },

  ownerDeleteBtn: {
    height: 40,
    borderRadius: 999,
    border: "none",
    background: "#8B1E1E",
    color: "#FFFFFF",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
    boxShadow: "0 8px 18px rgba(139,30,30,0.18)",
    transition: "all 0.2s ease",
  },

  editTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  inlineSuccess: {
    background: "rgba(223,232,219,0.55)",
    border: "1px solid #B9CAB7",
    color: "#49654B",
    padding: "12px 14px",
    borderRadius: 14,
    marginBottom: 18,
    fontWeight: 600,
  },

};

export default eventStyles;