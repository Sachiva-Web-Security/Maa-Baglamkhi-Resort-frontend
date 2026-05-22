const FBPagePlaceholder = ({ title, description }) => (
  <div style={{ padding: "20px 28px", background: "#fff", minHeight: "100%" }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e6e8eb",
        paddingBottom: 8,
        marginBottom: 16,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, color: "#1f2d3d" }}>{title}</h2>
    </div>
    <p style={{ color: "#5b6b7c", fontSize: 14, marginTop: 0 }}>{description}</p>
    <div
      style={{
        marginTop: 24,
        padding: 40,
        border: "1px dashed #d0d3d6",
        borderRadius: 6,
        textAlign: "center",
        color: "#8a96a3",
        fontSize: 13,
      }}
    >
      This page is coming soon. Share the screenshot with fields/columns and we'll build it.
    </div>
  </div>
);

export default FBPagePlaceholder;
