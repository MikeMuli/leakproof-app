import { Skel } from "../components/Skeletons";

export default function Loading() {
  return (
    <main className="lp-shell" style={{ padding: "28px 20px 90px" }} aria-busy="true" aria-label="Loading">
      <Skel w={180} h={20} r={6} style={{ marginBottom: 22 }} />
      <Skel w="70%" h={27} r={7} style={{ marginBottom: 8 }} />
      <Skel w="40%" h={14} style={{ marginBottom: 18 }} />
      <Skel h={46} r={12} />
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        {[0, 1, 2].map((i) => <Skel key={i} h={60} r={10} style={{ flex: 1 }} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 28 }}>
        {[0, 1, 2, 3].map((i) => <Skel key={i} h={48} r={12} />)}
      </div>
    </main>
  );
}
